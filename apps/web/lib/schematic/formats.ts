import type * as Nucleation from "nucleation"

type NucleationModule = typeof Nucleation
type Schematic = InstanceType<NucleationModule["Schematic"]>

/** Nucleation exposes loaders only as constructor names, so extensions must map explicitly. */
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
