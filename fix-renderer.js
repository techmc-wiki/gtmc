const fs = require("fs")
let code = fs.readFileSync("litematica-renderer/src/renderer.ts", "utf8")

const newFunc = `  private async _getGeometryAndMaterialsForBlock(blockStateName: string): Promise<{ geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[] }> {
    // blockStateName might be "minecraft:oak_log[axis=y]"
    const parsedBlock = blockStateName.match(/minecraft:([^\[]+)(?:\\[(.*)\\])?/);
    const cleanName = parsedBlock ? parsedBlock[1] : blockStateName.replace('minecraft:', '').split('[')[0];
    const propertiesStr = parsedBlock && parsedBlock[2] ? parsedBlock[2] : '';

    let targetModelName = cleanName;
    let rx = 0, ry = 0;

    // Resolve variants + rotation
    const stateJson = await this._fetchJSON('blockstates', cleanName);
    if (stateJson) {
      let matchedModelObj: any = null;
      if (stateJson.variants) {
        let variant = stateJson.variants[propertiesStr] || stateJson.variants[''];
        if (!variant) {
          const firstKey = Object.keys(stateJson.variants)[0];
          if (firstKey) variant = stateJson.variants[firstKey];
        }
        if (variant) {
           matchedModelObj = Array.isArray(variant) ? variant[0] : variant;
        }
      } else if (stateJson.multipart && stateJson.multipart.length > 0) {
        const applyEntry = stateJson.multipart[0].apply;
        matchedModelObj = Array.isArray(applyEntry) ? applyEntry[0] : applyEntry;
      }

      if (matchedModelObj) {
        if (matchedModelObj.model) targetModelName = matchedModelObj.model.replace('minecraft:', '').replace('block/', '');
        if (matchedModelObj.x) rx = matchedModelObj.x;
        if (matchedModelObj.y) ry = matchedModelObj.y;
      }
    }

    const { geometry, material } = await this._resolveGeometryAndMaterialsFromModel(targetModelName, cleanName);

    // Apply blockstate rotation if any
    if (rx !== 0) geometry.rotateX(THREE.MathUtils.degToRad(rx));
    if (ry !== 0) geometry.rotateY(THREE.MathUtils.degToRad(-ry));

    return { geometry, material };
  }
`

code = code.replace(/  public async load\(/, newFunc + "\n  public async load(")

code = code.replace(
  /const material = await this\._getMaterialsForBlock\(blockStateName\);\s*\n\s*\/\/ ���� InstancedMesh �� palette/g,
  "const { geometry, material } = await this._getGeometryAndMaterialsForBlock(blockStateName);\n\n        // ���� InstancedMesh �� palette"
)

// Also swap standard THREE.InstancedMesh(this.boxGeometry to dynamic geometry
code = code.replace(
  /new THREE\.InstancedMesh\(this\.boxGeometry, material, count\);/g,
  "new THREE.InstancedMesh(geometry, material, count);"
)

fs.writeFileSync("litematica-renderer/src/renderer.ts", code)
