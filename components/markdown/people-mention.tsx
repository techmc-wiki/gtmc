"use client"

import { useState, useEffect, useRef, useId } from "react"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { CornerBrackets } from "@/components/ui/corner-brackets"
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/shadcn/avatar"
import {
  BilibiliIcon,
  GithubIcon,
  GlobeIcon,
  TwitterIcon,
} from "@/components/ui/icons"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/shadcn/popover"
import type { MarkdownComponentProps } from "@/lib/markdown/component-types"
import type { ResolvedPerson } from "@/lib/markdown/people"

type PersonResponse = ResolvedPerson & { profileHandle: string | null }

const personCache = new Map<string, PersonResponse>()
const pendingPersonRequests = new Map<string, Promise<PersonResponse>>()

function createFallbackPerson(key: string): PersonResponse {
  return {
    key,
    name: key,
    description: null,
    profile: null,
    email: null,
    social: {},
    isFallback: true,
    profileHandle: null,
  }
}

function getPerson(key: string): Promise<PersonResponse> {
  const cached = personCache.get(key)
  if (cached) return Promise.resolve(cached)

  const pending = pendingPersonRequests.get(key)
  if (pending) return pending

  const request = fetch(`/api/people?key=${encodeURIComponent(key)}`)
    .then(async (response): Promise<PersonResponse> => {
      if (!response.ok) {
        throw new Error(`Unable to load person: ${response.status}`)
      }

      const person: PersonResponse = await response.json()
      personCache.set(key, person)
      return person
    })
    .finally(() => {
      pendingPersonRequests.delete(key)
    })

  pendingPersonRequests.set(key, request)
  return request
}

export function PeopleMention({ children, ...props }: MarkdownComponentProps) {
  const personKey = (props["data-person-key"] as string) ?? ""
  const normalizedPersonKey = personKey.trim()
  const [person, setPerson] = useState<PersonResponse>(() =>
    createFallbackPerson(normalizedPersonKey)
  )
  const [isOpen, setIsOpen] = useState(false)
  const generatedId = useId()
  const popupId = `people-popup-${generatedId}`
  const containerRef = useRef<HTMLSpanElement>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const t = useTranslations("PeopleMention")

  useEffect(() => {
    const cached = personCache.get(normalizedPersonKey)
    if (cached) {
      setPerson(cached)
      return
    }
    setPerson(createFallbackPerson(normalizedPersonKey))
    void getPerson(normalizedPersonKey)
      .then(setPerson)
      .catch(() => setPerson(createFallbackPerson(normalizedPersonKey)))
  }, [normalizedPersonKey])

  const loadPerson = () => {
    void getPerson(normalizedPersonKey)
      .then(setPerson)
      .catch(() => setPerson(createFallbackPerson(normalizedPersonKey)))
  }

  /**
   * Hover-intent open: only open after the cursor has remained
   * over the trigger for HOVER_DELAY ms.  Quick flick-throughs
   * are ignored because cancelOpen() clears the pending timer
   * on mouseLeave.
   */
  const HOVER_DELAY = 200

  const handleOpenChange = (open: boolean) => {
    if (open) loadPerson()
    setIsOpen(open)
  }

  const cancelOpen = () => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current)
      openTimerRef.current = null
    }
  }

  const openDelayed = () => {
    if (isOpen) return
    cancelOpen()
    openTimerRef.current = setTimeout(() => {
      openTimerRef.current = null
      handleOpenChange(true)
    }, HOVER_DELAY)
  }

  const closeDelayed = () => {
    cancelOpen()
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null
      setIsOpen(false)
    }, 300)
  }

  const cancelClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }

  useEffect(
    () => () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
      if (openTimerRef.current) clearTimeout(openTimerRef.current)
    },
    []
  )

  const authorProfileHandle = person.profileHandle

  const hasSocial = !person.isFallback && Object.keys(person.social).length > 0

  const triggerClassName =
    "border-tech-main/30 bg-tech-main/5 text-tech-main group-hover:bg-tech-main-dark group-hover:text-tech-bg focus-visible:outline-tech-main mx-1 inline-flex items-center gap-0.5 border px-1 font-mono text-[0.8em] tracking-wide no-underline transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2"

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <span
        ref={containerRef}
        className="group relative inline-block"
        onMouseEnter={openDelayed}
        onMouseLeave={closeDelayed}>
        {authorProfileHandle !== null ? (
          <PopoverTrigger asChild>
            <Link
              href={`/authors/${encodeURIComponent(authorProfileHandle)}`}
              aria-label={`${t("profileLabel")}: ${person.name}`}
              aria-haspopup="dialog"
              aria-describedby={popupId}
              className={triggerClassName}>
              <span className="text-tech-main/40 group-hover:text-white/60">
                @
              </span>
              {children}
            </Link>
          </PopoverTrigger>
        ) : (
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={`${t("profileLabel")}: ${person.name}`}
              aria-haspopup="dialog"
              aria-describedby={popupId}
              className={triggerClassName}>
              <span className="text-tech-main/40 group-hover:text-white/60">
                @
              </span>
              {children}
            </button>
          </PopoverTrigger>
        )}
      </span>

      <PopoverContent
        id={popupId}
        align="start"
        sideOffset={8}
        aria-label={`${t("profileLabel")}: ${person.name}`}
        onMouseEnter={cancelClose}
        onMouseLeave={closeDelayed}
        className="border-tech-main/40 bg-surface-overlay/70 w-72 max-w-[calc(100vw-2rem)] border p-4 backdrop-blur-sm sm:w-80">
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
            <Avatar className="border-tech-main/60 bg-tech-main/10 ring-tech-main/20 relative box-border flex aspect-square size-full items-center justify-center overflow-hidden border-2 p-1 ring-1">
              <CornerBrackets
                className="pointer-events-none absolute inset-0 z-10"
                size="size-2"
                color="border-tech-main/70"
              />
              {person.profile ? (
                <AvatarImage asChild src={person.profile}>
                  <Image
                    src={person.profile}
                    alt={person.name}
                    fill
                    sizes="48px"
                    loading="lazy"
                    className="object-cover"
                  />
                </AvatarImage>
              ) : (
                <AvatarFallback className="text-tech-main/50 bg-transparent font-mono text-xl font-bold tracking-widest uppercase">
                  {person.isFallback ? "?" : person.name[0]}
                </AvatarFallback>
              )}
            </Avatar>
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
      </PopoverContent>
    </Popover>
  )
}
