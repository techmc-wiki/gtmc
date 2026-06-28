"use client"

import { useState, useEffect, useRef, useId, useMemo } from "react"
import { createPortal } from "react-dom"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { addSiteScrollListener } from "@/hooks/site-scroll-root"
import { resolvePersonClient } from "@/lib/articles/config/people-data"
import { getAuthorProfileHandle } from "@/lib/articles/config/author-profiles"
import { UserAvatar } from "@/components/ui/user-avatar"
import { CornerBrackets } from "@/components/ui/corner-brackets"
import {
  BilibiliIcon,
  GithubIcon,
  GlobeIcon,
  TwitterIcon,
} from "@/components/ui/social-icons"
import type { ResolvedPerson } from "@/lib/articles/config/people-data"
import type { MarkdownComponentProps } from "@/lib/markdown/component-types"

export function PeopleMention({ children, ...props }: MarkdownComponentProps) {
  const personKey = (props["data-person-key"] as string) ?? ""
  const person: ResolvedPerson = resolvePersonClient(personKey)
  const [isOpen, setIsOpen] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const generatedId = useId()
  const popupId = `people-popup-${generatedId}`
  const containerRef = useRef<HTMLSpanElement>(null)
  const popupRef = useRef<HTMLDialogElement>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const animTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null)
  const t = useTranslations("PeopleMention")

  const recalcPosition = () => {
    if (containerRef.current) {
      setTriggerRect(containerRef.current.getBoundingClientRect())
    }
  }

  const closeWithAnimation = () => {
    if (animTimeoutRef.current) {
      clearTimeout(animTimeoutRef.current)
    }
    setIsAnimating(true)
    setIsOpen(false)
    animTimeoutRef.current = setTimeout(() => {
      setIsAnimating(false)
      animTimeoutRef.current = null
    }, 150)
  }

  const open = () => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current)
      openTimerRef.current = null
    }
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    if (animTimeoutRef.current) {
      clearTimeout(animTimeoutRef.current)
      animTimeoutRef.current = null
    }
    recalcPosition()
    setIsAnimating(false)
    setIsOpen(true)
  }

  /**
   * Hover-intent open: only open after the cursor has remained
   * over the trigger for HOVER_DELAY ms.  Quick flick-throughs
   * are ignored because cancelOpen() clears the pending timer
   * on mouseLeave.
   */
  const HOVER_DELAY = 200

  const cancelOpen = () => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current)
      openTimerRef.current = null
    }
  }

  const openDelayed = () => {
    if (isOpen || isAnimating) return
    cancelOpen()
    openTimerRef.current = setTimeout(() => {
      openTimerRef.current = null
      open()
    }, HOVER_DELAY)
  }

  const closeDelayed = () => {
    cancelOpen()
    closeTimerRef.current = setTimeout(() => closeWithAnimation(), 300)
  }

  const cancelClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    if (animTimeoutRef.current) {
      clearTimeout(animTimeoutRef.current)
      animTimeoutRef.current = null
      setIsAnimating(false)
      setIsOpen(true)
    }
  }

  // Reposition the portaled popup on scroll/resize while open
  useEffect(() => {
    if (!isOpen) return

    function handleRecalcPosition() {
      if (containerRef.current) {
        setTriggerRect(containerRef.current.getBoundingClientRect())
      }
    }

    const removeSiteScrollListener = addSiteScrollListener(
      handleRecalcPosition,
      { capture: true, passive: true }
    )
    window.addEventListener("resize", handleRecalcPosition)
    return () => {
      removeSiteScrollListener()
      window.removeEventListener("resize", handleRecalcPosition)
    }
  }, [isOpen])

  // Click-outside (handles both in-flow and portaled popup) and Escape key
  useEffect(() => {
    if (!isOpen) return

    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      const inContainer = containerRef.current?.contains(target)
      const inPopup = popupRef.current?.contains(target)
      if (!inContainer && !inPopup) {
        closeWithAnimationForEffect()
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeWithAnimationForEffect()
    }
    function closeWithAnimationForEffect() {
      if (animTimeoutRef.current) {
        clearTimeout(animTimeoutRef.current)
      }
      setIsAnimating(true)
      setIsOpen(false)
      animTimeoutRef.current = setTimeout(() => {
        setIsAnimating(false)
        animTimeoutRef.current = null
      }, 150)
    }

    document.addEventListener("mousedown", handleClick)
    document.addEventListener("keydown", handleKey)
    return () => {
      document.removeEventListener("mousedown", handleClick)
      document.removeEventListener("keydown", handleKey)
    }
  }, [isOpen])

  useEffect(
    () => () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
      if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current)
    },
    []
  )

  const authorProfileHandle = getAuthorProfileHandle(personKey)

  const hasSocial = !person.isFallback && Object.keys(person.social).length > 0

  const portalStyle = useMemo(
    (): React.CSSProperties | undefined =>
      triggerRect
        ? {
            position: "fixed",
            top: `${triggerRect.bottom + 8}px`,
            left: `${Math.max(
              8,
              Math.min(triggerRect.left, window.innerWidth - 328)
            )}px`,
            zIndex: 50,
          }
        : undefined,
    [triggerRect]
  )

  const popupContent = (
    <dialog
      ref={popupRef}
      id={popupId}
      open
      aria-label={`${t("profileLabel")}: ${person.name}`}
      style={portalStyle}
      className={`border-tech-main/40 bg-surface-overlay/70 w-72 max-w-[calc(100vw-2rem)] border p-4 backdrop-blur-sm sm:w-80 ${
        isOpen
          ? "animate-tech-pop-in"
          : "scale-95 opacity-0 transition-[transform,opacity] duration-150 ease-out"
      } `}
      onPointerEnter={cancelClose}
      onPointerLeave={closeDelayed}>
      <CornerBrackets
        variant="static"
        color="border-tech-main/30"
        size="size-3"
      />

      <p className="text-tech-main/60 mb-3 font-mono text-[10px] tracking-wide">
        {t("panelLabel")}
      </p>

      <div className="flex items-center gap-3">
        <div className="size-12">
          <UserAvatar
            src={person.profile}
            alt={person.name}
            fallback={person.isFallback ? "?" : person.name[0]}
            sizes="48px"
          />
        </div>
        <span className="font-mono text-sm font-medium tracking-wide">
          {person.name}
        </span>
      </div>

      {!person.isFallback && (
        <>
          {person.description && (
            <div className="mt-3">
              <p className="text-tech-main/40 mb-0.5 font-mono text-[10px] tracking-widest">
                {t("descriptionLabel")}
              </p>
              <p className="text-tech-main/60 text-xs/relaxed whitespace-pre-wrap">
                {person.description}
              </p>
            </div>
          )}

          {person.email && (
            <div className="mt-2">
              <p className="text-tech-main/40 mb-0.5 font-mono text-[10px] tracking-widest">
                {t("emailLabel")}
              </p>
              <a
                href={`mailto:${person.email}`}
                className="text-tech-main font-mono text-xs underline-offset-2 hover:underline">
                {person.email}
              </a>
            </div>
          )}

          {hasSocial && (
            <div className="mt-2">
              <p className="text-tech-main/40 mb-1 font-mono text-[10px] tracking-widest">
                {t("socialLabel")}
              </p>
              <div className="flex flex-wrap gap-2">
                {person.social.github && (
                  <a
                    href={person.social.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-tech-main inline-flex items-center gap-1 font-mono text-xs underline-offset-2 hover:underline">
                    <GithubIcon />
                    {t("githubLabel")}
                  </a>
                )}
                {person.social.bilibili && (
                  <a
                    href={person.social.bilibili}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-tech-main inline-flex items-center gap-1 font-mono text-xs underline-offset-2 hover:underline">
                    <BilibiliIcon />
                    {t("bilibiliLabel")}
                  </a>
                )}
                {person.social.twitter && (
                  <a
                    href={person.social.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-tech-main inline-flex items-center gap-1 font-mono text-xs underline-offset-2 hover:underline">
                    <TwitterIcon />
                    {t("twitterLabel")}
                  </a>
                )}
                {person.social.website && (
                  <a
                    href={person.social.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-tech-main inline-flex items-center gap-1 font-mono text-xs underline-offset-2 hover:underline">
                    <GlobeIcon />
                    {t("websiteLabel")}
                  </a>
                )}
                {person.social.custom?.map((link) => (
                  <a
                    key={link.label}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-tech-main inline-flex items-center gap-1 font-mono text-xs underline-offset-2 hover:underline">
                    <GlobeIcon />
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {person.isFallback && (
        <p className="text-tech-main/40 mt-3 font-mono text-xs">
          {t("fallbackLabel")}
        </p>
      )}
    </dialog>
  )

  return (
    <span
      ref={containerRef}
      className="group relative inline-block"
      onMouseEnter={openDelayed}
      onMouseLeave={closeDelayed}>
      {authorProfileHandle !== null ? (
        <Link
          href={`/authors/${encodeURIComponent(authorProfileHandle)}`}
          aria-label={`${t("profileLabel")}: ${person.name}`}
          aria-haspopup="dialog"
          aria-describedby={popupId}
          className="border-tech-main/30 bg-tech-main/5 text-tech-main group-hover:bg-tech-main-dark group-hover:text-tech-bg focus-visible:outline-tech-main mx-1 inline-flex items-center gap-0.5 border px-1 font-mono text-[0.8em] tracking-wide no-underline transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2">
          <span className="text-tech-main/40 group-hover:text-white/60">@</span>
          {children}
        </Link>
      ) : (
        <button
          type="button"
          aria-label={`${t("profileLabel")}: ${person.name}`}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-describedby={popupId}
          onClick={() => {
            if (isOpen || isAnimating) {
              closeWithAnimation()
            } else {
              recalcPosition()
              setIsOpen(true)
            }
          }}
          className="border-tech-main/30 bg-tech-main/5 text-tech-main group-hover:bg-tech-main-dark group-hover:text-tech-bg focus-visible:outline-tech-main mx-1 inline-flex items-center gap-0.5 border px-1 font-mono text-[0.8em] tracking-wide no-underline transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2">
          <span className="text-tech-main/40 group-hover:text-white/60">@</span>
          {children}
        </button>
      )}

      {(isOpen || isAnimating) && createPortal(popupContent, document.body)}
    </span>
  )
}
