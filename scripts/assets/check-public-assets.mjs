// CI check: node --import ./tests/register.mjs scripts/assets/check-public-assets.mjs  (pnpm check:assets)
import path from "node:path"
import { fileURLToPath } from "node:url"
import { checkAssets } from "./asset-rules.mjs"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const { PHOTO_LIBRARY } = await import("@/lib/photo-library")
const { DOCUMENT_LIBRARY } = await import("@/lib/document-library")
const violations = checkAssets(root, { photos: PHOTO_LIBRARY, docs: DOCUMENT_LIBRARY })
if (violations.length) {
  console.error(`Asset check FAILED (${violations.length}):`)
  for (const x of violations) console.error(` - ${x}`)
  process.exit(1)
}
console.log("Asset check passed.")
