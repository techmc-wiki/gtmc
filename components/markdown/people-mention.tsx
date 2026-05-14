"use client"

import { useState, useEffect, useRef, useId } from "react"
import { createPortal } from "react-dom"
import { useTranslations } from "next-intl"
import { resolvePerson } from "@/lib/markdown/people"
import { UesrAvatar } from "@/components/ui/user-avatar"
import { CornerBrackets } from "@/components/ui/corner-brackets"
import type { ResolvedPerson } from "@/lib/markdown/people"
import type { MarkdownComponentProps } from "@/lib/markdown/component-types"

function GithubIcon() {
  return (
    <svg
      className="size-3"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  )
}

function BilibiliIcon() {
  return (
    <svg
      className="size-3"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true">
      <path d="M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a1.234 1.234 0 0 1-.373-.906c0-.356.124-.658.373-.907l.027-.027c.267-.249.573-.373.92-.373.347 0 .653.124.92.373L9.653 4.44c.071.071.134.142.187.213h4.267a.836.836 0 0 1 .16-.213l2.853-2.747c.267-.249.573-.373.92-.373.347 0 .662.151.929.4.267.249.391.551.391.907 0 .355-.124.657-.373.906zM5.333 7.24c-.746.018-1.373.276-1.88.773-.506.498-.769 1.13-.786 1.894v7.52c.017.764.28 1.395.786 1.893.507.498 1.134.756 1.88.773h13.334c.746-.017 1.373-.275 1.88-.773.506-.498.769-1.129.786-1.893v-7.52c-.017-.765-.28-1.396-.786-1.894-.507-.497-1.134-.755-1.88-.773zM8 11.107c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c.017-.391.15-.711.4-.96.249-.249.56-.373.933-.373zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c.017-.391.15-.711.4-.96.249-.249.56-.373.933-.373z" />
    </svg>
  )
}

function TwitterIcon() {
  return (
    <svg
      className="size-3"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function GlobeIcon() {
  return (
    <svg
      className="size-3"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" />
      <path d="M1.5 8h13M8 1.5c-1.5 2-2.5 4-2.5 6.5s1 4.5 2.5 6.5M8 1.5c1.5 2 2.5 4 2.5 6.5s-1 4.5-2.5 6.5" />
    </svg>
  )
}

export function PeopleMention({ children, ...props }: MarkdownComponentProps) {
  const personKey = (props["data-person-key"] as string) ?? ""
  const person: ResolvedPerson = resolvePerson(personKey)
  const [isOpen, setIsOpen] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const generatedId = useId()
  const popupId = `people-popup-${generatedId}`
  const containerRef = useRef<HTMLSpanElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
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

    window.addEventListener("scroll", handleRecalcPosition, true)
    window.addEventListener("resize", handleRecalcPosition)
    return () => {
      window.removeEventListener("scroll", handleRecalcPosition, true)
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

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
      if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current)
    }
  }, [])

  const hasSocial = !person.isFallback && Object.keys(person.social).length > 0

  const portalStyle: React.CSSProperties | undefined = triggerRect
    ? {
        position: "fixed",
        top: `${triggerRect.bottom + 8}px`,
        left: `${Math.max(
          8,
          Math.min(triggerRect.left, window.innerWidth - 328)
        )}px`,
        zIndex: 50,
      }
    : undefined

  const popupContent = (
    <div
      ref={popupRef}
      id={popupId}
      role="dialog"
      style={portalStyle}
      className={`border-tech-main/40 w-72 max-w-[calc(100vw-2rem)] border bg-white/70 p-4 backdrop-blur-sm sm:w-80 ${
        isOpen
          ? "animate-tech-pop-in"
          : "scale-95 opacity-0 transition-all duration-150 ease-out"
      } `}
      onMouseEnter={cancelClose}
      onMouseLeave={closeDelayed}>
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
          <UesrAvatar
            src={person.profile}
            alt={person.name}
            fallback={person.isFallback ? "?" : person.name[0]}
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
    </div>
  )

  return (
    <span
      ref={containerRef}
      className="group relative inline-block"
      onMouseEnter={openDelayed}
      onMouseLeave={closeDelayed}>
      <button
        type="button"
        aria-label={`${t("profileLabel")}: ${person.name}`}
        aria-expanded={isOpen}
        aria-describedby={popupId}
        onClick={() => {
          if (isOpen || isAnimating) {
            closeWithAnimation()
          } else {
            recalcPosition()
            setIsOpen(true)
          }
        }}
        className="border-tech-main/30 bg-tech-main/5 text-tech-main group-hover:bg-tech-main/80 focus-visible:ring-tech-main/50 mx-1 inline-flex items-center gap-0.5 border px-1 font-mono text-[0.8em] tracking-wide no-underline transition-colors group-hover:text-white focus-visible:ring-2 focus-visible:outline-none">
        <span className="text-tech-main/40 group-hover:text-white/60">@</span>
        {children}
      </button>

      {(isOpen || isAnimating) && createPortal(popupContent, document.body)}
    </span>
  )
}
