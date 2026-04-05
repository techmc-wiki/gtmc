const sr = require("schematic-renderer")
const r = new sr.SchematicRenderer(null, {}, {}, {})
console.log(
  "methods:",
  Object.getOwnPropertyNames(Object.getPrototypeOf(r)).filter(
    (n) => typeof r[n] === "function"
  )
)
