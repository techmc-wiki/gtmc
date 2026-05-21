![Screenshot](images/homepage.jpeg)

# Graduate Texts in Minecraft

<a href="https://deepwiki.com/gtmc-dev/gtmc">
  <img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki">
</a>

A Technical Minecraft online textbook, written collaboratively and community-driven.

[Website](https://beta.techmc.wiki)

## Repositories

This repo contains solely the website's code.

All other data (e.g., articles) can be found from other repos under the [orgranization](https://github.com/orgs/gtmc-dev/repositories).

## Development Setup

### First-time Setup

```bash
git clone https://github.com/gtmc-dev/gtmc.git
cd gtmc
pnpm install  # Initializes articles/ when the submodule is missing
```

### Article Content

The Articles content is managed as a Git submodule pinned by this website repo. Use these commands:

```bash
# Check submodule status
pnpm articles:status

# Reinitialize to the pinned commit if needed
pnpm articles:init

# Update to the latest articles repo commit
pnpm articles:update

# Regenerate article data after content or frontmatter changes
pnpm generate:manifest
pnpm generate:content
```

**Note:** `pnpm install` does not update an existing `articles/` checkout. To deploy newer article content, commit the updated `articles` submodule pointer in this repo.

## License

The site's source code is distrubuted with the Apache 2.0 license.

All articles are licensed under CC-BY-NC-SA 4.0.
