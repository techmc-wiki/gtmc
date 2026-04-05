const fs = require('fs');
let code = fs.readFileSync('litematica-renderer/src/renderer.ts', 'utf8');

const regex = /private async _getGeometryAndMaterialsForBlock[\s\S]+?return { geometry, material };\s+\}/;

const replacement = private async _getGeometryAndMaterialsForBlock(blockStateName: string): Promise<{ geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[] }> {
    const parsedBlock = blockStateName.match(/minecraft:([^\[]+)(?:\\[(.*)\\])?/);
    const cleanName = parsedBlock ? parsedBlock[1] : blockStateName.replace('minecraft:', '').split('[')[0];
    const propertiesStr = parsedBlock && parsedBlock[2] ? parsedBlock[2] : '';

    const props: Record<string, string> = {};
    if (propertiesStr) {
      propertiesStr.split(',').forEach(kv => {
        const [k, v] = kv.split('=');
        if (k && v) props[k] = v;
      });
    }

    let targetModelName = cleanName;
    let rx = 0, ry = 0;

    const stateJson = await this._fetchJSON('blockstates', cleanName);
    
    // Support multipart multiple matching models correctly instead of taking the first one blindly
    let partsToRender: any[] = [];
    
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

    let allElements: any[] = [];
    let materialResult: THREE.Material | THREE.Material[] | null = null;
    let singleGeometryFallback: THREE.BufferGeometry | null = null;
    
    // We calculate coloring at block state level
    let tintColor: number | null = null;
    if (cleanName === 'redstone_wire') {
      const power = parseInt(props['power'] || '0', 10);
      const f = power / 15.0;
      const g = f * 0.6 + (f > 0.0 ? 0.4 : 0.3);
      const MathHelper_clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));
      const h = MathHelper_clamp(f * f * 0.7 - 0.5, 0.0, 1.0);
      const j = MathHelper_clamp(f * f * 0.6 - 0.7, 0.0, 1.0);
      tintColor = new THREE.Color(g, h, j).getHex();
    }
    
    for (let i = 0; i < partsToRender.length; i++) {
        let part = partsToRender[i];
        if (part.model) {
            let mName = part.model.replace('minecraft:', '').replace('block/', '');
            const { geometry, material, elementsData } = await this._resolveGeometryAndMaterialsFromModel(mName, cleanName, tintColor);
            
            // Apply part rotation before accumulating
            let px = part.x || 0;
            let py = part.y || 0;
            if (px !== 0) geometry.rotateX(THREE.MathUtils.degToRad(px));
            if (py !== 0) geometry.rotateY(THREE.MathUtils.degToRad(-py));
            
            if (i === 0) {
               materialResult = material;
               singleGeometryFallback = geometry;
            }
            
            if (elementsData && elementsData.length > 0) {
                // If it actually parsed geometric boxes
                allElements.push(...elementsData.map((e: any) => ({...e, rx: px, ry: py})));
            } else {
                // Not standard cube geometry data
                allElements.push({ isFullGeo: true, geom: geometry });
            }
        }
    }

    let finalGeometry = singleGeometryFallback || this.boxGeometry;
    
    // If we have multiple geometries from multipart, we should technically merge them, but since we cannot use BufferGeometryUtils easily,
    // we will just pack them if we implement simple box accumulation inside resolveGeometry (later step maybe).
    // For now, if we gathered multiple parts, return the combined elements properly if we upgrade resolveGeometry.
    
    return { geometry: finalGeometry, material: materialResult || this.boxGeometry }; // We'll improve this merging in resolving
  };

code = code.replace(regex, replacement);

if (code.includes('private async _getGeometryAndMaterialsForBlock')) {
    fs.writeFileSync('litematica-renderer/src/renderer.ts', code);
    console.log('Part 1 updated.');
} else {
    console.log('Regex fail');
}
