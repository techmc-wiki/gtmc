import { routing } from "@/i18n/routing";
import { type ArticleTreeNode } from "@/lib/github";

export type ArticleLocale = "en" | "zh";
export type TranslationLocale = Exclude<ArticleLocale, "zh">;
export type TranslationFreshness = "fresh" | "stale" | "unknown";

export type TranslationStatusDetail = {
  readonly translatedFromRevision: string;
  readonly latestOriginalRevision: string;
  readonly commitLag: number;
  readonly dayLag: number;
  readonly latestOriginalCommitUrl: string;
};

export const MANIFEST_FILE_NAME = "manifest.json";

function getNodeBuiltin<T>(name: string): T {
  const getBuiltinModule = (
    process as typeof process & {
      getBuiltinModule?: (id: string) => unknown;
    }
  ).getBuiltinModule;

  if (getBuiltinModule) {
    return getBuiltinModule(name) as T;
  }
  // eslint-disable-next-line no-eval
  const nodeRequire = (0, eval)("require") as NodeRequire;
  return nodeRequire(name) as T;
}

export function getManifestPath(): string {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const path = getNodeBuiltin<typeof import("path")>("path");
  return path.join(process.cwd(), "data", MANIFEST_FILE_NAME);
}

export interface ArticleEntry {
  filePath: string;
  slug: string;
  titleByLocale: Partial<Record<ArticleLocale, string>>;
  availableLocales: ArticleLocale[];
  localizedFilePaths: Partial<Record<ArticleLocale, string>>;
  chapterTitleByLocale: Partial<Record<ArticleLocale, string>>;
  introTitleByLocale: Partial<Record<ArticleLocale, string>>;
  descriptionByLocale: Partial<Record<ArticleLocale, string>>;
  hasIntro: boolean;
  index: number;
  isFolder: boolean;
  isAppendix: boolean;
  isPreface: boolean;
  parentSlug?: string;
  /** Attribution is derived from Git history, never from frontmatter. */
  author?: string;
  coAuthors?: string[];
  created?: string;
  lastmodByLocale: Partial<Record<ArticleLocale, string>>;
  translatedFromRevisionByLocale: Partial<
    Record<TranslationLocale, string>
  >;
  translationFreshnessByLocale: Partial<
    Record<TranslationLocale, TranslationFreshness>
  >;
  translationStatusByLocale?: Partial<
    Record<TranslationLocale, TranslationStatusDetail>
  >;
  bannerByLocale?: Partial<
    Record<ArticleLocale, { src: string; alt?: string }>
  >;
  isAdvanced?: boolean;
  isRevising?: boolean;
}

export interface LocalizedArticleMetadata {
  chapterTitle: string;
  introTitle: string;
}

