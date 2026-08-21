// The cover preview loads the pdf.js ESM build from /public via a plain
// URL import (see components/mdx/pdf-cover-preview.tsx). This declares
// that URL module so TypeScript types it as pdfjs-dist.
declare module "*/pdfjs/pdf.min.mjs" {
  export * from "pdfjs-dist"
}
