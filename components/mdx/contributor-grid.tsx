import { Link } from "@/i18n/navigation"
import { TechCard } from "@/components/ui/tech-card"
import { UserAvatar } from "@/components/ui/user-avatar"
import type { ResolvedPerson } from "@/lib/markdown/people"

export interface ContributorGridAuthor {
  handle: string
  person: ResolvedPerson
}

/**
 * Compact contributor preview grid used on the About page, followed by a
 * "view all" link into the full contributors index.
 */
export function ContributorGrid({
  authors,
  viewAllLabel,
}: {
  authors: ContributorGridAuthor[]
  viewAllLabel: string
}) {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {authors.map(({ handle, person }) => (
          <Link
            key={handle}
            href={`/authors/${encodeURIComponent(handle)}`}
            className="focus-visible:outline-tech-main block focus-visible:outline-2 focus-visible:outline-offset-2">
            <TechCard padding="compact" hover="border">
              <div className="flex items-center gap-3">
                <div className="size-9 shrink-0">
                  <UserAvatar
                    src={person.profile}
                    alt={person.name}
                    fallback={person.name}
                    sizes="36px"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-tech-main-dark truncate text-sm font-medium">
                    {person.name}
                  </p>
                  <p className="text-tech-main/60 truncate font-mono text-xs">
                    @{handle}
                  </p>
                </div>
              </div>
            </TechCard>
          </Link>
        ))}
      </div>
      <Link
        href="/authors"
        className="text-tech-main hover:text-tech-main-dark inline-block font-mono text-xs tracking-widest uppercase transition-colors">
        {viewAllLabel}
      </Link>
    </>
  )
}
