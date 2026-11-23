// Mutation tests for the frozen-files guard: each unauthorised change must be detected, in a copy of the tree that
// has NO .git directory (the situation in a fresh clone or a shallow CI checkout).
import test from "node:test"
import assert from "node:assert/strict"
import { appendFileSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { MANIFEST_PATH, listProtected, verifyFrozen } from "../../scripts/seo/frozen-files.mjs"

const ROOT = path.resolve(import.meta.dirname, "../..")

function makeCopy() {
  const dir = mkdtempSync(path.join(tmpdir(), "frozen-"))
  for (const rel of [...listProtected(ROOT), MANIFEST_PATH, "lib/seo/pages.ts", "components/industries-section.tsx"]) {
    mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true })
    copyFileSync(path.join(ROOT, rel), path.join(dir, rel))
  }
  assert.ok(!existsSync(path.join(dir, ".git")))
  return dir
}
function withCopy(fn) { const dir = makeCopy(); try { fn(dir) } finally { rmSync(dir, { recursive: true, force: true }) } }
const has = (problems, text) => assert.ok(problems.some((p) => p.includes(text)), `${text} not in ${JSON.stringify(problems)}`)

test("baseline copy without .git verifies clean", () => withCopy((d) => assert.deepEqual(verifyFrozen(d), [])))

for (const rel of [
  "app/api/enquiry/route.ts", "lib/enquiry/deliver.ts", "lib/enquiry/rate-limit.ts", "lib/enquiry/dedup.ts", "components/enquiry-form.tsx",
  "lib/claims.ts", "lib/seo/publication-gate.ts", "lib/seo/publication-requirements.ts", "lib/seo/publication-manifest.ts",
  "lib/seo/evidence-ledger.ts", "lib/seo/page-records.ts", "app/page.tsx", "app/layout.tsx", "next.config.ts",
  ".github/workflows/ci.yml", "tests/seo/page-gate.test.mjs", "scripts/seo/frozen-files.mjs",
]) {
  test(`modification is detected: ${rel}`, () => withCopy((d) => {
    appendFileSync(path.join(d, rel), "\n")
    has(verifyFrozen(d), `protected file modified: ${rel}`)
  }))
  test(`deletion is detected: ${rel}`, () => withCopy((d) => {
    unlinkSync(path.join(d, rel))
    has(verifyFrozen(d), `protected file deleted or no longer protected: ${rel}`)
  }))
}

test("a new file inside a protected area is detected", () => withCopy((d) => {
  writeFileSync(path.join(d, "app/api/enquiry/extra.ts"), "export {}\n")
  writeFileSync(path.join(d, "lib/enquiry/new.ts"), "export {}\n")
  writeFileSync(path.join(d, ".github/workflows/deploy.yml"), "name: deploy\n")
  const p = verifyFrozen(d)
  has(p, "new protected file not in manifest: app/api/enquiry/extra.ts")
  has(p, "new protected file not in manifest: lib/enquiry/new.ts")
  has(p, "new protected file not in manifest: .github/workflows/deploy.yml")
}))

test("a protected file replaced by a symbolic link is detected", () => withCopy((d) => {
  unlinkSync(path.join(d, "lib/claims.ts"))
  symlinkSync(path.join(ROOT, "lib/claims.ts"), path.join(d, "lib/claims.ts"))
  has(verifyFrozen(d), "protected file is a symbolic link: lib/claims.ts")
}))

test("missing manifest fails closed", () => withCopy((d) => {
  unlinkSync(path.join(d, MANIFEST_PATH))
  has(verifyFrozen(d), "fail closed")
}))

for (const [name, content] of [["garbage", "not json"], ["empty object", "{}"], ["wrong version", '{"version":2,"algorithm":"sha256","files":{}}'], ["empty files", '{"version":1,"algorithm":"sha256","files":{}}'], ["array files", '{"version":1,"algorithm":"sha256","files":[]}']]) {
  test(`unusable manifest fails closed: ${name}`, () => withCopy((d) => {
    writeFileSync(path.join(d, MANIFEST_PATH), content)
    assert.ok(verifyFrozen(d).length > 0)
  }))
}

test("a manifest with an entry removed (shrunk coverage) fails", () => withCopy((d) => {
  const m = JSON.parse(readFileSync(path.join(d, MANIFEST_PATH), "utf8"))
  delete m.files["lib/claims.ts"]
  writeFileSync(path.join(d, MANIFEST_PATH), JSON.stringify(m))
  const p = verifyFrozen(d)
  has(p, "required protected file is not covered by the manifest: lib/claims.ts")
  has(p, "new protected file not in manifest: lib/claims.ts")
}))

test("a manifest with an invalid digest fails", () => withCopy((d) => {
  const m = JSON.parse(readFileSync(path.join(d, MANIFEST_PATH), "utf8"))
  m.files["lib/claims.ts"] = "0".repeat(10)
  writeFileSync(path.join(d, MANIFEST_PATH), JSON.stringify(m))
  has(verifyFrozen(d), "invalid digest")
}))

