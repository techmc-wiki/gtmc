import { get, put } from "@vercel/blob"
import { z } from "zod"
import { draftBlobOptions, draftPath } from "@/lib/drafts/store"

export const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  image: z.union([z.url(), z.literal("")]),
})

export async function readProfile(userId: string) {
  const result = await get(profilePath(userId), {
    ...draftBlobOptions(),
    access: "private",
    useCache: false,
  })
  return result
    ? profileSchema.parse(await new Response(result.stream).json())
    : null
}

export async function writeProfile(
  userId: string,
  profile: z.infer<typeof profileSchema>
) {
  await put(profilePath(userId), JSON.stringify(profileSchema.parse(profile)), {
    ...draftBlobOptions(),
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  })
}

function profilePath(userId: string) {
  return draftPath(userId, "profile").replace("drafts/", "profiles/")
}
