export interface GithubIssue {
  number: number;
  title: string;
  body: string;
  state: "open" | "closed";
  labels: string[];
  assignees: string[];
  createdAt: string;
  updatedAt: string;
  htmlUrl: string;
}

export interface GithubComment {
  id: number;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export type GithubFeaturesErrorCode =
  | "CONFIG_MISSING"
  | "AUTH_FAILED"
  | "RATE_LIMITED"
  | "API_ERROR"
  | "NETWORK_ERROR"
  | "INVALID_RESPONSE";

export interface GithubFeaturesErrorObject {
  code: GithubFeaturesErrorCode;
  message: string;
  status?: number;
  details?: unknown;
}

export class GithubFeaturesError
  extends Error
  implements GithubFeaturesErrorObject
{
  code: GithubFeaturesErrorCode;
  status?: number;
  details?: unknown;

  constructor(params: GithubFeaturesErrorObject) {
    super(params.message);
    this.name = "GithubFeaturesError";
    this.code = params.code;
    this.status = params.status;
    this.details = params.details;
  }
}

interface GithubRepoConfig {
  owner: string;
  repo: string;
  token: string;
}

interface GithubLabel {
  name?: string;
}

interface GithubAssignee {
  login?: string;
}

interface GithubIssueResponse {
  number?: number;
  title?: string;
  body?: string | null;
  state?: "open" | "closed";
  labels?: Array<GithubLabel | string>;
  assignees?: GithubAssignee[];
  created_at?: string;
  updated_at?: string;
  html_url?: string;
  pull_request?: unknown;
}

interface GithubCommentResponse {
  id?: number;
  body?: string | null;
  created_at?: string;
  updated_at?: string;
}

const GITHUB_API_BASE = "https://api.github.com";
const GITHUB_ACCEPT_HEADER = "application/vnd.github.v3+json";

function getGithubRepoConfig(): GithubRepoConfig {
  const owner = process.env.GITHUB_REPO_OWNER;
  const repo = process.env.GITHUB_REPO_NAME;
  const token = process.env.GITHUB_FEATURES_ISSUES_PAT;

  if (!owner || !repo || !token) {
    throw new GithubFeaturesError({
      code: "CONFIG_MISSING",
      message:
        "Missing GitHub configuration. Required env vars: GITHUB_REPO_OWNER, GITHUB_REPO_NAME, GITHUB_FEATURES_ISSUES_PAT.",
    });
  }

  return { owner, repo, token };
}

function getGithubWriteToken(): string {
  const token = process.env.GITHUB_FEATURES_WRITE_PAT;
  if (!token) {
    throw new GithubFeaturesError({
      code: "CONFIG_MISSING",
      message:
        "Missing GitHub write configuration. Required env var: GITHUB_FEATURES_WRITE_PAT.",
    });
  }
  return token;
}

function getRepoIssuesBaseUrl(config: GithubRepoConfig): string {
  return `${GITHUB_API_BASE}/repos/${config.owner}/${config.repo}/issues`;
}

function parseJsonSafely(text: string): unknown {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function parseErrorMessage(details: unknown): string | undefined {
  if (!details || typeof details !== "object") {
    return undefined;
  }

  const candidate = details as { message?: unknown; error?: unknown };
  if (typeof candidate.message === "string") {
    return candidate.message;
  }

  if (typeof candidate.error === "string") {
    return candidate.error;
  }

  return undefined;
}

function isRateLimited(response: Response, details: unknown): boolean {
  if (response.status === 429) {
    return true;
  }

  if (response.status !== 403) {
    return false;
  }

  if (response.headers.get("x-ratelimit-remaining") === "0") {
    return true;
  }

  const message = parseErrorMessage(details);
  return typeof message === "string" && /rate limit/i.test(message);
}

function normalizeIssue(raw: GithubIssueResponse): GithubIssue {
  if (
    typeof raw.number !== "number" ||
    typeof raw.title !== "string" ||
    typeof raw.state !== "string" ||
    typeof raw.created_at !== "string" ||
    typeof raw.updated_at !== "string" ||
    typeof raw.html_url !== "string"
  ) {
    throw new GithubFeaturesError({
      code: "INVALID_RESPONSE",
      message: "GitHub API returned an invalid issue response shape.",
      details: raw,
    });
  }

  return {
    number: raw.number,
    title: raw.title,
    body: raw.body ?? "",
    state: raw.state === "closed" ? "closed" : "open",
    labels: (raw.labels ?? [])
      .map((label) => {
        if (typeof label === "string") {
          return label;
        }
        return label.name ?? "";
      })
      .filter(Boolean),
    assignees: (raw.assignees ?? [])
      .map((assignee) => assignee.login ?? "")
      .filter(Boolean),
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    htmlUrl: raw.html_url,
  };
}

function normalizeComment(raw: GithubCommentResponse): GithubComment {
  if (
    typeof raw.id !== "number" ||
    typeof raw.created_at !== "string" ||
    typeof raw.updated_at !== "string"
  ) {
    throw new GithubFeaturesError({
      code: "INVALID_RESPONSE",
      message: "GitHub API returned an invalid comment response shape.",
      details: raw,
    });
  }

  return {
    id: raw.id,
    body: raw.body ?? "",
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

function parseNextLink(linkHeader: string | null): string | null {
  if (!linkHeader) {
    return null;
  }

  const parts = linkHeader.split(",");
  for (const part of parts) {
    const trimmed = part.trim();
    const match = trimmed.match(/<([^>]+)>;\s*rel="([^"]+)"/);
    if (match && match[2] === "next") {
      return match[1];
    }
  }

  return null;
}

async function requestGithub<T>(
  url: string,
  init: RequestInit,
  options?: { allow404?: boolean },
  tokenOverride?: string,
): Promise<{ data: T | null; response: Response }> {
  const config = getGithubRepoConfig();

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        Accept: GITHUB_ACCEPT_HEADER,
        Authorization: `token ${tokenOverride ?? config.token}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });
  } catch (error) {
    throw new GithubFeaturesError({
      code: "NETWORK_ERROR",
      message: "GitHub API request failed due to a network error.",
      details: error,
    });
  }

  const text = await response.text();
  const parsed = parseJsonSafely(text);

  if (options?.allow404 && response.status === 404) {
    return { data: null, response };
  }

  if (response.status === 401 || response.status === 403) {
    if (isRateLimited(response, parsed)) {
      throw new GithubFeaturesError({
        code: "RATE_LIMITED",
        message: "GitHub rate limit exceeded",
        status: response.status,
        details: parsed,
      });
    }

    throw new GithubFeaturesError({
      code: "AUTH_FAILED",
      message: "GitHub API authorization failed",
      status: response.status,
      details: parsed,
    });
  }

  if (isRateLimited(response, parsed)) {
    throw new GithubFeaturesError({
      code: "RATE_LIMITED",
      message: "GitHub rate limit exceeded",
      status: response.status,
      details: parsed,
    });
  }

  if (!response.ok) {
    const apiMessage = parseErrorMessage(parsed);
    throw new GithubFeaturesError({
      code: "API_ERROR",
      message: `GitHub API request failed with status ${response.status}${apiMessage ? `: ${apiMessage}` : ""}`,
      status: response.status,
      details: parsed,
    });
  }

  return { data: parsed as T, response };
}

export async function listAllIssues(
  state: "open" | "closed" | "all" = "open",
): Promise<GithubIssue[]> {
  const config = getGithubRepoConfig();
  const baseUrl = getRepoIssuesBaseUrl(config);

  const allIssues: GithubIssue[] = [];
  let nextUrl: string | null = `${baseUrl}?state=${state}&per_page=100&page=1`;

  while (nextUrl) {
    const { data, response } = await requestGithub<GithubIssueResponse[]>(
      nextUrl,
      {
        method: "GET",
      },
    );

    const pageItems = Array.isArray(data) ? data : [];
    const filteredItems = pageItems.filter((item) => !item.pull_request);
    allIssues.push(...filteredItems.map(normalizeIssue));

    nextUrl = parseNextLink(response.headers.get("link"));
  }

  return allIssues;
}

export const listIssues = listAllIssues;

export async function getIssue(
  issueNumber: number,
): Promise<GithubIssue | null> {
  const config = getGithubRepoConfig();
  const url = `${getRepoIssuesBaseUrl(config)}/${issueNumber}`;

  const { data } = await requestGithub<GithubIssueResponse>(
    url,
    { method: "GET" },
    { allow404: true },
  );

  if (!data) {
    return null;
  }

  if (data.pull_request) {
    return null;
  }

  return normalizeIssue(data);
}

export async function createIssue(
  title: string,
  body: string,
  labels: string[] = [],
): Promise<GithubIssue> {
  const config = getGithubRepoConfig();
  const url = getRepoIssuesBaseUrl(config);
  const payload: { title: string; body: string; labels?: string[] } = {
    title,
    body,
  };

  if (labels.length > 0) {
    payload.labels = labels;
  }

  const { data } = await requestGithub<GithubIssueResponse>(url, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!data) {
    throw new GithubFeaturesError({
      code: "INVALID_RESPONSE",
      message: "GitHub API returned empty response for createIssue.",
    });
  }

  return normalizeIssue(data);
}

export async function updateIssue(
  issueNumber: number,
  data: {
    title?: string;
    body?: string;
    state?: "open" | "closed";
    labels?: string[];
  },
): Promise<GithubIssue> {
  const config = getGithubRepoConfig();
  const url = `${getRepoIssuesBaseUrl(config)}/${issueNumber}`;

  const { data: issue } = await requestGithub<GithubIssueResponse>(url, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

  if (!issue) {
    throw new GithubFeaturesError({
      code: "INVALID_RESPONSE",
      message: "GitHub API returned empty response for updateIssue.",
    });
  }

  return normalizeIssue(issue);
}

export async function addIssueComment(
  issueNumber: number,
  body: string,
): Promise<GithubComment> {
  const config = getGithubRepoConfig();
  const url = `${getRepoIssuesBaseUrl(config)}/${issueNumber}/comments`;

  const { data } = await requestGithub<GithubCommentResponse>(url, {
    method: "POST",
    body: JSON.stringify({ body }),
  });

  if (!data) {
    throw new GithubFeaturesError({
      code: "INVALID_RESPONSE",
      message: "GitHub API returned empty response for addIssueComment.",
    });
  }

  return normalizeComment(data);
}

export async function listIssueComments(
  issueNumber: number,
): Promise<GithubComment[]> {
  const config = getGithubRepoConfig();
  const baseUrl = `${getRepoIssuesBaseUrl(config)}/${issueNumber}/comments`;

  const allComments: GithubComment[] = [];
  let nextUrl: string | null = `${baseUrl}?per_page=100&page=1`;

  while (nextUrl) {
    const { data, response } = await requestGithub<GithubCommentResponse[]>(
      nextUrl,
      {
        method: "GET",
      },
    );

    const pageItems = Array.isArray(data) ? data : [];
    allComments.push(...pageItems.map(normalizeComment));

    nextUrl = parseNextLink(response.headers.get("link"));
  }

  return allComments;
}

export async function ensureLabel(
  name: string,
  color = "ededed",
): Promise<void> {
  const config = getGithubRepoConfig();
  const url = `${GITHUB_API_BASE}/repos/${config.owner}/${config.repo}/labels`;

  try {
    await requestGithub(url, {
      method: "POST",
      body: JSON.stringify({ name, color }),
    });
  } catch (error) {
    if (
      error instanceof GithubFeaturesError &&
      error.code === "API_ERROR" &&
      (error.status === 409 || error.status === 422)
    ) {
      return;
    }
    throw error;
  }
}

export async function setIssueLabels(
  issueNumber: number,
  labels: string[],
): Promise<void> {
  const config = getGithubRepoConfig();
  const url = `${getRepoIssuesBaseUrl(config)}/${issueNumber}/labels`;

  await requestGithub(url, {
    method: "PUT",
    body: JSON.stringify({ labels }),
  });
}

export async function setIssueState(
  issueNumber: number,
  state: "open" | "closed",
): Promise<void> {
  const config = getGithubRepoConfig();
  const url = `${getRepoIssuesBaseUrl(config)}/${issueNumber}`;

  await requestGithub(url, {
    method: "PATCH",
    body: JSON.stringify({ state }),
  });
}

export async function setIssueAssignees(
  issueNumber: number,
  assignees: string[],
): Promise<void> {
  const config = getGithubRepoConfig();
  const url = `${getRepoIssuesBaseUrl(config)}/${issueNumber}`;

  await requestGithub(url, {
    method: "PATCH",
    body: JSON.stringify({ assignees }),
  });
}

// ---------------------------------------------------------------------------
// Identity metadata serialization / deserialization
// ---------------------------------------------------------------------------

export interface IssueMetadata {
  appUserId: string;
  authorName: string | null;
  authorEmail: string | null;
  assigneeId?: string;
  assigneeName?: string | null;
  assigneeEmail?: string | null;
}

export interface CommentMetadata {
  appUserId: string;
  authorName: string | null;
  authorEmail: string | null;
}

const METADATA_START = "<!-- GTMC_METADATA";
const METADATA_END = "-->";
const EXPLANATION_START = "<!-- GTMC_EXPLANATION";
const EXPLANATION_END = "-->";
const COMMENT_META_PREFIX = "<!-- GTMC_COMMENT_META ";
const COMMENT_META_SUFFIX = " -->";

// ---- Helpers ----------------------------------------------------------------

function serializeMetadata(metadata: IssueMetadata | CommentMetadata): string {
  const serialized: {
    appUserId: string;
    authorName: string | null;
    authorEmail: string | null;
    assigneeId?: string;
    assigneeName?: string | null;
    assigneeEmail?: string | null;
  } = {
    appUserId: metadata.appUserId,
    authorName: metadata.authorName,
    authorEmail: metadata.authorEmail,
  };

  if (
    "assigneeId" in metadata &&
    typeof metadata.assigneeId === "string" &&
    metadata.assigneeId.trim().length > 0
  ) {
    serialized.assigneeId = metadata.assigneeId;
    serialized.assigneeName =
      typeof metadata.assigneeName === "string" ? metadata.assigneeName : null;
    serialized.assigneeEmail =
      typeof metadata.assigneeEmail === "string"
        ? metadata.assigneeEmail
        : null;
  }

  return JSON.stringify(serialized);
}

function parseMetadata<T extends IssueMetadata | CommentMetadata>(
  json: string,
): T | null {
  try {
    const parsed = JSON.parse(json);
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }
    if (typeof parsed.appUserId !== "string") {
      return null;
    }
    return {
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
    } as T;
  } catch {
    return null;
  }
}

// ---- Issue body -------------------------------------------------------------

export function serializeIssueBody(
  userContent: string,
  metadata: IssueMetadata,
  explanation?: string,
): string {
  const metaBlock = `${METADATA_START}\n${serializeMetadata(metadata)}\n${METADATA_END}`;

  let body = `${metaBlock}\n\n${userContent}`;

  if (explanation) {
    body += `\n\n${EXPLANATION_START}\n${explanation}\n${EXPLANATION_END}`;
  }

  return body;
}

export function parseIssueBody(body: string): {
  userContent: string;
  metadata: IssueMetadata | null;
  explanation: string | null;
  parseError?: string;
} {
  const fallback = {
    userContent: body,
    metadata: null as IssueMetadata | null,
    explanation: null as string | null,
  };

  if (!body) {
    return fallback;
  }

  const metaStartIdx = body.indexOf(METADATA_START);
  if (metaStartIdx === -1) {
    return { ...fallback, parseError: "Metadata block not found" };
  }

  const metaJsonStart = metaStartIdx + METADATA_START.length;
  const metaEndIdx = body.indexOf(METADATA_END, metaJsonStart);
  if (metaEndIdx === -1) {
    return { ...fallback, parseError: "Metadata block not closed" };
  }

  const metaJson = body.slice(metaJsonStart, metaEndIdx).trim();
  const metadata = parseMetadata<IssueMetadata>(metaJson);
  if (!metadata) {
    return {
      ...fallback,
      parseError: `Invalid metadata JSON: ${metaJson}`,
    };
  }

  const afterMeta = body.slice(metaEndIdx + METADATA_END.length);

  let userContent: string;
  let explanation: string | null = null;

  const explStartIdx = afterMeta.indexOf(EXPLANATION_START);
  if (explStartIdx !== -1) {
    const explJsonStart = explStartIdx + EXPLANATION_START.length;
    const explEndIdx = afterMeta.indexOf(EXPLANATION_END, explJsonStart);
    if (explEndIdx !== -1) {
      explanation = afterMeta.slice(explJsonStart, explEndIdx).trim();
      if (!explanation) {
        explanation = null;
      }
      userContent = afterMeta.slice(0, explStartIdx).trim();
    } else {
      userContent = afterMeta.trim();
    }
  } else {
    userContent = afterMeta.trim();
  }

  return { userContent, metadata, explanation };
}

// ---- Comment body -----------------------------------------------------------

export function serializeCommentBody(
  content: string,
  metadata?: CommentMetadata,
): string {
  if (!metadata) {
    return content;
  }

  const metaLine = `${COMMENT_META_PREFIX}${serializeMetadata(metadata)}${COMMENT_META_SUFFIX}`;
  return `${metaLine}\n\n${content}`;
}

export function parseCommentBody(body: string): {
  content: string;
  metadata: CommentMetadata | null;
} {
  if (!body) {
    return { content: body, metadata: null };
  }

  const firstNewline = body.indexOf("\n");
  const firstLine = firstNewline === -1 ? body : body.slice(0, firstNewline);

  if (
    !firstLine.startsWith(COMMENT_META_PREFIX) ||
    !firstLine.endsWith(COMMENT_META_SUFFIX)
  ) {
    return { content: body, metadata: null };
  }

  const json = firstLine.slice(
    COMMENT_META_PREFIX.length,
    firstLine.length - COMMENT_META_SUFFIX.length,
  );
  const metadata = parseMetadata<CommentMetadata>(json);

  if (!metadata) {
    return { content: body, metadata: null };
  }

  const rest = body.slice(firstNewline === -1 ? body.length : firstNewline + 1);
  const content = rest.replace(/^\n/, "");

  return { content, metadata };
}

export type AppFeatureStatus = "PENDING" | "IN_PROGRESS" | "RESOLVED";

export const APP_STATUS_LABELS = {
  PENDING: "status:pending",
  IN_PROGRESS: "status:in-progress",
  RESOLVED: "status:resolved",
} as const;

export const STATUS_LABEL_COLORS = {
  "status:pending": "fbca04",
  "status:in-progress": "0075ca",
  "status:resolved": "0e8a16",
} as const;

const STATUS_LABEL_PREFIX = "status:";

export const EXPLANATION_MARKER = "<!-- GTMC_EXPLANATION";
export const METADATA_MARKER = "<!-- GTMC_METADATA";
export const SYSTEM_COMMENT_MARKER = "<!-- GTMC_SYSTEM_ASSIGNMENT -->";

export function serializeSystemComment(content: string): string {
  return `${SYSTEM_COMMENT_MARKER}\n\n${content}`;
}

export async function getGithubLoginByAccountId(
  accountId: string,
): Promise<string | null> {
  // Guard against non-numeric input
  if (isNaN(Number(accountId))) {
    return null;
  }

  try {
    const { data } = await requestGithub<{
      login: string;
      id: number;
      [key: string]: unknown;
    }>(`https://api.github.com/user/${accountId}`, {
      method: "GET",
    });

    if (!data || !data.login) {
      return null;
    }

    return data.login;
  } catch {
    return null;
  }
}

