import {
  EXPLANATION_END,
  EXPLANATION_START,
  METADATA_END,
  METADATA_START,
} from "./constants"

export interface IssueMetadata {
  appUserId: string
  authorName: string | null
  authorEmail: string | null
  assigneeId?: string
  assigneeName?: string | null
  assigneeEmail?: string | null
}

export interface CommentMetadata {
  appUserId: string
  authorName: string | null
  authorEmail: string | null
  emailRedacted?: boolean
}

const COMMENT_META_PREFIX = "<!-- GTMC_COMMENT_META "
const COMMENT_META_SUFFIX = " -->"

function serializeMetadata(metadata: IssueMetadata | CommentMetadata): string {
  const serialized: {
    appUserId: string
    authorName: string | null
    authorEmail: string | null
    assigneeId?: string
    assigneeName?: string | null
    assigneeEmail?: string | null
    emailRedacted?: boolean
  } = {
    appUserId: metadata.appUserId,
    authorName: metadata.authorName,
    authorEmail: metadata.authorEmail,
  }

  if (
    "assigneeId" in metadata &&
    typeof metadata.assigneeId === "string" &&
    metadata.assigneeId.trim().length > 0
  ) {
    serialized.assigneeId = metadata.assigneeId
    serialized.assigneeName =
      typeof metadata.assigneeName === "string" ? metadata.assigneeName : null
    serialized.assigneeEmail =
      typeof metadata.assigneeEmail === "string" ? metadata.assigneeEmail : null
  }

  if ("emailRedacted" in metadata && metadata.emailRedacted === true) {
    serialized.emailRedacted = true
  }

  return JSON.stringify(serialized)
}

function parseMetadata<T extends IssueMetadata | CommentMetadata>(
  json: string
): T | null {
  try {
    const parsed = JSON.parse(json)
    if (typeof parsed !== "object" || parsed === null) {
      return null
    }
    if (typeof parsed.appUserId !== "string") {
      return null
    }
    const result: Record<string, unknown> = {
      appUserId: parsed.appUserId,
      authorName:
        typeof parsed.authorName === "string" ? parsed.authorName : null,
      authorEmail:
        typeof parsed.authorEmail === "string" ? parsed.authorEmail : null,
      assigneeId:
        typeof parsed.assigneeId === "string" ? parsed.assigneeId : undefined,
      assigneeName:
        typeof parsed.assigneeName === "string" ? parsed.assigneeName : null,
      assigneeEmail:
        typeof parsed.assigneeEmail === "string" ? parsed.assigneeEmail : null,
    }
    if (typeof parsed.emailRedacted === "boolean") {
      result.emailRedacted = parsed.emailRedacted
    }
    return result as T
  } catch {
    return null
  }
}

export function serializeIssueBody(
  userContent: string,
  metadata: IssueMetadata,
  explanation?: string
): string {
  const metaBlock = `${METADATA_START}\n${serializeMetadata(metadata)}\n${METADATA_END}`

  let body = `${metaBlock}\n\n${userContent}`

  if (explanation) {
    body += `\n\n${EXPLANATION_START}\n${explanation}\n${EXPLANATION_END}`
  }

  return body
}

export function parseIssueBody(body: string): {
  userContent: string
  metadata: IssueMetadata | null
  explanation: string | null
  parseError?: string
} {
  const fallback = {
    userContent: body,
    metadata: null as IssueMetadata | null,
    explanation: null as string | null,
  }

  if (!body) {
    return fallback
  }

  const metaStartIdx = body.indexOf(METADATA_START)
  if (metaStartIdx === -1) {
    return { ...fallback, parseError: "Metadata block not found" }
  }

  const metaJsonStart = metaStartIdx + METADATA_START.length
  const metaEndIdx = body.indexOf(METADATA_END, metaJsonStart)
  if (metaEndIdx === -1) {
    return { ...fallback, parseError: "Metadata block not closed" }
  }

  const metaJson = body.slice(metaJsonStart, metaEndIdx).trim()
  const metadata = parseMetadata<IssueMetadata>(metaJson)
  if (!metadata) {
    return {
      ...fallback,
      parseError: `Invalid metadata JSON: ${metaJson}`,
    }
  }

  const afterMeta = body.slice(metaEndIdx + METADATA_END.length)

  let userContent: string
  let explanation: string | null = null

  const explStartIdx = afterMeta.indexOf(EXPLANATION_START)
  if (explStartIdx !== -1) {
    const explJsonStart = explStartIdx + EXPLANATION_START.length
    const explEndIdx = afterMeta.indexOf(EXPLANATION_END, explJsonStart)
    if (explEndIdx !== -1) {
      explanation = afterMeta.slice(explJsonStart, explEndIdx).trim()
      if (!explanation) {
        explanation = null
      }
      userContent = afterMeta.slice(0, explStartIdx).trim()
    } else {
      userContent = afterMeta.trim()
    }
  } else {
    userContent = afterMeta.trim()
  }

  return { userContent, metadata, explanation }
}

export function serializeCommentBody(
  content: string,
  metadata?: CommentMetadata
): string {
  if (!metadata) {
    return content
  }

  const metaLine = `${COMMENT_META_PREFIX}${serializeMetadata(metadata)}${COMMENT_META_SUFFIX}`
  return `${metaLine}\n\n${content}`
}

export function parseCommentBody(body: string): {
  content: string
  metadata: CommentMetadata | null
} {
  if (!body) {
    return { content: body, metadata: null }
  }

  const firstNewline = body.indexOf("\n")
  const firstLine = firstNewline === -1 ? body : body.slice(0, firstNewline)

  if (
    !firstLine.startsWith(COMMENT_META_PREFIX) ||
    !firstLine.endsWith(COMMENT_META_SUFFIX)
  ) {
    return { content: body, metadata: null }
  }

  const json = firstLine.slice(
    COMMENT_META_PREFIX.length,
    firstLine.length - COMMENT_META_SUFFIX.length
  )
  const metadata = parseMetadata<CommentMetadata>(json)

  if (!metadata) {
    return { content: body, metadata: null }
  }

  const rest = body.slice(firstNewline === -1 ? body.length : firstNewline + 1)
  const content = rest.replace(/^\n/, "")
  const contentWithoutAuthorMarker = content.replace(
    /^<!-- GTMC_COMMENT_AUTHOR_LINE -->\n/,
    ""
  )
  const contentWithoutAttribution = contentWithoutAuthorMarker.replace(
    /^(?:\[By\]:|By:|\*\*By:\*\*|\> \*\*\[BY\]\*\*(?:\s*:)?)[^\n]*\n\n/,
    ""
  )

  return { content: contentWithoutAttribution, metadata }
}

export function createMetadataFromSession(session: {
  user: { id: string; name?: string | null; email?: string | null }
}): IssueMetadata {
  return {
    appUserId: session.user.id,
    authorName: session.user.name ?? null,
    authorEmail: session.user.email ?? null,
  }
}