test("new routes and skipped-looking folder names inside protected areas are detected", () => withCopy((d) => {
  for (const rel of ["app/api/coverage/route.ts", "app/api/node_modules/route.ts", "app/evil/route.ts", "app/a/b/c/route.js", "proxy.ts", "middleware.ts"]) {
    mkdirSync(path.dirname(path.join(d, rel)), { recursive: true })
    writeFileSync(path.join(d, rel), "export {}\n")
    has(verifyFrozen(d), `new protected file not in manifest: ${rel}`)
    unlinkSync(path.join(d, rel))
  }
  assert.deepEqual(verifyFrozen(d), [])
}))

for (const rel of ["package.json", "tests/register.mjs", "tests/loader.mjs", "pnpm-workspace.yaml", "eslint.config.mjs", "tsconfig.json", "pnpm-lock.yaml", "scripts/assets/check-public-assets.mjs", "scripts/assets/asset-rules.mjs", "tests/enquiry/route.test.mjs", "tests/assets/assets.test.mjs", "tests/content/content-integrity.test.mjs"]) {
  test(`modification is detected: ${rel}`, () => withCopy((d) => {
    appendFileSync(path.join(d, rel), "\n")
    has(verifyFrozen(d), `protected file modified: ${rel}`)
  }))
}

test("deleting the guard\'s own tests or the enquiry tests is detected", () => withCopy((d) => {
  for (const rel of ["tests/seo/frozen-files.test.mjs", "tests/seo/frozen-files-mutation.test.mjs", "tests/enquiry/route.test.mjs"]) unlinkSync(path.join(d, rel))
  const p = verifyFrozen(d)
  has(p, "protected file deleted or no longer protected: tests/seo/frozen-files.test.mjs")
  has(p, "protected file deleted or no longer protected: tests/seo/frozen-files-mutation.test.mjs")
  has(p, "protected file deleted or no longer protected: tests/enquiry/route.test.mjs")
}))

test("the command line check works without git or the test files, and exits 1 on tampering", () => withCopy((d) => {
  const run = () => spawnSync(process.execPath, [path.join(d, "scripts/seo/frozen-files.mjs"), "--check"], { encoding: "utf8" })
  const ok = run()
  assert.equal(ok.status, 0, ok.stderr)
  unlinkSync(path.join(d, "tests/seo/frozen-files.test.mjs"))
  const bad = run()
  assert.equal(bad.status, 1)
  assert.match(bad.stderr, /Frozen-files check FAILED/)
  appendFileSync(path.join(d, "lib/claims.ts"), "\n")
  assert.equal(run().status, 1)
}))

test("new root-level config files and new app pages are detected (script-shell, eslint, postcss, env, pnpmfile, pages)", () => withCopy((d) => {
  for (const rel of [".npmrc", "eslint.config.js", "postcss.config.mjs", ".env.production", ".pnpmfile.cjs", "vitest.config.ts", "app/x/page.tsx", "app/services/page.tsx", "app/globals.css"]) {
    mkdirSync(path.dirname(path.join(d, rel)), { recursive: true })
    const existed = existsSync(path.join(d, rel))
    writeFileSync(path.join(d, rel), "x\n")
    const p = verifyFrozen(d)
    assert.ok(p.some((x) => x.includes(rel)), `${rel}: ${JSON.stringify(p)}`)
    if (!existed) unlinkSync(path.join(d, rel))
  }
}))

test("generated and machine-local root files are the only exemptions", () => withCopy((d) => {
  for (const rel of ["next-env.d.ts", "tsconfig.tsbuildinfo", ".DS_Store", ".env.local", ".env.development.local", "debug.log"]) writeFileSync(path.join(d, rel), "x\n")
  mkdirSync(path.join(d, "node_modules/x"), { recursive: true })
  writeFileSync(path.join(d, "node_modules/x/index.js"), "x\n")
  assert.deepEqual(verifyFrozen(d), [])
}))

test("a neutered test script in package.json is detected", () => withCopy((d) => {
  const pkg = JSON.parse(readFileSync(path.join(d, "package.json"), "utf8"))
  pkg.scripts.test = "true"
  writeFileSync(path.join(d, "package.json"), JSON.stringify(pkg, null, 2))
  has(verifyFrozen(d), "protected file modified: package.json")
}))

test("approved exceptions stay narrow: content files are NOT frozen, gate/claims/enquiry files are", () => withCopy((d) => {
  appendFileSync(path.join(d, "lib/seo/pages.ts"), "\n// content edit\n")
  appendFileSync(path.join(d, "components/industries-section.tsx"), "\n")
  assert.deepEqual(verifyFrozen(d), [])
  appendFileSync(path.join(d, "lib/claims.ts"), "\n")
  assert.equal(verifyFrozen(d).length, 1)
}))
