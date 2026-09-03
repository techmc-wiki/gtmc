"use client"

import { useState, useEffect, useRef, useId, type ReactNode } from "react"
import useSWR from "swr"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
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

const triggerClassName =
  "border-tech-main/30 bg-tech-main/5 text-tech-main group-hover:bg-tech-main-dark group-hover:text-tech-bg focus-visible:outline-tech-main mx-1 inline-flex items-center gap-0.5 border px-1 font-mono text-[0.8em] tracking-wide no-underline transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2"

interface PeopleMentionLabels {
  bilibili: string
  description: string
  email: string
  fallback: string
  github: string
  panel: string
  profile: string
  social: string
  twitter: string
  website: string
}

function PeopleMentionTrigger({
  children,
  containerRef,
  person,
  profileLabel,
  popupId,
  onMouseEnter,
  onMouseLeave,
}: {
  children: ReactNode
  containerRef: React.RefObject<HTMLSpanElement | null>
  person: PersonResponse
  profileLabel: string
  popupId: string
  onMouseEnter: () => void
  onMouseLeave: () => void
}) {
  const triggerContent = (
    <>
      <span className="text-tech-main/40 group-hover:text-white/60">@</span>
      {children}
    </>
  )
  const ariaLabel = `${profileLabel}: ${person.name}`

  return (
    <span
      ref={containerRef}
      className="group relative inline-block"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}>
      {person.profileHandle !== null ? (
        <PopoverTrigger asChild>
          <Link
            href={`/authors/${encodeURIComponent(person.profileHandle)}`}
            aria-label={ariaLabel}
            aria-haspopup="dialog"
            aria-describedby={popupId}
            className={triggerClassName}>
            {triggerContent}
          </Link>
        </PopoverTrigger>
      ) : (
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={ariaLabel}
            aria-haspopup="dialog"
            aria-describedby={popupId}
            className={triggerClassName}>
            {triggerContent}
          </button>
        </PopoverTrigger>
      )}
    </span>
  )
}

function PersonAvatar({ person }: { person: PersonResponse }) {
  return (
    <div className="size-12">
      <Avatar className="border-tech-main/60 bg-tech-main/10 ring-tech-main/20 relative box-border flex aspect-square size-full items-center justify-center overflow-hidden border-2 p-1 ring-1">
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
  )
}