export function statusToLabels(status: string): string[] {
  // Each app status maps to exactly one status:* label.
  if (status === "PENDING") {
    return [APP_STATUS_LABELS.PENDING];
  }

  if (status === "IN_PROGRESS") {
    return [APP_STATUS_LABELS.IN_PROGRESS];
  }

  if (status === "RESOLVED") {
    return [APP_STATUS_LABELS.RESOLVED];
  }

  throw new GithubFeaturesError({
    code: "API_ERROR",
    message: `Unknown feature status: ${status}`,
  });
}

export function labelsToStatus(labels: string[]): AppFeatureStatus {
  // Resolved takes precedence so closed issues map back to RESOLVED even if
  // stale labels are present.
  if (labels.includes(APP_STATUS_LABELS.RESOLVED)) {
    return "RESOLVED";
  }

  // In-progress is the only non-resolved active status label.
  if (labels.includes(APP_STATUS_LABELS.IN_PROGRESS)) {
    return "IN_PROGRESS";
  }

  // Defaulting to PENDING because no recognized status label was found — this
  // handles issues created outside the app.
  return "PENDING";
}

export function issueStateForStatus(status: string): "open" | "closed" {
  // Only RESOLVED closes the issue; all other statuses stay open.
  if (status === "RESOLVED") {
    return "closed";
  }

  return "open";
}

