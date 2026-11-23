// Rewrites tests/seo/frozen-files.manifest.json from the current protected files.
// Run ONLY after a reviewed, intended change to a protected file:
//     node scripts/seo/update-frozen-manifest.mjs
// The manifest change will show in the pull request diff and must be approved by the owner/code owner.
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { MANIFEST_PATH, buildManifest, serializeManifest } from "./frozen-files.mjs"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const next = buildManifest(root)
let prev = {}
if (existsSync(path.join(root, MANIFEST_PATH))) {
  try { prev = JSON.parse(readFileSync(path.join(root, MANIFEST_PATH), "utf8")).files ?? {} } catch { prev = {} }
}
const added = Object.keys(next.files).filter((k) => !(k in prev))
const removed = Object.keys(prev).filter((k) => !(k in next.files))
const changed = Object.keys(next.files).filter((k) => k in prev && prev[k] !== next.files[k])
writeFileSync(path.join(root, MANIFEST_PATH), serializeManifest(next))
console.log(`frozen manifest written: ${Object.keys(next.files).length} files`)
for (const [label, list] of [["added", added], ["removed", removed], ["changed", changed]]) {
  if (list.length) console.log(`${label}:\n  ${list.join("\n  ")}`)
}
