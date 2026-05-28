<!-- prettier-ignore -->
<div align="center">

<img src="images/homepage.jpeg" alt="Graduate Texts in Minecraft" />

# Graduate Texts in Minecraft

**社区驱动的技术 Minecraft 在线教科书。**

入门教程、机制阐述、源码阅读。协作撰写，公开评审。

[![Website](https://img.shields.io/badge/site-beta.techmc.wiki-60708F?style=flat-square&labelColor=4A5A78)](https://beta.techmc.wiki) [![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/gtmc-dev/gtmc) [![Next.js](https://img.shields.io/badge/Next.js-16-000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org) [![React](https://img.shields.io/badge/React-19-149ECA?style=flat-square&logo=react&logoColor=white)](https://react.dev) [![TypeScript](https://img.shields.io/badge/TypeScript-blue?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org) [![License](https://img.shields.io/badge/Code-Apache--2.0-yellow?style=flat-square)](LICENSE) [![Articles](https://img.shields.io/badge/Articles-CC--BY--NC--SA%204.0-lightgrey?style=flat-square)](LICENSE)

[访问网站](https://beta.techmc.wiki) · [浏览原始文章](https://github.com/gtmc-dev/articles) · [更多 GTMC 项目](https://github.com/orgs/gtmc-dev/repositories)

<!-- README-I18N:START -->

[English](./README.md) | **汉语**

<!-- README-I18N:END -->

</div>

---

## 关于

Graduate Texts in Minecraft（*GTMC*）是一份开放、社区驱动的知识库，聚焦 Minecraft 的技术面向——红石、游戏机制以及引擎内部细节。它承载三类写作：

- `>> TUTORIALS` —— 面向建造者的分步教程。
- `>> EXPLANATIONS` —— 对游戏机制的第一性原理阐述。
- `>> CODE ANALYSIS` —— 带注解的源码阅读。

站点采用 **蓝图 / 科学制图** 的视觉语言：细蓝灰线条、方形几何、等宽字 HUD 标签、角标，以及更接近仪表盘指示而非装饰的动效。完整设计系统见 [`DESIGN.md`](DESIGN.md)。

> [!NOTE]
> 本仓库仅托管**网站**代码。文章内容位于独立仓库，作为 Git 子模块引入。其他相关仓库见 [github.com/orgs/gtmc-dev](https://github.com/orgs/gtmc-dev/repositories)。

## 开发

### 技术栈

| 层级          | 选型                                                          |
| ------------- | ------------------------------------------------------------- |
| 框架          | Next.js 16（App Router、Cache Components）+ React 19          |
| 语言          | TypeScript 6                                                  |
| 样式          | Tailwind CSS v4，自定义 `tech-*` 蓝图主题变量                 |
| 动效          | `motion`（Framer Motion 的继任者）                            |
| 鉴权          | NextAuth v5（GitHub provider）+ Prisma adapter                |
| 数据          | Prisma 7，对接 Supabase Postgres                              |
| 内容          | Markdown + remark/rehype，KaTeX 数学，Shiki 代码，gray-matter |
| 编辑器        | CodeMirror 6（markdown、自动补全、合并视图）                  |
| 结构方块渲染  | `schematic-renderer` + Three.js                               |
| 搜索          | MiniSearch                                                    |
| i18n          | `next-intl`（`en`、`zh`）                                     |
| 部署          | Vercel（Speed Insights、Analytics、Blob）                     |
| Lint / 格式化 | oxlint、Prettier（含 Tailwind 插件）                          |
| 测试          | Vitest、Playwright、Lighthouse CI                             |

### 初始化

```bash
git clone https://github.com/gtmc-dev/gtmc.git
cd gtmc
pnpm install   # 当 articles/ 子模块缺失时也会一并初始化
cp .env.example .env   # 填写 GitHub OAuth、数据库 URL 等
pnpm dev
```

开发服务器运行在 <http://localhost:3000>。

### 脚本

```bash
pnpm dev              # 启动开发服务器
pnpm build            # 生成 manifest + content + PDF，再执行 `next build`
pnpm typecheck        # tsc --noEmit
pnpm lint             # oxlint
pnpm style            # prettier --check
pnpm lighthouse       # 本地运行 Lighthouse CI
```

### 目录结构

```text
.
├── app/                    Next.js App Router（按 locale 划分路由）
│   └── [locale]/
│       ├── (public)/       文章、公开页面
│       ├── (private)/      草稿、评审中心、个人页、管理
│       ├── (auth)/         GitHub 登录流程
│       └── _homepage/      首页主卡片、前后景图层
├── components/ui/          TechCard、TechButton、CornerBrackets …
├── lib/                    文章流水线、鉴权、数据库、搜索、GitHub 辅助
├── articles/               文章内容（Git 子模块，详见下文）
├── scripts/                Manifest、内容、PDF 生成脚本
├── messages/               i18n 文案（en.json、zh.json）
├── schema.prisma           数据库 Schema
└── DESIGN.md               视觉系统参考
```

### 子模块

`articles/` 是一个 Git 子模块，固定在文章[仓库](https://github.com/orgs/gtmc-dev/repositories)的某个具体提交上。一旦本地已存在，**不会**被 `pnpm install` 自动更新。

```bash
pnpm articles:status                # 查看子模块状态
pnpm articles:init                  # 重新初始化到固定的提交
pnpm articles:update                # 拉取最新的文章提交

pnpm generate:manifest              # 重新生成文章 manifest
pnpm generate:content               # 重新渲染内容
pnpm articles:pdf                   # 重新生成离线 PDF
```

> [!IMPORTANT]
> 要部署最新的文章内容，需要在本仓库**提交更新后的子模块指针**。Vercel 拉取的总是这里固定的那个提交。

更多细节与贡献指引见 [`CONTRIBUTING.md`](CONTRIBUTING.md)。

## 另见

所有文章（含草稿与待审稿件）位于此仓库：[`gtmc-dev/articles`](https://github.com/gtmc-dev/articles)

---

<div align="center">

<sub>
代码：<a href="LICENSE">Apache-2.0</a> · 文章：<a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC BY-NC-SA 4.0</a>
</sub>

</div>
