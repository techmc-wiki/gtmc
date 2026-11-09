import { get, put } from "@vercel/blob"
import { z } from "zod"
import {
  assertPrivateBlobIdentifier,
  privateBlobOptions,
} from "@/lib/blob-stores"

export const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  image: z.union([z.url(), z.literal("")]),
})

export async function readProfile(userId: string) {
  const result = await get(profilePath(userId), {
    ...privateBlobOptions(),
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
    ...privateBlobOptions(),
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  })
}

function profilePath(userId: string) {
  assertPrivateBlobIdentifier(userId)
  return `profiles/${userId}/profile.json`
}
