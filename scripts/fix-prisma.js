import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const prismaClientPath = path.join(
  __dirname,
  "..",
  "node_modules",
  ".prisma",
  "client",
)
const pkgPath = path.join(prismaClientPath, "package.json")

if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"))

  // Patch exports to include ./default
  if (pkg.exports && !pkg.exports["./default"]) {
    pkg.exports["./default"] = "./index.js" // Use index.js as default entry for ./default too

    // Also ensure main points to index.js if not already (it usually does)
    if (!pkg.main) pkg.main = "index.js"

    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))
    console.log("Fixed .prisma/client/package.json exports")
  } else {
    console.log(
      ".prisma/client/package.json already has ./default export or no exports field",
    )
  }
} else {
  console.log(
    "node_modules/.prisma/client/package.json not found (maybe already deleted or not generated)",
  )
}
