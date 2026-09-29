// The cover preview imports the public pdf.js ESM bundle by URL; map it to pdfjs-dist's types.
declare module "*/pdfjs/pdf.min.mjs" {
  export * from "pdfjs-dist"
}
