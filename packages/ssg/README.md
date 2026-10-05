# @gtmc/ssg

The article build pipeline: source and translation frontmatter, Git attribution
and freshness, manifest generation, Markdown transforms, Shiki highlighting,
article artifacts, PDF HTML sidecars, and banner assets. `generateArticleContent`
owns the site artifacts; `generatePdfHtml` turns those artifacts into the
`<locale>/<slug>.html` sidecars that `pnpm build:pdf` prints.

`generateArticleManifest`, `generateArticleContent`, and `generatePdfHtml` take
explicit article, configuration, data, and asset paths plus the host's logger.
The manifest builder also takes the host's GitHub commit URL resolver. The
package has no Next.js, React, app alias, or working-directory dependency.

The web app's `scripts/generate-article-{manifest,content}.ts` and
`scripts/generate-pdf-html.ts` supply their paths and settings.
`pnpm generate:manifest` and `pnpm generate:content` write to
`apps/web/data` and `apps/web/public/article-assets`; `pnpm generate:pdf-html`
reads those artifacts and writes to `apps/web/data/pdf-html`. Runtime artifact
loading, Next.js caching, React Markdown components, and overall build
orchestration stay in `apps/web`.

Shared contracts and transforms are imported through `@gtmc/ssg/articles/*` and
`@gtmc/ssg/markdown/*`. Browser consumers use the browser CJK spacing transform;
Shiki and provenance analysis are server modules. The host passes the persisted
Shiki cache path so content generation and article rendering reuse highlights.

Run `pnpm --filter @gtmc/ssg run check` to format-check, lint, and typecheck this
package. Root `pnpm check` and `pnpm typecheck` include it. The content cache and
PDF workflow hash its sources to invalidate generated output after changes.
