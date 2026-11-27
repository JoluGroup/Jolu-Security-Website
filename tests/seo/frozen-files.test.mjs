// Frozen-files guard (fail-closed). Works with no git metadata, no reference commit and no network.
import test from "node:test"
import assert from "node:assert/strict"
import { existsSync, readFileSync, readdirSync } from "node:fs"
import path from "node:path"
import { MANIFEST_PATH, PROTECTED, REQUIRED, listProtected, verifyFrozen } from "../../scripts/seo/frozen-files.mjs"

const ROOT = path.resolve(import.meta.dirname, "../..")

test("every protected file is exactly as approved (no git needed)", () => {
  assert.deepEqual(verifyFrozen(ROOT), [])
})

test("the manifest exists and covers every required file", () => {
  assert.ok(existsSync(path.join(ROOT, MANIFEST_PATH)))
  const files = JSON.parse(readFileSync(path.join(ROOT, MANIFEST_PATH), "utf8")).files
  for (const rel of REQUIRED) assert.ok(rel in files, rel)
  assert.ok(Object.keys(files).length >= REQUIRED.length)
})

test("protection patterns still cover the claims, enquiry, gate, app shell and workflow files", () => {
  const listed = listProtected(ROOT)
  for (const must of ["app/api/enquiry/route.ts", "lib/claims.ts", "lib/seo/publication-gate.ts", "app/layout.tsx", ".github/workflows/ci.yml", "next.config.ts"]) assert.ok(listed.includes(must), must)
  assert.ok(PROTECTED.length >= 10)
})

test("no test depends on an unpublished reference commit (the old guard failed open)", () => {
  const walk = (d, out = []) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p, out)
      else out.push(p) } return out }
  for (const f of walk(path.join(ROOT, "tests")).filter((f) => f.endsWith(".mjs"))) {
    if (f.endsWith("frozen-files.test.mjs")) continue
    assert.ok(!/a9dd82047390/.test(readFileSync(f, "utf8")), f)
  }
})
