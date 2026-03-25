import { revalidatePath } from "next/cache"

export function revalidatePaths(paths: string[]): void {
  for (const path of paths) {
    revalidatePath(path)
  }
}
