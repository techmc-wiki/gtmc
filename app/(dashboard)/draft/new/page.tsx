import { auth } from "@/lib/auth"
import { getMainBranchHeadSha } from "@/lib/article-submission"
import { getRepoFileContent } from "@/lib/github/sync"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"

export default async function NewDraftPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login")
  }

  const { file: fileParam } = await searchParams
  const filePath = typeof fileParam === "string" ? fileParam : undefined

  let initialTitle = "UNTITLED"
  let initialContent = ""
  let normalizedFilePath = filePath

  if (filePath) {
    initialTitle = filePath
    const normalizedPath = filePath.replace(/^\/+/, "")
    const candidates = normalizedPath.endsWith(".md")
      ? [normalizedPath]
      : [normalizedPath, `${normalizedPath}.md`]

    for (const candidate of candidates) {
      const content = await getRepoFileContent(candidate)
      if (content !== null) {
        initialContent = content
        break
      }
    }

    if (!initialContent) {
      initialContent = ""
    }
  }

  const token =
    (session.user as { githubPat?: string }).githubPat ||
    process.env.GITHUB_TOKEN
  const baseMainSha = await getMainBranchHeadSha(token)
  const createData = {
    author: { connect: { id: session.user.id } },
    baseMainSha,
    content: initialContent,
    filePath: normalizedFilePath,
    status: "DRAFT",
    syncedMainSha: baseMainSha,
    title: initialTitle,
  }
  const draft = await prisma.revision.create({
    data: createData,
  })

  redirect(`/draft/${draft.id}`)
}
