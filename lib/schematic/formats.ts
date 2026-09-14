import type * as Nucleation from "nucleation"

type NucleationModule = typeof Nucleation
type Schematic = InstanceType<NucleationModule["Schematic"]>

/**
 * Map a schematic file name to the matching Nucleation loader.
 *
 * Loader entry points are constructor names, which are not stable lookup
 * identifiers, so the dispatch stays an explicit switch instead of a table.
 */
export function loadSchematicByFileName(
  nuc: NucleationModule,
  fileName: string,
  data: Array<number>
): Schematic {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? ""

  switch (extension) {
    case "litematic":
      return nuc.Schematic.fromLitematic(data)
    case "schem":
    case "schematic":
      return nuc.Schematic.fromSchematic(data)
    case "nbt":
      return nuc.Schematic.fromSnapshot(data)
    case "mcstructure":
      return nuc.Schematic.fromMcstructure(data)
    case "mca":
      return nuc.Schematic.fromMca(data)
    case "zip":
      return nuc.Schematic.fromWorldZip(data)
    default:
      return nuc.Schematic.fromData(data)
  }
}
