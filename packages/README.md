# packages

Workspace packages, picked up by the `packages/*` glob in
[`pnpm-workspace.yaml`](../pnpm-workspace.yaml).

- [`ssg`](ssg): the article build pipeline and shared Markdown transforms.
  Its paths and host settings are explicit inputs; it has no Next.js imports.

The Next.js site lives in [`apps/web`](../apps/web), and the Go PDF renderer
lives in [`tools/pdfgen`](../tools/pdfgen).
