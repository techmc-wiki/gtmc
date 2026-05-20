import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import yaml from 'js-yaml';

const execFileAsync = promisify(execFile);

interface Commit {
  author: string;
  committer: string;
  coAuthors: string[];
}

// Cache stores various types (e.g., string[] for maintainers, Map<string, string> for aliases,
// {author, coAuthors} for parsed commits, {created, lastmod} for dates, string for SHAs)
const cache = new Map<string, any>();

function getCacheKey(cwd: string, relPath: string, type: string): string {
  return `${cwd}:${relPath}:${type}`;
}

export async function loadMaintainers(articlesRepoCwd: string): Promise<string[]> {
  const cacheKey = `${articlesRepoCwd}:maintainers`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const maintainersPath = join(articlesRepoCwd, '_scripts', 'maintainers.yml');
  try {
    const content = await readFile(maintainersPath, 'utf-8');
    const maintainers = (yaml.load(content) as string[]) || [];
    const lowercased = maintainers.map(m => m.toLowerCase());
    cache.set(cacheKey, lowercased);
    return lowercased;
  } catch {
    cache.set(cacheKey, []);
    return [];
  }
}

export async function loadAuthorAliases(articlesRepoCwd: string): Promise<Map<string, string>> {
  const cacheKey = `${articlesRepoCwd}:aliases`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const aliasesPath = join(articlesRepoCwd, '_scripts', 'authors_alias.yml');
  try {
    const content = await readFile(aliasesPath, 'utf-8');
    const aliases = (yaml.load(content) as Record<string, string[]>) || {};
    const aliasMap = new Map<string, string>();
    
    for (const [canonical, aliasList] of Object.entries(aliases)) {
      aliasMap.set(canonical, canonical);
      for (const alias of aliasList) {
        aliasMap.set(alias, canonical);
      }
    }
    
    cache.set(cacheKey, aliasMap);
    return aliasMap;
  } catch {
    const emptyMap = new Map<string, string>();
    cache.set(cacheKey, emptyMap);
    return emptyMap;
  }
}

export async function getArticleAuthors(
  repoCwd: string,
  relPath: string,
  maintainers: string[],
  aliases: Map<string, string>
): Promise<{ author: string; coAuthors: string[] }> {
  const cacheKey = getCacheKey(repoCwd, relPath, 'authors');
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  try {
    const { stdout } = await execFileAsync(
      'git',
      ['log', '--follow', '--format=%an%x00%cn%x00%B%x00---COMMIT---', '--', relPath],
      { cwd: repoCwd, encoding: 'utf-8' }
    );

    const commitBlocks = stdout.trim().split('---COMMIT---');
    const commits: Commit[] = [];

    for (const block of commitBlocks) {
      const trimmed = block.trim();
      if (!trimmed) continue;

      const parts = trimmed.split('\x00', 3);
      if (parts.length < 3) continue;

      const author = parts[0].trim();
      const committer = parts[1].trim();
      const body = parts[2].trim();

      const coAuthors: string[] = [];
      for (const line of body.split('\n')) {
        if (line.trim().startsWith('Co-authored-by:')) {
          let coAuthorRaw = line.replace('Co-authored-by:', '').trim();
          if (coAuthorRaw.includes('<')) {
            coAuthorRaw = coAuthorRaw.split('<')[0].trim();
          }
          if (coAuthorRaw) {
            coAuthors.push(coAuthorRaw);
          }
        }
      }

      commits.push({ author, committer, coAuthors });
    }

    if (commits.length === 0) {
      const result = { author: '', coAuthors: [] };
      cache.set(cacheKey, result);
      return result;
    }

    const allCoauthorsSet = new Set<string>();
    for (const commit of commits) {
      for (const coauthor of commit.coAuthors) {
        allCoauthorsSet.add(coauthor);
      }
    }

    const maintainersLower = new Set(maintainers);
    const isMaintainer = (name: string) => maintainersLower.has(name.toLowerCase());
    const resolve = (name: string) => aliases.get(name) || name;

    const firstCommit = commits[commits.length - 1];
    const firstAuthor = resolve(firstCommit.author);

    const uniqueAuthorsRaw: string[] = [];
    const seen = new Set<string>();
    for (const commit of commits) {
      if (!seen.has(commit.author)) {
        seen.add(commit.author);
        uniqueAuthorsRaw.push(commit.author);
      }
    }

    const seenResolved = new Set<string>();
    const uniqueAuthors: string[] = [];
    for (const authorRaw of uniqueAuthorsRaw) {
      const resolved = resolve(authorRaw);
      if (!seenResolved.has(resolved)) {
        seenResolved.add(resolved);
        uniqueAuthors.push(resolved);
      }
    }

    const allCoauthorsResolved: string[] = [];
    const seenCoauthors = new Set<string>();
    for (const coauthorRaw of allCoauthorsSet) {
      const resolved = resolve(coauthorRaw);
      if (!seenCoauthors.has(resolved)) {
        seenCoauthors.add(resolved);
        allCoauthorsResolved.push(resolved);
      }
    }

    const nonMaintainers = uniqueAuthors.filter(a => !isMaintainer(a));
    const nonMaintainerCoauthors = allCoauthorsResolved.filter(a => !isMaintainer(a));

    let result: { author: string; coAuthors: string[] };

    if (isMaintainer(firstAuthor)) {
      if (allCoauthorsResolved.length > 0) {
        const firstAuthorNew = allCoauthorsResolved[allCoauthorsResolved.length - 1];
        const coAuthorsList = allCoauthorsResolved.filter(a => a !== firstAuthorNew);
        for (const a of nonMaintainers) {
          if (a !== firstAuthorNew && !coAuthorsList.includes(a)) {
            coAuthorsList.push(a);
          }
        }
        result = { author: firstAuthorNew, coAuthors: coAuthorsList };
      } else {
        if (nonMaintainers.length > 0) {
          const firstAuthorNew = nonMaintainers[0];
          const coAuthorsList = nonMaintainers.filter(a => a !== firstAuthorNew);
          result = { author: firstAuthorNew, coAuthors: coAuthorsList };
        } else {
          const firstAuthorNew = uniqueAuthors.length > 0 ? uniqueAuthors[uniqueAuthors.length - 1] : '';
          result = { author: firstAuthorNew, coAuthors: [] };
        }
      }
    } else {
      if (nonMaintainers.length > 0) {
        const firstAuthorNew = nonMaintainers[nonMaintainers.length - 1];
        const coAuthorsList = nonMaintainers.filter(a => a !== firstAuthorNew);
        for (const a of nonMaintainerCoauthors) {
          if (!coAuthorsList.includes(a)) {
            coAuthorsList.push(a);
          }
        }
        result = { author: firstAuthorNew, coAuthors: coAuthorsList };
      } else {
        if (nonMaintainerCoauthors.length > 0) {
          const firstAuthorNew = nonMaintainerCoauthors[nonMaintainerCoauthors.length - 1];
          const coAuthorsList = nonMaintainerCoauthors.filter(a => a !== firstAuthorNew);
          result = { author: firstAuthorNew, coAuthors: coAuthorsList };
        } else {
          const firstAuthorNew = uniqueAuthors.length > 0 ? uniqueAuthors[uniqueAuthors.length - 1] : '';
          result = { author: firstAuthorNew, coAuthors: [] };
        }
      }
    }

    cache.set(cacheKey, result);
    return result;
  } catch {
    const result = { author: '', coAuthors: [] };
    cache.set(cacheKey, result);
    return result;
  }
}