function PersonSocialLinks({
  labels,
  person,
}: {
  labels: PeopleMentionLabels
  person: PersonResponse
}) {
  const hasSocial = Object.keys(person.social).length > 0
  if (!hasSocial) return null

  return (
    <div className="mt-2">
      <p className="text-tech-main/40 mb-1 font-mono text-[10px] tracking-widest">
        {labels.social}
      </p>
      <div className="flex flex-wrap gap-2">
        {person.social.github && (
          <a
            href={person.social.github}
            target="_blank"
            rel="noopener noreferrer"
            className="text-tech-main inline-flex items-center gap-1 font-mono text-xs underline-offset-2 hover:underline">
            <GithubIcon />
            {labels.github}
          </a>
        )}
        {person.social.bilibili && (
          <a
            href={person.social.bilibili}
            target="_blank"
            rel="noopener noreferrer"
            className="text-tech-main inline-flex items-center gap-1 font-mono text-xs underline-offset-2 hover:underline">
            <BilibiliIcon />
            {labels.bilibili}
          </a>
        )}
        {person.social.twitter && (
          <a
            href={person.social.twitter}
            target="_blank"
            rel="noopener noreferrer"
            className="text-tech-main inline-flex items-center gap-1 font-mono text-xs underline-offset-2 hover:underline">
            <TwitterIcon />
            {labels.twitter}
          </a>
        )}
        {person.social.website && (
          <a
            href={person.social.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-tech-main inline-flex items-center gap-1 font-mono text-xs underline-offset-2 hover:underline">
            <GlobeIcon />
            {labels.website}
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
  )
}

function PersonDetails({
  labels,
  person,
}: {
  labels: PeopleMentionLabels
  person: PersonResponse
}) {
  if (person.isFallback) {
    return (
      <p className="text-tech-main/40 mt-3 font-mono text-xs">
        {labels.fallback}
      </p>
    )
  }

  return (
    <>
      {person.description && (
        <div className="mt-3">
          <p className="text-tech-main/40 mb-0.5 font-mono text-[10px] tracking-widest">
            {labels.description}
          </p>
          <p className="text-tech-main/60 text-xs/relaxed whitespace-pre-wrap">
            {person.description}
          </p>
        </div>
      )}
      {person.email && (
        <div className="mt-2">
          <p className="text-tech-main/40 mb-0.5 font-mono text-[10px] tracking-widest">
            {labels.email}
          </p>
          <a
            href={`mailto:${person.email}`}
            className="text-tech-main font-mono text-xs underline-offset-2 hover:underline">
            {person.email}
          </a>
        </div>
      )}
      <PersonSocialLinks labels={labels} person={person} />
    </>
  )
}

function PersonPopoverContent({
  labels,
  onMouseEnter,
  onMouseLeave,
  person,
  popupId,
}: {
  labels: PeopleMentionLabels
  onMouseEnter: () => void
  onMouseLeave: () => void
  person: PersonResponse
  popupId: string
}) {
  return (
    <PopoverContent
      id={popupId}
      align="start"
      sideOffset={8}
      aria-label={`${labels.profile}: ${person.name}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="border-tech-main/40 bg-surface-overlay/70 w-72 max-w-[calc(100vw-2rem)] border p-4 backdrop-blur-sm sm:w-80">
      <p className="text-tech-main/60 mb-3 font-mono text-[10px] tracking-wide">
        {labels.panel}
      </p>
      <div className="flex items-center gap-3">
        <PersonAvatar person={person} />
        <span className="font-mono text-sm font-medium tracking-wide">
          {person.name}
        </span>
      </div>
      <PersonDetails labels={labels} person={person} />
    </PopoverContent>
  )
}

export function PeopleMention({ children, ...props }: MarkdownComponentProps) {
  const personKey = (props["data-person-key"] as string) ?? ""
  const normalizedPersonKey = personKey.trim()
  const [isOpen, setIsOpen] = useState(false)
  const generatedId = useId()
  const popupId = `people-popup-${generatedId}`
  const containerRef = useRef<HTMLSpanElement>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const t = useTranslations("PeopleMention")

  const fallbackPerson = createFallbackPerson(normalizedPersonKey)
  const { data: fetchedPerson, mutate: refreshPerson } = useSWR<PersonResponse>(
    normalizedPersonKey
      ? `/api/people?key=${encodeURIComponent(normalizedPersonKey)}`
      : null,
    () => getPerson(normalizedPersonKey),
    { fallbackData: personCache.get(normalizedPersonKey) }
  )
  const person = fetchedPerson || fallbackPerson

  const loadPerson = () => {
    if (!fetchedPerson) void refreshPerson()
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

  const labels: PeopleMentionLabels = {
    bilibili: t("bilibiliLabel"),
    description: t("descriptionLabel"),
    email: t("emailLabel"),
    fallback: t("fallbackLabel"),
    github: t("githubLabel"),
    panel: t("panelLabel"),
    profile: t("profileLabel"),
    social: t("socialLabel"),
    twitter: t("twitterLabel"),
    website: t("websiteLabel"),
  }

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PeopleMentionTrigger
        containerRef={containerRef}
        onMouseEnter={openDelayed}
        onMouseLeave={closeDelayed}
        person={person}
        profileLabel={labels.profile}
        popupId={popupId}>
        {children}
      </PeopleMentionTrigger>
      <PersonPopoverContent
        labels={labels}
        onMouseEnter={cancelClose}
        onMouseLeave={closeDelayed}
        person={person}
        popupId={popupId}
      />
    </Popover>
  )
}
