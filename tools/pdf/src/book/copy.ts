import fs from "node:fs"
import path from "node:path"

import type { PdfLocale } from "./manifest"
import { siteRoot } from "../workspace"

export interface BookCopy {
  bookTitle: string
  bookSubtitle: string
  slogan: string
  edition: string
}

/**
 * Book copy lives in the site's message catalogues so the PDF and the reader
 * surface say the same thing, and is read from those catalogues rather than
 * duplicated here.
 */
const COPY: Record<PdfLocale, BookCopy> = {
  en: {
    bookTitle: "Graduate Texts in Minecraft",
    bookSubtitle: "An Introduction to Technical Minecraft",
    slogan: "Curiosity in 'cubic' inch.",
    edition: "Offline Edition",
  },
  zh: {
    bookTitle: "Graduate Texts in Minecraft",
    bookSubtitle: "技术性 Minecraft 入门",
    slogan: "求知于方寸之间。",
    edition: "离线版",
  },
}

export function bookCopy(locale: PdfLocale): BookCopy {
  return COPY[locale]
}

export const SOURCE_URL = "https://techmc.wiki"

/** The articles submodule revision the book was built from. */
export function articlesRevision(): string | undefined {
  const gitDir = path.join(repoRoot(), "content", "articles", ".git")
  try {
    const raw = fs.readFileSync(gitDir, "utf8").trim()
    const match = /gitdir:\s*(.+)/.exec(raw)
    if (!match?.[1]) return undefined

    const gitDirPath = path.resolve(path.dirname(gitDir), match[1].trim())
    const head = fs.readFileSync(path.join(gitDirPath, "HEAD"), "utf8").trim()
    if (!head.startsWith("ref:")) return head

    const ref = head.slice(5).trim()
    const loose = path.join(gitDirPath, ref)
    if (fs.existsSync(loose)) return fs.readFileSync(loose, "utf8").trim()

    const packed = path.join(gitDirPath, "packed-refs")
    if (!fs.existsSync(packed)) return undefined
    const line = fs
      .readFileSync(packed, "utf8")
      .split("\n")
      .find((entry) => entry.endsWith(` ${ref}`))
    return line?.split(" ")[0]
  } catch {
    return undefined
  }
}

function repoRoot(): string {
  return path.resolve(siteRoot(), "..", "..")
}
