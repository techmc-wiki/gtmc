import type * as Nucleation from "nucleation"

type NucleationModule = typeof Nucleation
type ResourcePack = InstanceType<NucleationModule["ResourcePack"]>

let sharedPackPromise: Promise<ResourcePack> | null = null

/**
 * Build the site resource pack once per page. Parsing `pack.zip` costs
 * ~100 ms plus a 6.6 MB `Array<number>` conversion, and multiple viewers
 * on one page must not repeat that work.
 */
export function getSharedResourcePack(
  nuc: NucleationModule
): Promise<ResourcePack> {
  sharedPackPromise ??= (async () => {
    const response = await fetch("/pack.zip")
    if (!response.ok) {
      throw new Error(
        `Failed to fetch pack.zip: ${response.status} ${response.statusText}`
      )
    }
    const bytes = new Uint8Array(await response.arrayBuffer())
    return nuc.ResourcePack.fromBytes([...bytes])
  })()

  return sharedPackPromise
}
