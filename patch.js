const fs = require("fs")

let code = fs.readFileSync("litematica-renderer/src/renderer.ts", "utf8")

// First replace the signature of _resolveGeometryAndMaterialsFromModel
code = code.replace(
  /private async _resolveGeometryAndMaterialsFromModel\(targetModelName: string, fallbackName: string\): Promise<\{ geometry: THREE\.BufferGeometry, material: THREE\.Material \| THREE\.Material\[\] \}>/,
  `private async _resolveGeometryAndMaterialsFromModel(targetModelName: string, fallbackName: string, elementsList: any[] = [], overrideTintColor: number | null = null): Promise<{ geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[] }>`
)

// But first, change how materials are initialized
code = code.replace(
  /color: tex \? 0xffffff : 0xcccccc,/g,
  "color: tex ? (overrideTintColor !== null ? overrideTintColor : 0xffffff) : 0xcccccc,"
)

// Allow multiple merged geometries array to come from param
// search for: if (!elements || elements.length === 0) {
code = code.replace(
  /if \(\!elements \|\| elements\.length === 0\) \{/g,
  `if (elementsList && elementsList.length > 0) elements = elementsList;\n    if (!elements || elements.length === 0) {`
)

// Map rotations properly on merged elements
code = code.replace(
  /const \[fX, fY, fZ\] = element\.from \|\| \[0,0,0\];/g,
  `const [fX, fY, fZ] = element.from || [0,0,0];\n      const rxPart = element.rx || 0;\n      const ryPart = element.ry || 0;`
)

// Inside elements apply part rotation
code = code.replace(
  /if \(axis === 'z'\) subGeom\.rotateZ\(angle \* Math\.PI \/ 180\);\n      \}/g,
  `if (axis === 'z') subGeom.rotateZ(angle * Math.PI / 180);\n      }\n\n      if (rxPart !== 0) subGeom.rotateX(rxPart * Math.PI / 180);\n      if (ryPart !== 0) subGeom.rotateY(-ryPart * Math.PI / 180);`
)

// Fix the "BufferGeometryUtils merge". Since we want to merge them manually without utils without introducing bugs... Wait, Litematica blocks instances, but standard geometries can be merged by manually copying position buffer? No, if we do not have Utils, we can just push all geometries and create ONE big BufferGeometry?! Actually BufferGeometryUtils is built into Three `examples/jsm/utils/BufferGeometryUtils.js`.
// Let's check if we can import it.
if (!code.includes("BufferGeometryUtils")) {
  code =
    `import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';\n` +
    code
}

// Replace the simple return finalGeometry logic
code = code.replace(
  /const finalGeometry = mergedGeometries\.length > 0 \? mergedGeometries\[0\] : this\.boxGeometry;/g,
  `const finalGeometry = mergedGeometries.length > 1 ? BufferGeometryUtils.mergeGeometries(mergedGeometries) : (mergedGeometries.length === 1 ? mergedGeometries[0] : this.boxGeometry);`
)

// Replace _getGeometryAndMaterialsForBlock entirely
const oldFuncRegex =
  /private async _getGeometryAndMaterialsForBlock[\s\S]+?return \{ geometry, material \};\n  \}/

