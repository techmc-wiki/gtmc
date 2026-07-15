import { revalidatePath } from "next/cache"

export const PATHS = {
  DRAFT: "/draft",
  REVIEW: "/review",
  PROFILE: "/profile",
  HOME: "/",
} as const

export function revalidatePaths(paths: string[]): void {
  for (const path of paths) {
    revalidatePath(path)
  }
}
