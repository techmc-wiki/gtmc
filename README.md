<!-- prettier-ignore -->
<div align="center">

<img src="images/homepage.jpeg" alt="Graduate Texts in Minecraft" />

# Graduate Texts in Minecraft

**Community-driven online textbook on Technical Minecraft.**

Tutorials, explanations on game mechanics, and source-code reading. Collaboratively written and openly reviewed.

[![Website](https://img.shields.io/badge/site-beta.techmc.wiki-60708F?style=flat-square&labelColor=4A5A78)](https://beta.techmc.wiki) [![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/gtmc-dev/gtmc) [![Next.js](https://img.shields.io/badge/Next.js-16-000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org) [![React](https://img.shields.io/badge/React-19-149ECA?style=flat-square&logo=react&logoColor=white)](https://react.dev) [![TypeScript](https://img.shields.io/badge/TypeScript-blue?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org) [![License](https://img.shields.io/badge/Code-Apache--2.0-yellow?style=flat-square)](LICENSE) [![Articles](https://img.shields.io/badge/Articles-CC--BY--NC--SA%204.0-lightgrey?style=flat-square)](LICENSE)

[Visit the Site](https://beta.techmc.wiki) · [Browse Raw Articles](https://github.com/gtmc-dev/articles) · [More GTMC Projects](https://github.com/orgs/gtmc-dev/repositories)


<!-- README-I18N:START -->

**English** | [汉语](./README.zh.md)

<!-- README-I18N:END -->

</div>

---

## About

Graduate Texts in Minecraft (*GTMC*) is an open, community-driven knowledge base for the technical side of Minecraft — redstone, game mechanics, and engine internals. It serves three kinds of writing:

- `>> TUTORIALS` — step-by-step walkthroughs for builders.
- `>> EXPLANATIONS` — first-principles writeups of in-game mechanics.
- `>> CODE ANALYSIS` — annotated readings of the game's source.

The site is built around a **blueprint / scientific drafting** visual language: thin blue-gray rules, square geometry, monospace HUD labels, corner brackets, and motion that feels like UI instrumentation rather than ornament. See [`DESIGN.md`](DESIGN.md) for the full system.

> [!NOTE]
> This repository hosts the **website** only. Articles live in a separate repository and are pulled in as a Git submodule. All other org repos are at [github.com/orgs/gtmc-dev](https://github.com/orgs/gtmc-dev/repositories).

## Development

### Tech stack

| Layer         | Choice                                                        |
| ------------- | ------------------------------------------------------------- |
| Framework     | Next.js 16 (App Router, Cache Components) on React 19         |
| Language      | TypeScript 6                                                  |
| Styling       | Tailwind CSS v4, custom `tech-*` blueprint tokens             |
| Motion        | `motion` (Framer Motion successor)                            |
| Auth          | NextAuth v5 (GitHub provider) + Prisma adapter                |
| Data          | Prisma 7 against Supabase Postgres                            |
| Content       | Markdown + remark/rehype, KaTeX math, Shiki code, gray-matter |
| Editor        | CodeMirror 6 (markdown, autocomplete, merge view)             |
| Schematics    | `schematic-renderer` + Three.js                               |
| Search        | MiniSearch                                                    |
| i18n          | `next-intl` (`en`, `zh`)                                      |
| Hosting       | Vercel (Speed Insights, Analytics, Blob)                      |
| Lint / Format | oxlint, Prettier (with Tailwind plugin)                       |
| Tests         | Vitest, Playwright, Lighthouse CI                             |

### Setup

```bash
git clone https://github.com/gtmc-dev/gtmc.git
cd gtmc
pnpm install   # also initializes articles/ when the submodule is missing
cp .env.example .env   # fill in GitHub OAuth, database URL, etc.
pnpm dev
```

The dev server runs on <http://localhost:3000>.

### Scripts

```bash
pnpm dev              # Start the dev server
pnpm build:content    # Generate content artifacts (manifest, glossary, articles, PDF)
pnpm build:next       # Next.js production build
pnpm build            # Both phases: content generation then Next build
pnpm build:pdf        # Regenerate the offline PDF only
pnpm typecheck        # tsc --noEmit
pnpm lint             # oxlint
pnpm style            # prettier --check
pnpm lighthouse       # Run Lighthouse CI locally
```

**Build phases:**

- `build:content` — generates static content artifacts (manifest, glossary, rendered articles, PDF)
- `build:next` — runs the Next.js build consuming those artifacts
- `build` — runs both in order

### Layout

```text
.
├── app/                    Next.js App Router (locale-scoped routes)
│   └── [locale]/
│       ├── (public)/       Articles, public pages
│       ├── (private)/      Drafts, review hub, profile, admin
│       ├── (auth)/         GitHub sign-in flow
│       └── _homepage/      Hero card, foreground/background layers
├── components/ui/          TechCard, TechButton, CornerBrackets, …
├── lib/                    Article pipeline, auth, db, search, GitHub helpers
├── articles/               Article content (Git submodule, see below)
├── scripts/                Manifest, content, and PDF generators
├── messages/               i18n catalogs (en.json, zh.json)
├── schema.prisma           Database schema
└── DESIGN.md               Visual system reference
```

### Submodule

The `articles/` directory is a Git submodule pinned to a specific commit of the [articles repo](https://github.com/orgs/gtmc-dev/repositories). It is **not** auto-updated by `pnpm install` once it exists.

```bash
pnpm articles:status                # Show submodule status
pnpm articles:init                  # Reinitialize at the pinned commit
pnpm articles:update                # Pull the latest articles commit

pnpm generate:manifest              # Rebuild the article manifest
pnpm generate:content               # Re-render rendered content
pnpm articles:pdf                   # Re-render the offline PDF
```

> [!IMPORTANT]
> To deploy newer article content, **commit the updated submodule pointer** in this repo. Vercel checkouts use whatever commit is pinned here.

For details and contribution guidance, see [`CONTRIBUTING.md`](CONTRIBUTING.md).

## See also

All articles (including drafts and pending submissions) are located in this repo: [`gtmc-dev/articles`](https://github.com/gtmc-dev/articles)

---

<div align="center">

<sub>
Code: <a href="LICENSE">Apache-2.0</a> · Articles: <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC BY-NC-SA 4.0</a>
</sub>

</div>
