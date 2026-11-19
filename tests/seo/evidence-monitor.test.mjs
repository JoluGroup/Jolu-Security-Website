// Evidence-expiry monitoring (F5D5-02): read-only, pure, and tested against synthetic worlds only.
import test from "node:test"
import assert from "node:assert/strict"
import { execFileSync, spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import path from "node:path"

const ROOT = path.resolve(import.meta.dirname, "../..")
const { checkEvidenceFreshness } = await import("@/lib/seo/evidence-monitor")
const { ALL_PAGE_RECORDS } = await import("@/lib/seo/page-records")
const { defaultDeps, MAX_AS_OF_AGE_DAYS } = await import("@/lib/seo/publication-deps")
const W = await import("../helpers/gate-world.mjs")

const run = (w, today, extra = {}) => checkEvidenceFreshness({ records: [w.record], deps: w.deps, today, ...extra })
const msgs = (r, level) => r.findings.filter((f) => f.level === level).map((f) => f.message)
const licenceWorld = (expiresOn) => W.world(W.SERVICE, { extraEvidence: ["CMP-01"], sectionEvidence: [W.world().record.sections[0].evidenceIds[0], "CMP-01"], entryOver: { "CMP-01": { expiresOn } } })

test("production: nothing published, nothing relied upon, no findings other than a note", () => {
  const r = checkEvidenceFreshness({ records: ALL_PAGE_RECORDS, deps: defaultDeps(), today: "2026-11-19" })
  assert.equal(r.errors, 0); assert.equal(r.warnings, 0); assert.deepEqual(r.publishedPaths, [])
  assert.match(msgs(r, "note")[0], /No page is published/)
})

test("healthy synthetic published page: no errors or warnings", () => {
  const w = W.world()
  const r = run(w, "2026-11-19")
  assert.deepEqual(r.publishedPaths, [w.record.publicPath]); assert.equal(r.errors, 0); assert.equal(r.warnings, 0)
})

test("expiry approaching: warning that names the evidence and the page", () => {
  const w = licenceWorld("2026-12-19")
  const r = run(w, "2026-11-19")
  assert.equal(r.errors, 0)
  assert.ok(msgs(r, "warning").some((m) => m.includes("/services/manned-guarding") && m.includes("CMP-01") && m.includes("2026-12-19")))
})

test("licence-related evidence gets an earlier management warning than ordinary evidence", () => {
  const w = licenceWorld("2027-02-17") // 90 days
  const r = run(w, "2026-11-19")
  assert.ok(msgs(r, "warning").some((m) => /licence-related/.test(m) && m.includes("CMP-01")))
  const plain = W.world(W.SERVICE, { entryOver: { "COM-05": { expiresOn: "2027-02-17" } } })
  assert.ok(!msgs(run(plain, "2026-11-19"), "warning").some((m) => /licence-related/.test(m)))
})

test("evidence that expired after the committed date: errors name the evidence and page, and the page fails the gate today", () => {
  const w = licenceWorld("2026-12-01")
  const r = run(w, "2026-12-05") // asOf is still 2026-11-19, so the gate approved it, but in real time it expired
  const errs = msgs(r, "error")
  assert.ok(errs.some((m) => m.includes("/services/manned-guarding") && m.includes("CMP-01") && m.includes("expired on 2026-12-01")))
  assert.ok(errs.some((m) => /would NOT pass the publication gate today/.test(m)))
  assert.notEqual(r.errors, 0)
})

test("stale publication date: error after the limit, warning shortly before", () => {
  const w = W.world()
  const old = run(w, "2027-01-05") // 47 days after 2026-11-19
  assert.ok(msgs(old, "error").some((m) => /PUBLICATION_AS_OF .* days old/.test(m)))
  const soon = run(w, "2026-12-16") // 27 days: inside the 7-day warning margin
  assert.equal(soon.errors, 0)
  assert.ok(msgs(soon, "warning").some((m) => /exceed the .*day limit soon/.test(m)))
  assert.ok(MAX_AS_OF_AGE_DAYS === 31)
  const future = run(w, "2026-11-10")
  assert.ok(msgs(future, "error").some((m) => /in the future/.test(m)))
})

test("old verification dates produce a warning", () => {
  const w = W.world(); w.deps.ledger.find((e) => e.id === "COM-05").verifiedOn = "2025-06-01"
  assert.ok(msgs(run(w, "2026-11-19"), "warning").some((m) => m.includes("COM-05") && /last verified on 2025-06-01/.test(m)))
})

test("approved but unpublishable records are reported (revoked, superseded without citation)", () => {
  const revoked = W.world(); revoked.deps.ledger.find((e) => e.id === "COM-05").revokedOn = "2026-11-18"
  const r1 = run(revoked, "2026-11-19")
  assert.ok(msgs(r1, "warning").some((m) => /marked approved but is not publishable/.test(m) && /COM-05/.test(m)))
  assert.deepEqual(r1.publishedPaths, [])
  const sup = W.world(); const old = sup.deps.ledger.find((e) => e.id === "CMP-07"); old.supersededBy = "CMP-07-R2"; sup.deps.ledger.push(W.entry("CMP-07-R2", { replaces: "CMP-07" }))
  assert.ok(msgs(run(sup, "2026-11-19"), "warning").some((m) => /approved but is not publishable/.test(m)))
})

test("a superseded entry is accepted when the approval cites the current entry, and is not flagged", () => {
  const w = W.world(); const old = w.deps.ledger.find((e) => e.id === "CMP-07"); old.supersededBy = "CMP-07-R2"
  w.deps.ledger.push(W.entry("CMP-07-R2", { replaces: "CMP-07", expiresOn: "2026-12-10" })); w.record.approval.evidenceIds.push("CMP-07-R2")
  const r = run(w, "2026-11-19")
  assert.equal(r.errors, 0)
  assert.ok(msgs(r, "warning").some((m) => m.includes("CMP-07-R2") && m.includes("2026-12-10")), "the CURRENT entry's expiry is monitored")
})

test("unused ledger evidence nearing expiry is a warning, not an error", () => {
  const w = W.world(); w.deps.ledger.push(W.entry("COM-77", { expiresOn: "2026-12-01" }))
  const r = run(w, "2026-11-19")
  assert.equal(r.errors, 0)
  assert.ok(msgs(r, "warning").some((m) => /unused evidence COM-77/.test(m)))
})

test("malformed input is reported as errors and never throws", () => {
  assert.doesNotThrow(() => checkEvidenceFreshness({ records: null, deps: null, today: "2026-11-19" }))
  assert.equal(checkEvidenceFreshness({ records: [], deps: defaultDeps(), today: "2026-02-30" }).errors, 1)
  assert.equal(checkEvidenceFreshness({ records: [], deps: { ...defaultDeps(), asOf: "nope" }, today: "2026-11-19" }).errors, 1)
  assert.doesNotThrow(() => checkEvidenceFreshness({ records: [null, 5, "x", {}], deps: defaultDeps(), today: "2026-11-19" }))
})

test("the monitor does not mutate its inputs", () => {
  const w = W.world(); const before = JSON.stringify(w)
  run(w, "2026-12-05")
  assert.equal(JSON.stringify(w), before)
})

test("script: exits 0 on production data and 1 on an invalid date; makes no network or file writes", () => {
  const out = execFileSync(process.execPath, ["--import", "./tests/register.mjs", "scripts/check-evidence-freshness.mjs", "--today=2026-11-19"], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], env: { ...process.env, GITHUB_ACTIONS: "" } })
  assert.match(out, /0 published page\(s\), 0 error\(s\), 0 warning\(s\)/)
  const bad = spawnSync(process.execPath, ["--import", "./tests/register.mjs", "scripts/check-evidence-freshness.mjs", "--today=2026-02-30"], { cwd: ROOT, encoding: "utf8", env: { ...process.env, GITHUB_ACTIONS: "" } })
  assert.equal(bad.status, 1)
  assert.match(bad.stdout, /ERROR: today's date/)
  // inside GitHub Actions the same failure is printed as a workflow annotation
  const ann = spawnSync(process.execPath, ["--import", "./tests/register.mjs", "scripts/check-evidence-freshness.mjs", "--today=2026-02-30"], { cwd: ROOT, encoding: "utf8", env: { ...process.env, GITHUB_ACTIONS: "true" } })
  assert.equal(ann.status, 1)
  assert.match(ann.stdout, /::error::today's date/)
  const src = readFileSync(path.join(ROOT, "scripts/check-evidence-freshness.mjs"), "utf8") + readFileSync(path.join(ROOT, "lib/seo/evidence-monitor.ts"), "utf8")
  assert.ok(!/writeFile|appendFile|unlink|rm\(|mkdir|fetch\(|https?:\/\/(?!github)|child_process|process\.env\.(?!GITHUB_ACTIONS)/.test(src.replace(/\/\/.*$/gm, "")))
})

test("workflow is read-only: schedule + manual only, no write permission, secrets, deployment or git mutation", () => {
  const y = readFileSync(path.join(ROOT, ".github/workflows/evidence-freshness.yml"), "utf8")
  const code = y.replace(/^\s*#.*$/gm, "")
  assert.match(code, /schedule:\s*\n\s*- cron:/)
  assert.match(code, /workflow_dispatch:/)
  assert.match(code, /permissions:\s*\n\s*contents: read\s*\n/)
  assert.ok(!/contents:\s*write|issues:|pull-requests:|id-token|secrets\.|GITHUB_TOKEN|git (push|commit|tag)|vercel|deploy|curl|gh (pr|issue|api)/i.test(code))
  assert.ok(!/pull_request|push:/.test(code), "must not run on pushes or PRs")
  assert.match(y, /default branch/i, "the default-branch limitation is stated in the file")
})
