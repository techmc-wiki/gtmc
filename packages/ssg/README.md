# @gtmc/ssg

The article build pipeline: source and translation frontmatter, Git attribution
and freshness, manifest generation, Markdown transforms, Shiki highlighting,
article artifacts, the Typst PDF emitter, and banner assets. `generateArticleContent`
owns the site artifacts; `renderMarkdownToHast` and `hastToTypst` turn the same
Markdown into the Typst fragments that `pnpm build:pdf` compiles (see
`tools/pdf/README.md` for the template vocabulary the emitter targets).

Code fences retain their source line breaks and whitespace in the PDF, including
plain-text fences and whitespace-only lines omitted by syntax highlighting.

`generateArticleManifest` and `generateArticleContent` take explicit article,
configuration, data, and asset paths plus the host's logger. The manifest builder
also takes the host's GitHub commit URL resolver. The package has no Next.js,
React, app alias, or working-directory dependency.

The web app's `scripts/generate-article-{manifest,content}.ts` supply their paths
and settings, and `scripts/generate-pdf.ts` drives the PDF build.
`pnpm generate:manifest` and `pnpm generate:content` write to
`apps/web/data` and `apps/web/public/article-assets`. Runtime artifact
loading, Next.js caching, React Markdown components, and overall build
orchestration stay in `apps/web`.

Shared contracts and transforms are imported through `@gtmc/ssg/articles/*` and
`@gtmc/ssg/markdown/*`. Browser consumers use the browser CJK spacing transform;
Shiki and provenance analysis are server modules. The host passes the persisted
Shiki cache path so content generation and article rendering reuse highlights.

Run `pnpm --filter @gtmc/ssg run check` to format-check, lint, and typecheck this
package. Root `pnpm check` and `pnpm typecheck` include it. The content cache and
PDF workflow hash its sources to invalidate generated output after changes.
