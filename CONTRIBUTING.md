# Contributing to Graduate Texts in Minecraft

## Working with Articles Submodule

### Understanding the Submodule

The `articles/` directory is a Git submodule pointing to the Articles repository. This means:

- It's version-locked to a specific commit
- Changes to Articles repo don't automatically appear locally
- You need to explicitly update the submodule

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
git commit -m "chore: Update articles submodule to latest"
```

### Troubleshooting

**Submodule not initialized:**

```bash
pnpm articles:init
```

**Submodule in detached HEAD state:**
This is normal. The submodule is locked to a specific commit.
