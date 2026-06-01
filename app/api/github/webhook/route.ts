import { createHmac, timingSafeEqual } from "crypto"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { z } from "zod"

import { reconcileDraftAssetsForPRCompletion } from "@/lib/drafts/asset-db"
import {
  ARTICLES_REPO_NAME,
  ARTICLES_REPO_OWNER,
} from "@/lib/github/articles-repo"

const pullRequestWebhookSchema = z.object({
  action: z.string(),
  repository: z.object({
    owner: z.object({
      login: z.string(),
    }),
    name: z.string(),
  }),
  pull_request: z.object({
    number: z.number(),
    merged: z.boolean().optional(),
  }),
})

function parsePullRequestWebhook(
  body: string
):
  | { success: true; data: z.infer<typeof pullRequestWebhookSchema> }
  | { success: false } {
  try {
    const validated = pullRequestWebhookSchema.safeParse(JSON.parse(body))
    if (validated.success) {
      return { success: true, data: validated.data }
    }
  } catch {
    // Fall through to the shared invalid payload response.
  }

  return { success: false }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const event = req.headers.get("x-github-event")
  if (event !== "pull_request") {
    return NextResponse.json({ ok: true })
  }

  const body = await req.text()
  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET
  const signature = req.headers.get("x-hub-signature-256")

  if (webhookSecret) {
    if (!signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    const expectedSignature = `sha256=${createHmac("sha256", webhookSecret)
      .update(body)
      .digest("hex")}`

    const expectedBuffer = Buffer.from(expectedSignature, "utf8")
    const receivedBuffer = Buffer.from(signature, "utf8")

    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }
  }

  const validatedPayload = parsePullRequestWebhook(body)
  if (!validatedPayload.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  const payload = validatedPayload.data
  if (payload.action !== "closed") {
    return NextResponse.json({ ok: true })
  }

  if (
    payload.repository?.owner?.login !== ARTICLES_REPO_OWNER ||
    payload.repository?.name !== ARTICLES_REPO_NAME
  ) {
    return NextResponse.json({ ok: true })
  }

  const outcome =
    payload.pull_request?.merged === true ? "PR-merged" : "PR-closed"

  await reconcileDraftAssetsForPRCompletion({
    prNumber: payload.pull_request.number,
    outcome,
  })

  return NextResponse.json({ ok: true })
}
