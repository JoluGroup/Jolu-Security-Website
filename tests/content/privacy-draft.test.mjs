// Release 04B lane F: the privacy notice is a DRAFT with explicit verification flags. It must not be served until approved.
import test from "node:test"
import assert from "node:assert/strict"
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import path from "node:path"

const ROOT = path.resolve(import.meta.dirname, "../..")
const draft = readFileSync(path.join(ROOT, "docs/privacy/privacy-notice-draft.md"), "utf8")

test("the draft is flagged as unpublished and its open inputs are explicit", () => {
  assert.match(draft, /INTERNAL DRAFT \(not for publication\)/)
  assert.ok((draft.match(/\[\[VERIFY/g) ?? []).length >= 10)
  for (const p of ["P1", "P5", "P11"]) assert.ok(draft.includes(`| ${p} |`), p)
})

test("no privacy route exists while the draft has unresolved inputs, and no app file serves draft text", () => {
  assert.ok(!existsSync(path.join(ROOT, "app/privacy")))
  const walk = (d) => readdirSync(d).flatMap((n) => { const p = path.join(d, n); return statSync(p).isDirectory() ? walk(p) : [p] })
  for (const f of walk(path.join(ROOT, "app")).filter((f) => /\.(tsx?|mdx?)$/.test(f))) assert.ok(!/\[\[VERIFY|privacy-notice-draft/.test(readFileSync(f, "utf8")), f)
})

test("the draft states only processing the code performs: TTLs and fields match the implementation", async () => {
  const { DEDUP_WINDOW_SECONDS, DEDUP_LOCK_SECONDS } = await import("@/lib/enquiry/dedup")
  assert.equal(DEDUP_WINDOW_SECONDS, 600)
  assert.equal(DEDUP_LOCK_SECONDS, 30)
  assert.match(draft, /for 10 minutes/)
  assert.match(draft, /up to 30 seconds/)
  assert.match(draft, /sets no cookies of its own/)
  const src = ["components", "lib", "app"].flatMap((d) => { const w = (x) => readdirSync(x).flatMap((n) => { const p = path.join(x, n); return statSync(p).isDirectory() ? w(p) : [p] }); return w(path.join(ROOT, d)) }).filter((f) => /\.(tsx?)$/.test(f)).map((f) => readFileSync(f, "utf8")).join("\n")
  assert.ok(!/localStorage|sessionStorage|document\.cookie|cookies\(\)/.test(src), "the code sets no cookies or browser storage, as the draft says")
})