export function loadArticleManifest(): Record<string, ArticleEntry> {
  let raw: string;
  const manifestPath = getManifestPath();
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const fs = getNodeBuiltin<typeof import("fs")>("fs");

  try {
    raw = fs.readFileSync(manifestPath, "utf-8");
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[article-manifest] Missing article manifest: ${manifestPath}`,
      );
      return {};
    }

    throw new Error(
      `[article-manifest] Failed to load article manifest: ${manifestPath}`,
      {
        cause: error,
      },
    );
  }

  return parseArticleManifest(raw, manifestPath);
}

export interface ManifestStats {
  articleCount: number;
  authorCount: number;
  lastRevision: string | null;
}

export function getManifestStats(locale: ArticleLocale): ManifestStats {
  const manifest = loadArticleManifest();
  const entries = Object.values(manifest);

  let articleCount = 0;
  const allAuthors = new Set<string>();
  let maxLastmod: string | null = null;

  for (const entry of entries) {
    if (entry.isFolder) continue;

    articleCount++;

    if (entry.author) allAuthors.add(entry.author);
    if (entry.coAuthors) {
      for (const coAuthor of entry.coAuthors) {
        if (coAuthor) allAuthors.add(coAuthor);
      }
    }

    const localeLastmod = entry.lastmodByLocale[locale];
    if (localeLastmod && (!maxLastmod || localeLastmod > maxLastmod)) {
      maxLastmod = localeLastmod;
    }
  }

  return {
    articleCount,
    authorCount: allAuthors.size,
    lastRevision: maxLastmod,
  };
}

function parseArticleManifest(
  raw: string,
  manifestPath: string,
): Record<string, ArticleEntry> {
  try {
    return JSON.parse(raw) as Record<string, ArticleEntry>;
  } catch (error) {
    throw new Error(
      `[article-manifest] Failed to parse article manifest: ${manifestPath}`,
      {
        cause: error,
      },
    );
  }
}

export async function getArticleManifest(): Promise<
  Record<string, ArticleEntry>
> {
  return loadArticleManifest();
}

const localTreeCache = new Map<ArticleLocale, ArticleTreeNode[]>();

export async function getArticleTree(
  locale: ArticleLocale,
): Promise<ArticleTreeNode[]> {
  const cached = localTreeCache.get(locale);
  if (cached) return cached;

  try {
    const tree = await buildLocalTree(locale);
    localTreeCache.set(locale, tree);
    return tree;
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[article-manifest] Failed to build local tree from article manifest",
        error,
      );
    }
  }

  return [];
}

async function buildLocalTree(
  locale: ArticleLocale,
): Promise<ArticleTreeNode[]> {
  const manifest = await getArticleManifest();
  const entries = Object.values(manifest);
  if (entries.length === 0) {
    return [];
  }

  const parentIndex = new Map<string, ArticleEntry[]>();
  for (const entry of entries) {
    if (!entry.parentSlug) continue;
    const siblings = parentIndex.get(entry.parentSlug) ?? [];
    siblings.push(entry);
    parentIndex.set(entry.parentSlug, siblings);
  }

  const roots = entries
    .filter((entry) => !entry.parentSlug || !manifest[entry.parentSlug])
    .toSorted((a, b) => compareEntries(a, b, locale));

  return roots
    .map((entry) => buildTreeNode(entry, parentIndex, locale))
    .filter((node): node is ArticleTreeNode => node !== null);
}

function buildTreeNode(
  entry: ArticleEntry,
  parentIndex: Map<string, ArticleEntry[]>,
  locale: ArticleLocale,
): ArticleTreeNode | null {
  const childrenFromParent = parentIndex.get(entry.slug) ?? [];
  const children = childrenFromParent
    .toSorted((a, b) => compareEntries(a, b, locale))
    .map((child) => buildTreeNode(child, parentIndex, locale))
    .filter((node): node is ArticleTreeNode => node !== null);

  if (!entry.isFolder && !entry.availableLocales.includes(locale)) {
    return null;
  }

  if (
    entry.isFolder &&
    children.length === 0 &&
    !entry.availableLocales.includes(locale)
  ) {
    return null;
  }

  const localizedMetadata = getLocalizedArticleMetadata(entry, locale);

  const node: ArticleTreeNode & {
    index: number;
    isAppendix: boolean;
    isPreface: boolean;
    introTitle?: string;
    isAdvanced?: boolean;
  } = {
    id: entry.isFolder ? entry.slug : entry.filePath.replace(/\.md$/i, ""),
    title: getNodeTitle(entry, locale),
    slug: entry.slug,
    isFolder: entry.isFolder,
    index: entry.index,
    isAppendix: entry.isAppendix,
    isPreface: entry.isPreface,
    introTitle: localizedMetadata.introTitle,
    isAdvanced: entry.isAdvanced,
    parentId: entry.parentSlug ?? null,
    children,
  };

  return node;
}

function compareEntries(
  a: ArticleEntry,
  b: ArticleEntry,
  locale: ArticleLocale,
): number {
  if (a.isFolder === b.isFolder) {
    return getNodeTitle(a, locale).localeCompare(getNodeTitle(b, locale));
  }
  return a.isFolder ? -1 : 1;
}

function getNodeTitle(entry: ArticleEntry, locale: ArticleLocale): string {
  const { chapterTitle } = getLocalizedArticleMetadata(entry, locale);
  const fileTitle = entry.filePath.split("/").pop()?.replace(/\.md$/i, "");
  const sourceChapterTitle = entry.chapterTitleByLocale.zh?.trim();
  const sourceTitle = entry.titleByLocale.zh?.trim();
  const slugTitle = entry.slug.split("/").pop() || entry.slug;

  if (entry.isFolder) {
    return chapterTitle || sourceChapterTitle || sourceTitle || slugTitle;
  }

  if (locale === routing.defaultLocale) {
    return (
      entry.titleByLocale[locale]?.trim() ||
      chapterTitle ||
      fileTitle ||
      slugTitle
    );
  }

  if (entry.isPreface) {
    return entry.titleByLocale[locale]?.trim() || chapterTitle || slugTitle;
  }

  if (entry.isAppendix) {
    return (
      chapterTitle ||
      entry.titleByLocale[locale]?.trim() ||
      fileTitle ||
      slugTitle
    );
  }

  return (
    chapterTitle ||
    entry.titleByLocale[locale]?.trim() ||
    fileTitle ||
    slugTitle
  );
}

export function getLocalizedArticleMetadata(
  entry: ArticleEntry | null | undefined,
  locale: ArticleLocale = "zh",
): LocalizedArticleMetadata {
  if (!entry) {
    return {
      chapterTitle: "",
      introTitle: "",
    };
  }

  const chapterTitle = entry.chapterTitleByLocale[locale]?.trim() || "";

  const introTitle = entry.introTitleByLocale[locale]?.trim() || "";

  return {
    chapterTitle,
    introTitle,
  };
}

export async function getLocalizedArticleEntry(
  slugPath: string,
  locale: ArticleLocale = "zh",
): Promise<(ArticleEntry & LocalizedArticleMetadata) | null> {
  const entry = (await getArticleManifest())[slugPath];
  if (!entry) {
    return null;
  }

  return {
    ...entry,
    ...getLocalizedArticleMetadata(entry, locale),
  };
}

export {
  hasArticleLocale,
  getArticleAvailableLocales,
} from "./locale";
