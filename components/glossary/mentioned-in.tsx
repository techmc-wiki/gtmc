import { cacheLife } from "next/cache"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { articleUrl } from "@/lib/articles/url"
import { getSearchIndex } from "@/lib/search/search-index"
import type { ArticleLocale } from "@/lib/articles/manifest"

const MAX_MENTIONS = 8

interface MentionedInProps {
  termName: string
  shortForm: string
  locale: ArticleLocale
}

async function findMentions(
  termName: string,
  shortForm: string,
  locale: ArticleLocale
): Promise<{ title: string; slug: string }[]> {
  "use cache"
  cacheLife("hours")

  const queries = shortForm ? [shortForm, termName] : [termName]

  const index = await getSearchIndex(locale)
  const seen = new Set<string>()
  const results: { title: string; slug: string }[] = []

  for (const query of queries) {
    if (results.length >= MAX_MENTIONS) break
    if (query.length < 2) continue

    const matches = index.search(query, {
      prefix: true,
      fuzzy: 0.1,
      boost: { title: 2 },
    })

    for (const match of matches) {
      if (results.length >= MAX_MENTIONS) break
      if (seen.has(match.slug)) continue
      seen.add(match.slug)
      results.push({ title: match.title, slug: match.slug })
    }
  }

  return results
}

export async function MentionedIn({
  termName,
  shortForm,
  locale,
}: MentionedInProps) {
  const mentions = await findMentions(termName, shortForm, locale)
  if (mentions.length === 0) return null

  const t = await getTranslations({ locale, namespace: "Glossary" })

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-tech-main/60 font-mono text-[0.625rem] font-bold tracking-[0.2em] uppercase">
        {t("mentionedIn")}
      </h3>
      <ul className="flex flex-col gap-1.5">
        {mentions.map((article) => (
          <li key={article.slug}>
            <Link
              href={articleUrl(article.slug)}
              className="group flex items-baseline gap-2 text-sm transition-colors"
              locale={locale}>
              <span className="text-tech-main/40 group-hover:text-tech-signal-ink font-mono text-xs transition-colors">
                →
              </span>
              <span className="text-tech-main group-hover:text-tech-main-dark transition-colors">
                {article.title}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