export async function getArticleDates(
  repoCwd: string,
  relPath: string,
  maintainers: string[]
): Promise<{ created: string | null; lastmod: string | null }> {
  const cacheKey = getCacheKey(repoCwd, relPath, 'dates');
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  try {
    const { stdout } = await execFileAsync(
      'git',
      ['log', '--follow', '--format=%aI%x09%an', '--', relPath],
      { cwd: repoCwd, encoding: 'utf-8' }
    );

    const lines = stdout.trim().split('\n').filter(l => l.trim());
    const dates: string[] = [];
    const allDates: string[] = [];

    for (const line of lines) {
      if (!line.includes('\t')) continue;
      const [date, author] = line.split('\t', 2);
      allDates.push(date);
      if (!maintainers.includes(author)) {
        dates.push(date);
      }
    }

    let result: { created: string | null; lastmod: string | null };
    if (dates.length === 0) {
      if (allDates.length > 0) {
        result = { created: allDates[allDates.length - 1], lastmod: allDates[0] };
      } else {
        result = { created: null, lastmod: null };
      }
    } else {
      result = { created: dates[dates.length - 1], lastmod: dates[0] };
    }

    cache.set(cacheKey, result);
    return result;
  } catch {
    const result = { created: null, lastmod: null };
    cache.set(cacheKey, result);
    return result;
  }
}

export async function isAncestor(
  repoCwd: string,
  ancestorSha: string,
  descendantRef: string
): Promise<boolean> {
  try {
    await execFileAsync(
      'git',
      ['merge-base', '--is-ancestor', ancestorSha, descendantRef],
      { cwd: repoCwd }
    );
    return true;
  } catch {
    return false;
  }
}

export async function getHeadSha(repoCwd: string): Promise<string> {
  const cacheKey = `${repoCwd}:head`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  try {
    const { stdout } = await execFileAsync(
      'git',
      ['rev-parse', 'HEAD'],
      { cwd: repoCwd, encoding: 'utf-8' }
    );
    const sha = stdout.trim();
    cache.set(cacheKey, sha);
    return sha;
  } catch {
    return '';
  }
}
