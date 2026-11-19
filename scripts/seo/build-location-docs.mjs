// Writes docs/seo/location-pages/ from lib/seo/location-briefs.ts and the workbook-derived data.
// Run: node --import ./tests/register.mjs scripts/seo/build-location-docs.mjs
import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"

const { renderLocationDocs } = await import("@/lib/seo/location-docs")
const root = path.resolve(import.meta.dirname, "../../docs/seo/location-pages")
const files = renderLocationDocs()
for (const [name, content] of Object.entries(files)) {
  const target = path.join(root, name)
  mkdirSync(path.dirname(target), { recursive: true })
  writeFileSync(target, content)
  console.log("wrote", path.relative(process.cwd(), target))
}
