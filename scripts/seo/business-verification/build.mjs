// Usage: node --import ./tests/register.mjs scripts/seo/business-verification/build.mjs
import { writeFileSync, mkdirSync } from "node:fs"
import path from "node:path"
import { DOCS } from "./render.mjs"
const out = path.resolve(import.meta.dirname, "../../../docs/seo/business-verification")
mkdirSync(out, { recursive: true })
for (const [name, fn] of Object.entries(DOCS)) writeFileSync(path.join(out, name), fn())
console.log(`wrote ${Object.keys(DOCS).length} documents to ${out}`)
