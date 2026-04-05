const fs = require("fs")
const _stateJson = JSON.parse(
  fs.readFileSync(
    "litematica-renderer/assets/minecraft/blockstates/redstone_wire.json",
    "utf8"
  )
)

const props = {}
let match = true
const testCond = { north: "none", east: "none", south: "none", west: "none" }
for (const [k, v] of Object.entries(testCond)) {
  let cur = props[k]
  if (cur === undefined) cur = "none" // What if we do this?
  const expected = String(v).split("|")
  if (!expected.includes(cur)) match = false
}
console.log(match)
