import { Link } from "@/i18n/navigation"
import { TechCard } from "@/components/ui/tech-card"
import { UserAvatar } from "@/components/ui/user-avatar"
import type { ResolvedPerson } from "@/lib/markdown/people"

export interface AuthorProfile {
  handle: string
  person: ResolvedPerson
  /** Localized footer readout (e.g. article count or repository stats). */
  footer: string
}

/**
 * Full contributor profile grid used on the Contributors index page.
 */
export function ProfileGrid({
  profiles,
  fallbackBio,
}: {
  profiles: AuthorProfile[]
  fallbackBio: string
}) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {profiles.map(({ handle, person, footer }) => (
        <Link
          key={handle}
          href={`/authors/${encodeURIComponent(handle)}`}
          className="group/link focus-visible:outline-tech-main block focus-visible:outline-2 focus-visible:outline-offset-2">
          <TechCard padding="compact" hover="border" className="h-full">
            <div className="flex items-start gap-3">
              <div className="size-12 shrink-0">
                <UserAvatar
                  src={person.profile}
                  alt={person.name}
                  fallback={person.name}
                  sizes="48px"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-tech-main-dark truncate text-sm font-medium">
                  {person.name}
                </p>
                <p className="text-tech-main/60 truncate font-mono text-xs">
                  @{handle}
                </p>
                <p className="text-tech-main mt-1 line-clamp-2 text-xs/relaxed">
                  {person.description ?? fallbackBio}
                </p>
                <div className="text-tech-main/50 mt-2 flex items-center justify-between gap-3 font-mono text-[0.625rem] tracking-[0.2em] uppercase">
                  <span className="truncate">{footer}</span>
                  <span
                    aria-hidden="true"
                    className="text-tech-main/40 group-hover/link:text-tech-signal shrink-0 transition-colors">
                    →
                  </span>
                </div>
              </div>
            </div>
          </TechCard>
        </Link>
      ))}
    </div>
  )
}
