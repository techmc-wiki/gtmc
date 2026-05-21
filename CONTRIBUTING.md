# Contributing

## Working with Articles Submodule

### Understanding the Submodule

The `articles/` directory is a Git submodule pointing to the Articles repository. This means:

- It's version-locked to a specific commit
- Changes to Articles repo don't automatically appear locally
- You need to explicitly update the submodule

### Scripts

Install the submodule at the commit recorded by this website repo:

```bash
pnpm articles:init
```

Update the submodule to the latest commit on the articles repo's tracked branch:

```bash
pnpm articles:update
```

Check status:

```bash
pnpm articles:status
```

Regenerate the article manifest and rendered content after article or frontmatter changes:

```bash
pnpm generate:manifest
pnpm generate:content
```

### How this works in Vercel deployments

During deployment, `pnpm install` runs [package.json](package.json)'s `postinstall` script. That script initializes `articles/` only when the submodule directory is missing or empty. It does not update an existing checkout to the latest articles repo commit.

Fresh Vercel checkouts therefore use the submodule commit pinned by this website repo. To deploy newer article content, update the `articles` submodule pointer in this repo and commit that pointer change.

### When to Update

Update the submodule when:

- You need the latest articles for testing
- You're working on article-related features
- After pulling changes that update the submodule reference

```bash
pnpm articles:update
```

### Committing Submodule Changes

If you update the submodule, Git will show `articles` as modified. Commit this change:

```bash
git add articles
git commit -m "chore(articles): Update articles submodule to latest"
```

Please do not mix a submodule update in a feature/fix commit.

Generally, just do not update the submodule unless there are breaking changes in the article repo. If you need it for developing, update your local submodule only.