export function tagsToLabels(tags: string[]): string[] {
  return [...tags];
}

export function labelsToTags(labels: string[]): string[] {
  return labels.filter((label) => !label.startsWith(STATUS_LABEL_PREFIX));
}

// ---------------------------------------------------------------------------
// GitHub Contents API image upload
// ---------------------------------------------------------------------------

interface GithubContentsUploadResponse {
  content?: {
    download_url?: string | null;
    [key: string]: unknown;
  };
}

export async function uploadImageToGithub(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  folder: string,
): Promise<string> {
  // Validate MIME type
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!allowedMimeTypes.includes(mimeType)) {
    throw new GithubFeaturesError({
      code: "API_ERROR",
      message: "Only image files are accepted (JPEG, PNG, GIF, WebP).",
    });
  }

  // Validate MIME type by extension
  const extMatch = originalName.match(/\.([a-zA-Z0-9]+)$/);
  const ext = extMatch ? extMatch[1].toLowerCase() : "";
  const validExtensions = ["jpg", "jpeg", "png", "gif", "webp"];

  if (!validExtensions.includes(ext)) {
    throw new GithubFeaturesError({
      code: "API_ERROR",
      message: "Only image files are accepted (JPEG, PNG, GIF, WebP).",
    });
  }

  // Validate file size
  const maxSize = 10485760; // 10 MB
  if (buffer.length > maxSize) {
    throw new GithubFeaturesError({
      code: "API_ERROR",
      message: "Image exceeds maximum upload size of 10 MB.",
    });
  }

  // Get repo config
  const config = getGithubRepoConfig();

  // Generate filename: {timestamp}-{random}.{ext}
  const timestamp = Date.now();
  const random = Math.round(Math.random() * 1000);
  const filename = `${timestamp}-${random}.${ext}`;

  // Construct path
  const path = `${folder}/${filename}`;

  // Call GitHub Contents API
  const url = `${GITHUB_API_BASE}/repos/${config.owner}/${config.repo}/contents/${path}`;

  const writeToken = getGithubWriteToken();

  const { data } = await requestGithub<GithubContentsUploadResponse>(url, {
    method: "PUT",
    body: JSON.stringify({
      message: `Upload feature image: ${filename}`,
      content: buffer.toString("base64"),
    }),
  }, undefined, writeToken);

  // Validate response shape
  if (!data?.content?.download_url || typeof data.content.download_url !== "string") {
    throw new GithubFeaturesError({
      code: "INVALID_RESPONSE",
      message: "GitHub API returned an invalid contents upload response.",
      details: data,
    });
  }

  return data.content.download_url;
}
