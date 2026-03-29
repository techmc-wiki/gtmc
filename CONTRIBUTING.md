# Contributing

## Working with Articles Submodule

### Understanding the Submodule

The `articles/` directory is a Git submodule pointing to the Articles repository. This means:

- It's version-locked to a specific commit
- Changes to Articles repo don't automatically appear locally
- You need to explicitly update the submodule

### Scripts

Install the submodule with the version (commit hash) specified by the upstream:

```bash
pnpm articles:init
```

Update to latest according to the article repo:

```bash
pnpm articles:update
```

Check status:

```bash
pnpm articles:status
```

### How this works Vercel's CD Streamline

During the deloyment articles will be pulled as a submodule, then they are updated to latest (main/HEAD of the [articles repo](https://github.com/gtmc-dev/articles)). Specifically, at the stage of `pnpm install`, as the above operation were written into the `postinstall` script in [package.json](package.json). There are also auto update mechanisms, manual build for each article update is not needed. In one line, you don't have to worry the production environment's article status, they are always up-to-date, although your local articles might be outdated.

Note that running `pnpm install` on your local repo does the same. So usually you will have a rather up-to-date version locally even the upstream is outdated.

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