const newFunc = `private async _getGeometryAndMaterialsForBlock(blockStateName: string): Promise<{ geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[] }> {
    const parsedBlock = blockStateName.match(/minecraft:([^[]+)(?:\\[(.*)\\])?/);
    const cleanName = parsedBlock ? parsedBlock[1] : blockStateName.replace('minecraft:', '').split('[')[0];
    const propertiesStr = parsedBlock && parsedBlock[2] ? parsedBlock[2] : '';

    const props: Record<string, string> = {};
    if (propertiesStr) {
      propertiesStr.split(',').forEach(kv => {
        const [k, v] = kv.split('=');
        if (k && v) props[k] = v;
      });
    }

    let rx = 0, ry = 0;
    let partsToRender: any[] = [];
    const stateJson = await this._fetchJSON('blockstates', cleanName);

    if (stateJson) {
      if (stateJson.variants) {
        let variant = stateJson.variants[propertiesStr] || stateJson.variants[''];
        if (!variant) {
          const firstKey = Object.keys(stateJson.variants)[0];
          if (firstKey) variant = stateJson.variants[firstKey];
        }
        if (variant) {
           partsToRender.push(Array.isArray(variant) ? variant[0] : variant);
        }
      } else if (stateJson.multipart && stateJson.multipart.length > 0) {
        stateJson.multipart.forEach((part: any) => {
          let match = true;
          if (part.when) {
            const checkConditions = (conditions: any): boolean => {
              if (conditions.OR) return conditions.OR.some((c: any) => checkConditions(c));
              if (conditions.AND) return conditions.AND.every((c: any) => checkConditions(c));
              for (const [k, v] of Object.entries(conditions)) {
                if (k === 'OR' || k === 'AND') continue;
                const currentVal = props[k];
                const expectedVals = String(v).split('|');
                if (!expectedVals.includes(currentVal)) {
                  return false;
                }
              }
              return true;
            };
            match = checkConditions(part.when);
          }
          if (match) {
            let applyEntry = part.apply;
            partsToRender.push(Array.isArray(applyEntry) ? applyEntry[0] : applyEntry);
          }
        });
      }
    }

    if (partsToRender.length === 0) {
       partsToRender.push({ model: cleanName, x: 0, y: 0 });
    }

    let defaultModelName = partsToRender[0].model ? partsToRender[0].model.replace('minecraft:', '').replace('block/', '') : cleanName;

    // Load geometry models for all matched parts, extracting their elements
    // This allows fences, walls, redstone wire to assemble their parts
    let combinedElements: any[] = [];
    for (let i = 0; i < partsToRender.length; i++) {
        let part = partsToRender[i];
        let mName = part.model ? part.model.replace('minecraft:', '').replace('block/', '') : defaultModelName;
        let pX = part.x || 0;
        let pY = part.y || 0;

        let depth = 0;
        let partJson = await this._fetchJSON('models', mName);
        let elements: any[] | null = null;

        while (partJson && depth < 5) {
            if (partJson.elements && !elements) elements = partJson.elements;
            if (partJson.parent) {
                let parentName = partJson.parent.replace('minecraft:', '').replace('block/', '');
                partJson = await this._fetchJSON('models', parentName);
                depth++;
            } else break;
        }

        if (elements) {
            // Apply rotation from multipart to bounding boxes before merge
            // We store the rotation so the geometry resolver can rotate the individual box shapes around origin correctly! 
            elements.forEach(e => combinedElements.push({ ...e, rx: pX, ry: pY }));
        }
    }

    let tintColor: number | null = null;
    if (cleanName === 'redstone_wire') {
      const powerStr = props['power'];
      if (powerStr) {
         const power = parseInt(powerStr, 10);
         const f = power / 15.0;
         const MathClamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));
         const r = f * 0.6 + (f > 0.0 ? 0.4 : 0.3);
         const g = MathClamp(f * f * 0.7 - 0.5, 0.0, 1.0);
         const b = MathClamp(f * f * 0.6 - 0.7, 0.0, 1.0);
         tintColor = new THREE.Color(r, g, b).getHex();
      }
    } else if (cleanName === 'grass_block' || cleanName === 'tall_grass' || cleanName.includes('leaves') || cleanName === 'fern') {
       // generic foliage / grass green tint
       tintColor = 0x55ab55; 
    }

    // Default rotation if we only had one part (legacy variants)
    if (partsToRender.length === 1 && !stateJson?.multipart) {
      if (partsToRender[0].x) rx = partsToRender[0].x;
      if (partsToRender[0].y) ry = partsToRender[0].y;
    } else if (stateJson?.multipart) {
      // In multipart we apply rotations to elements
      rx = 0; ry = 0;
    }

    // If no custom multipart elements retrieved, just fallback to standard
    const { geometry, material } = await this._resolveGeometryAndMaterialsFromModel(defaultModelName, cleanName, combinedElements.length > 0 ? combinedElements : [], tintColor);

    if (rx !== 0) geometry.rotateX(THREE.MathUtils.degToRad(rx));
    if (ry !== 0) geometry.rotateY(THREE.MathUtils.degToRad(-ry));

    return { geometry, material };
  }`

code = code.replace(oldFuncRegex, newFunc)

fs.writeFileSync("litematica-renderer/src/renderer.ts", code)
