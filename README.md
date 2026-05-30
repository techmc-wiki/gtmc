<!-- prettier-ignore -->
<div align="center">

<img src="images/articles_en_light.jpeg" width="49%" alt="Graduate Texts in Minecraft" /><img src="images/articles_en_dark.jpeg" width="49%" alt="Graduate Texts in Minecraft" />

# Graduate Texts in Minecraft

**A community-written online textbook on Technical Minecraft.**

Read tutorials, mechanics deep-dives, and source-code walkthroughs. All openly written and reviewed.

[![Website](https://img.shields.io/badge/site-beta.techmc.wiki-60708F?style=flat-square&labelColor=4A5A78)](https://beta.techmc.wiki) [![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/gtmc-dev/gtmc) [![Next.js](https://img.shields.io/badge/Next.js-16-000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org) [![React](https://img.shields.io/badge/React-19-149ECA?style=flat-square&logo=react&logoColor=white)](https://react.dev) [![TypeScript](https://img.shields.io/badge/TypeScript-blue?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org) [![License](https://img.shields.io/badge/Code-Apache--2.0-yellow?style=flat-square)](LICENSE) [![Articles](https://img.shields.io/badge/Articles-CC--BY--NC--SA%204.0-lightgrey?style=flat-square)](LICENSE)

[Visit the Site](https://beta.techmc.wiki) · [Browse Raw Articles](https://github.com/gtmc-dev/articles) · [More GTMC Projects](https://github.com/orgs/gtmc-dev/repositories)

<!-- README-I18N:START -->

**English** | [汉语](./README.zh.md)

<!-- README-I18N:END -->

</div>

---

## About

**Graduate Texts in Minecraft** (*GTMC*) is an open knowledge base for the technical side of Minecraft — redstone, game mechanics, and engine internals. Anyone can read it, and the community writes and reviews it together.

You'll find three kinds of articles:

- **Tutorials** — step-by-step walkthroughs for builders.
- **Explanations** — how in-game mechanics actually work, from first principles.
- **Code Analysis** — annotated readings of the game's source.

They span the whole stack of technical play: production builds like tree farms, mechanical redstone and component behavior, slime-tech flying machines, and the timing and wiring that hold them together. On the engine side, articles dig into micro-timing, block updates and update order, chunk loading and loading tickets, and entity AI and movement — backed by source reading where it matters. Tooling chapters cover the staples of a technical setup (Carpet, Litematica, and the masa suite), so newcomers and veterans both have a way in.

The fastest way to start is to **[visit the site](https://beta.techmc.wiki)**. Want to contribute? You can draft and submit articles right from the site, or open a feature request to suggest a topic.

> [!NOTE]
> This repo is the **website**. Articles live in [their own repo](https://github.com/gtmc-dev/articles) and are pulled in as a submodule. Other GTMC projects are at [github.com/orgs/gtmc-dev](https://github.com/orgs/gtmc-dev/repositories).

## Running it locally

<a href="https://skillicons.dev"><img src="https://skillicons.dev/icons?i=nextjs,react,ts,tailwind,prisma,supabase,vercel" alt="Next.js, React, TypeScript, Tailwind CSS, Prisma, Supabase, Vercel" /></a>

See [`DESIGN.md`](DESIGN.md) for the visual system and [`AGENTS.md`](AGENTS.md) for the full stack breakdown.

```bash
git clone https://github.com/gtmc-dev/gtmc.git
cd gtmc
pnpm install            # initializes the articles/ submodule if missing
cp .env.example .env    # add GitHub OAuth, database URL, etc.
pnpm dev                # http://localhost:3000
```

Common scripts:

```bash
pnpm dev          # Start the dev server
pnpm build        # Full production build (content + Next.js)
pnpm typecheck    # tsc --noEmit
pnpm lint         # oxlint
pnpm style        # prettier --check
```

> [!TIP]
> `pnpm build` runs in two phases: `build:content` generates static artifacts (article manifest, glossary, rendered content, offline PDF), then `build:next` builds the site from them. Run them separately when you only need one.

---

<div align="center">

<sub>
Code: <a href="LICENSE">Apache-2.0</a> · Articles: <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC BY-NC-SA 4.0</a>
</sub>

</div>
