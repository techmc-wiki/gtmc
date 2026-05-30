<!-- prettier-ignore -->
<div align="center">

<img src="images/articles_zh_light.jpeg" width="49%" alt="Graduate Texts in Minecraft" /><img src="images/articles_zh_dark.jpeg" width="49%" alt="Graduate Texts in Minecraft" />

# Graduate Texts in Minecraft

**社区共建的技术 Minecraft 在线教科书。**

阅读入门教程、机制深析与源码解读，内容皆由社区公开编写与评审。

[![Website](https://img.shields.io/badge/site-beta.techmc.wiki-60708F?style=flat-square&labelColor=4A5A78)](https://beta.techmc.wiki) [![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/gtmc-dev/gtmc) [![Next.js](https://img.shields.io/badge/Next.js-16-000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org) [![React](https://img.shields.io/badge/React-19-149ECA?style=flat-square&logo=react&logoColor=white)](https://react.dev) [![TypeScript](https://img.shields.io/badge/TypeScript-blue?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org) [![License](https://img.shields.io/badge/Code-Apache--2.0-yellow?style=flat-square)](LICENSE) [![Articles](https://img.shields.io/badge/Articles-CC--BY--NC--SA%204.0-lightgrey?style=flat-square)](LICENSE)

[访问网站](https://beta.techmc.wiki) · [浏览原始文章](https://github.com/gtmc-dev/articles) · [更多 GTMC 项目](https://github.com/orgs/gtmc-dev/repositories)

<!-- README-I18N:START -->

[English](./README.md) | **汉语**

<!-- README-I18N:END -->

</div>

---

## 关于

**Graduate Texts in Minecraft**（*GTMC*）是一个开放的 Minecraft 技术知识库——涵盖红石、游戏机制与引擎内部原理。任何人都能阅读，并由社区共同编写、评审。

这里有三类文章：

- **教程（Tutorials）** —— 面向建造者的分步讲解。
- **机制讲解（Explanations）** —— 从基本原理出发，剖析机制的真正运作方式。
- **源码解读（Code Analysis）** —— 带注释的游戏源码阅读。

内容覆盖技术玩法的方方面面：树场等量产装置、械电与元件特性、绿萌科技，以及把它们串联起来的时序与电路。在引擎层面，文章深入微时序、方块更新与更新顺序、区块加载与加载票（loading ticket）、实体 AI 与实体移动——必要之处佐以源码分析。工具章节则讲解技术存档的常用利器（Carpet、Litematica 与 masa 套件），让新手与老手都能找到入口。

最快的上手方式就是**[访问网站](https://beta.techmc.wiki)**。想参与贡献？你可以直接在站内起草并提交文章，也可以提交一个 feature request 来建议选题。

> [!NOTE]
> 本仓库是**网站**本体。文章存放在[独立仓库](https://github.com/gtmc-dev/articles)中，以子模块形式引入。其他 GTMC 项目见 [github.com/orgs/gtmc-dev](https://github.com/orgs/gtmc-dev/repositories)。

## 本地运行

<a href="https://skillicons.dev"><img src="https://skillicons.dev/icons?i=nextjs,react,ts,tailwind,prisma,supabase,vercel" alt="Next.js, React, TypeScript, Tailwind CSS, Prisma, Supabase, Vercel" /></a>

视觉系统详见 [`DESIGN.md`](DESIGN.md)，完整技术栈详见 [`AGENTS.md`](AGENTS.md)。

```bash
git clone https://github.com/gtmc-dev/gtmc.git
cd gtmc
pnpm install            # 若 articles/ 子模块缺失则自动初始化
cp .env.example .env    # 填写 GitHub OAuth、数据库 URL 等
pnpm dev                # http://localhost:3000
```

常用脚本：

```bash
pnpm dev          # 启动开发服务器
pnpm build        # 完整生产构建（内容 + Next.js）
pnpm typecheck    # tsc --noEmit
pnpm lint         # oxlint
pnpm style        # prettier --check
```

> [!TIP]
> `pnpm build` 分两个阶段执行：`build:content` 生成静态产物（文章 manifest、术语表、渲染后的内容、离线 PDF），随后 `build:next` 基于这些产物构建站点。只需其中一个阶段时可单独运行。

---

<div align="center">

<sub>
代码：<a href="LICENSE">Apache-2.0</a> · 文章：<a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC BY-NC-SA 4.0</a>
</sub>

</div>
