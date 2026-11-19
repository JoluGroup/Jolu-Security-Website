// Writes docs/seo/service-pages/*.md from the typed specs. page-architecture.md is hand-written and left alone.
//   node --import ./tests/register.mjs scripts/seo/build-service-docs.mjs
import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"

const { renderServiceDocs } = await import("@/lib/seo/service-docs")
const root = path.resolve(import.meta.dirname, "../../docs/seo/service-pages")
for (const [name, content] of Object.entries(renderServiceDocs())) {
  const file = path.join(root, name)
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, content)
  console.log("wrote", path.relative(process.cwd(), file))
}
