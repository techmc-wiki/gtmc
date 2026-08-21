import Image from "next/image"
import { Link } from "@/i18n/navigation"
import { Card } from "@/components/ui/shadcn/card"
import { CornerBrackets } from "@/components/ui/corner-brackets"
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/shadcn/avatar"
import type { ResolvedPerson } from "@/lib/markdown/people"

export interface AuthorGridItem {
  handle: string
  person: ResolvedPerson
  /** Localized footer readout (e.g. article count or repository stats). Full variant only. */
  footer?: string
}

/**
 * Author card grid. `compact` is the small preview grid used on the About page
 * (with a "view all" link into the index); `full` is the contributor index
 * grid with bio and footer readouts.
 */
export function AuthorGrid({
  authors,
  variant = "full",
  viewAllLabel,
  fallbackBio,
}: {
  authors: AuthorGridItem[]
  variant?: "compact" | "full"
  viewAllLabel?: string
  fallbackBio?: string
}) {
  const isCompact = variant === "compact"
  const gridClasses = isCompact
    ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
    : "grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"

  return (
    <>
      <div className={gridClasses}>
        {authors.map(({ handle, person, footer }) => (
          <Link
            key={handle}
            href={`/authors/${encodeURIComponent(handle)}`}
            className="group/link focus-visible:outline-tech-main block focus-visible:outline-2 focus-visible:outline-offset-2">
            <Card
              padding="compact"
              hover="border"
              className={isCompact ? undefined : "h-full"}>
              <div
                className={
                  isCompact
                    ? "flex items-center gap-3"
                    : "flex items-start gap-3"
                }>
                <div className={`shrink-0 ${isCompact ? "size-9" : "size-12"}`}>
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
                          sizes={isCompact ? "36px" : "48px"}
                          loading="lazy"
                          className="object-cover"
                        />
                      </AvatarImage>
                    ) : (
                      <AvatarFallback className="text-tech-main/50 bg-transparent font-mono text-xl font-bold tracking-widest uppercase">
                        {person.name[0]}
                      </AvatarFallback>
                    )}
                  </Avatar>
                </div>
                <div className={isCompact ? "min-w-0" : "min-w-0 flex-1"}>
                  <p className="text-tech-main-dark truncate text-sm font-medium">
                    {person.name}
                  </p>
                  <p className="text-tech-main/60 truncate font-mono text-xs">
                    @{handle}
                  </p>
                  {!isCompact && (
                    <>
                      <p className="text-tech-main mt-1 line-clamp-2 text-xs/relaxed">
                        {person.description ?? fallbackBio}
                      </p>
                      {footer && (
                        <div className="text-tech-main/50 mt-2 flex items-center justify-between gap-3 font-mono text-[0.625rem] tracking-[0.2em] uppercase">
                          <span className="truncate">{footer}</span>
                          <span
                            aria-hidden="true"
                            className="text-tech-main/40 group-hover/link:text-tech-signal shrink-0 transition-colors">
                            →
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
      {isCompact && viewAllLabel && (
        <Link
          href="/authors"
          className="text-tech-main hover:text-tech-main-dark inline-block font-mono text-xs tracking-widest uppercase transition-colors">
          {viewAllLabel}
        </Link>
      )}
    </>
  )
}
