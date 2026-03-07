# Agents

This document is for coding agents to follow when contributing to this repo.

## Sisyphus

If you are an Oh-my-Opencode agent (Sisyphus, Prometheus, Atlas, Hephaestus), please follow the following rules:

1. Do not commit anything in the .sisyphus directory.
2. .sisyphus is already added to .gitignore.

## Git Rules

1. If not otherwise specified, you are allowed to make commits.
2. You are always **NOT** allowed to perform `git push` or `git pull`.
3. Do not to create new branches or worktrees if not explicitly asked.
4. Commit messages (titles) should follow the format of `<type>(<scope>): <subject>`. <scope> can be omitted if its too large or ambiguous. <subject> must be a full sentence, starts with a capital letter, and must begin with a verb. <type> should be one of the following:
   - feat: a new feature for the user.
   - fix: a bug fix for the user.
   - refactor: a code change that neither fixes a bug nor adds a feature, but makes the code better in some way.
   - docs: changes to documentation only.
   - style: changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc.).
   - chore: changes to the build process or auxiliary tools and libraries such as documentation generation.
   - test: adding missing tests or correcting existing tests.
   - perf: a code change that improves performance.
   The whole commit message should not exceed 72 characters, since this triggers a new line in the commit message.
5. If your edit / patch is very lengthy, split them to multiple commits.
6. Commits should be splitted as a medium-sized meaningful unit. Therefore, you should not be overly fine-grained. Maximum revertability should be ensured.
7. Do not worry if you found files or git commit hashes have changet while your are working. This might be caused by rebases. Do not attempt to revert these unexpected changes.

## Testing

1. Do not add, propose, or even waste time on thinking about tests if not explicitly asked.
2. Tests will always be prompted as isolated tasks.
3. You are always allowed to use `go test` to audit.

## Other Rules

1. Ensure using the latest version of newly added packages as long as there's no major stability issue.
2. If you believe the initial demand is fully satisfied and all current context will not be helpful for future tasks, you can remind me to open a new session.
3. You must NOT delete any file unless the task explicitly requires pruning/refactoring/simplifying the codebase.
