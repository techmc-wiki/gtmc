import type { MDXComponents } from "mdx/types"
import { SectionTitle } from "@/components/ui/headings"
import { StatCard, StatGrid } from "@/components/mdx/stats"
import { AuthorGrid } from "@/components/mdx/author-grid"
import { DownloadButton } from "@/components/mdx/download-button"

/**
 * Shared rendering engine for every `.mdx` page in the app.
 *
 * Markdown elements map to the design-system voices:
 * - `h1` — display-title page voice
 * - `h2` — `SectionTitle` (signal square + guide rule), spaced from the
 *   previous block with `mt-10`
 * - `p` — secondary body voice, reading-width capped, with paragraph rhythm
 * - `a` — underlined ink link
 * - `ul` — body list with item spacing
 *
 * Data-driven pieces (stat readouts, author grids, the download button)
 * remain components because they render dynamic props.
 */
const components: MDXComponents = {
  h1: ({ children }) => (
    <h1 className="display-title text-tech-main-dark mb-4 text-3xl tracking-tight text-balance md:text-5xl">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <SectionTitle className="mt-10">{children}</SectionTitle>
  ),
  p: ({ children }) => (
    <p className="text-tech-main mb-4 max-w-3xl text-sm/relaxed">{children}</p>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-tech-main hover:text-tech-main-dark decoration-tech-main/40 hover:decoration-tech-main-dark underline underline-offset-4 transition-colors">
      {children}
    </a>
  ),
  ul: ({ children }) => (
    <ul className="text-tech-main mb-4 max-w-3xl space-y-2 text-sm/relaxed">
      {children}
    </ul>
  ),
  StatGrid,
  StatCard,
  AuthorGrid,
  DownloadButton,
}

export function useMDXComponents(): MDXComponents {
  return components
}
