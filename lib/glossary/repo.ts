import { GLOSSARY_REPO, getGlossaryWriteToken } from "@/lib/github/repos"
import { getMainBranchHeadSha, getFileSnapshot } from "@/lib/github/branch"

export const GLOSSARY_MAIN_BRANCH = "main"
export const GLOSSARY_CSV_PATH = "TechMC Glossary.csv"

export async function getGlossaryMainSha(token?: string): Promise<string> {
  return getMainBranchHeadSha(token, GLOSSARY_REPO)
}

export async function getGlossaryCsvContent(token?: string): Promise<string> {
  const snapshot = await getFileSnapshot(
    GLOSSARY_CSV_PATH,
    GLOSSARY_MAIN_BRANCH,
    token,
    GLOSSARY_REPO
  )
  return snapshot?.content ?? ""
}

export async function getGlossaryWritePat(
  fallbackToken?: string | null
): Promise<string> {
  return getGlossaryWriteToken(fallbackToken)
}
