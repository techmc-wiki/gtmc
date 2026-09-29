import type * as Nucleation from "nucleation"

type NucleationModule = typeof Nucleation
type ResourcePack = InstanceType<NucleationModule["ResourcePack"]>

let sharedPackPromise: Promise<ResourcePack> | null = null

/** Share one parse and byte-array conversion across all viewers on the page. */
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
