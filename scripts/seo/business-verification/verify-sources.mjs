// Manual check (not part of CI): confirms that the 5B.1/5B.2 evidence ids cited in the register exist in the two preparation branches.
// Read-only git. Usage: git fetch origin +refs/heads/feature/seo-service-preparation:refs/remotes/origin/feature/seo-service-preparation (and location), then
//   node --import ./tests/register.mjs scripts/seo/business-verification/verify-sources.mjs
import { execSync } from "node:child_process"
import { ITEMS_ALL } from "./items.mjs"
const show = (br, dir) => execSync(`git ls-tree -r --name-only origin/${br} ${dir}`, { encoding: "utf8" }).split("\n").filter(Boolean).map((f) => execSync(`git show origin/${br}:${f}`, { encoding: "utf8" })).join("\n")
const docs = { "5B.1": show("feature/seo-service-preparation", "docs/seo/service-pages"), "5B.2": show("feature/seo-location-preparation", "docs/seo/location-pages") }
let bad = 0
for (const i of ITEMS_ALL) for (const ref of i.refs) {
  const [m, id] = ref.split(":")
  if (!new RegExp(`\\b${id}\\b`).test(docs[m])) { console.log(`MISSING ${ref} (cited by ${i.id})`); bad++ }
}
console.log(bad ? `${bad} unresolved references` : "all references resolve")
process.exit(bad ? 1 : 0)
