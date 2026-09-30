# packages

Shared libraries for the GTMC workspace.

Anything here must be **runtime-agnostic**: no Next.js imports, no `app/`
conventions, and no `process.cwd()`-relative assumptions. The web app lives in
[`apps/web`](../apps/web) and the PDF renderer in [`tools/pdf`](../tools/pdf).

This directory is currently empty. Populate it when there is a genuine shared
boundary between two consumers — not to hold code that only the web app uses,
which belongs in `apps/web/lib/`.

Members are picked up automatically by the `packages/*` glob in
[`pnpm-workspace.yaml`](../pnpm-workspace.yaml); no root `package.json` edit is
needed to add one.
