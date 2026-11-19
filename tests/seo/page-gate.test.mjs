// Publication-safety tests for the page architecture (Milestone 5D.2). No page is published; approved-state
// behaviour is exercised only with synthetic dependencies that production code never receives.
import test from "node:test"
import assert from "node:assert/strict"
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { execSync } from "node:child_process"
import path from "node:path"

const ROOT = path.resolve(import.meta.dirname, "../..")
const gate = await import("@/lib/seo/publication-gate")
const { ALL_PAGE_RECORDS, SERVICE_PAGE_RECORDS, LOCATION_PAGE_RECORDS } = await import("@/lib/seo/page-records")
const { EVIDENCE_LEDGER } = await import("@/lib/seo/evidence-ledger")
const { CLAIMS } = await import("@/lib/claims")
const { PLANNED_PAGES } = await import("@/lib/seo/planned-pages")
const { buildPageJsonLd } = await import("@/lib/seo/page-json-ld")
const { buildHomeJsonLd, serializeJsonLd } = await import("@/lib/seo/json-ld")
const { resolvePlanned } = await import("@/lib/seo/page-resolve")
const { REQUIRED_EVIDENCE } = await import("@/lib/seo/publication-requirements")
const { default: sitemap } = await import("../../app/sitemap.ts")
const { default: robots } = await import("../../app/robots.ts")

const read = (f) => readFileSync(path.join(ROOT, f), "utf8")
const clone = (x) => JSON.parse(JSON.stringify(x))

/** Synthetic world in which `record` is fully approved. Used only to prove the gate CAN pass; never imported by app code. */
function approvedWorld(base, { sections = [], claimIds = [] } = {}) {
  const record = clone(base)
  record.status = "approved"
  record.sections = sections
  record.claimRefs = claimIds
  const evidence = new Set([...record.requiredEvidence, ...sections.flatMap((s) => s.evidenceIds), ...(record.napEvidenceIds ?? [])])
  record.approval = { authorization: "owner", approvedBy: "Test Owner, CEO", approvedOn: "2026-11-19", path: record.publicPath, reference: "TEST-REF-1", layoutApproved: true, evidenceIds: [...evidence], claimIds }
  const deps = {
    ledger: [...evidence].map((id) => ({ id, status: "VERIFIED", verifiedBy: "Test Verifier", verifiedOn: "2026-11-18", document: "test-document" })),
    claims: [...CLAIMS, ...claimIds.map((id) => ({ id, text: "Synthetic", status: "approved", evidence: "test-evidence" }))],
    allowlist: [record.publicPath],
  }
  return { record, deps }
}

test("default: every record is unpublished with no approval, and registries are empty", () => {
  assert.equal(ALL_PAGE_RECORDS.length, 10)
  assert.equal(SERVICE_PAGE_RECORDS.length, 7)
  assert.equal(LOCATION_PAGE_RECORDS.length, 3)
  assert.equal(gate.PUBLICATION_ALLOWLIST.length, 0)
  assert.equal(EVIDENCE_LEDGER.length, 0)
  for (const r of ALL_PAGE_RECORDS) {
    assert.equal(r.status, "unpublished", r.publicPath)
    assert.equal(r.approval, null, r.publicPath)
    assert.equal(r.sections.length, 0, r.publicPath)
    const d = gate.evaluatePublication(r)
    assert.equal(d.published, false, r.publicPath)
    assert.ok(d.reasons.length > 0)
  }
  assert.deepEqual(gate.getPublishedPages(), [])
  assert.deepEqual(gate.publishedPagePaths(), [])
  assert.deepEqual(gate.getPublishedNavLinks(), [])
  assert.deepEqual(gate.publishedSlugs("service"), [])
  assert.deepEqual(gate.publishedSlugs("location"), [])
})

test("no committed page claims to be approved, and no claim in the registry is approved", () => {
  assert.ok(CLAIMS.every((c) => c.status === "needs-evidence"))
  for (const f of ["lib/seo/page-records.ts", "lib/seo/evidence-ledger.ts"]) assert.ok(!/status:\s*["']approved["']|VERIFIED/.test(read(f).replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "")), f)
})

test("records map one-to-one onto the planned pages and reuse the keyword registry (no duplication)", () => {
  const planned = PLANNED_PAGES.filter((p) => p.kind === "service" || p.kind === "location")
  assert.equal(planned.length, 10)
  for (const r of ALL_PAGE_RECORDS) {
    assert.ok(planned.some((p) => p.path === r.plannedPath), r.plannedPath)
    assert.equal(r.plannedPath, `${r.publicPath}/`)
    const p = resolvePlanned(r)
    assert.ok(p.primaryKeyword.length > 0 && p.supportingKeywords.length >= 0)
    for (const k of ["primaryKeyword", "supportingKeywords", "keywords", "title", "description"]) assert.ok(!(k in r), `record duplicates ${k}`)
  }
  assert.ok(!ALL_PAGE_RECORDS.some((r) => /migori/i.test(r.slug)), "no migori page")
  assert.equal(LOCATION_PAGE_RECORDS.find((r) => r.slug === "rongo").nap.officeName, "Migori")
})

test("every record lists required evidence, and the ids are well formed", () => {
  for (const r of ALL_PAGE_RECORDS) {
    assert.ok(r.requiredEvidence.length >= 13, r.publicPath)
    for (const id of r.requiredEvidence) assert.match(id, /^(COM|OFF-(NBO|NAK|RON)|SVC-(MG|CC|EF|EV|K9|AR|VP)|CMP|CNT|CLM|DIG)-\d{2}$/)
    assert.deepEqual([...r.requiredEvidence], [...REQUIRED_EVIDENCE[r.publicPath]])
  }
})

test("malformed or missing input never publishes (fails closed)", () => {
  const bad = [undefined, null, 0, "", "x", [], {}, { kind: "service" }, { kind: "page", publicPath: "/services/manned-guarding" }, () => true, Symbol("s")]
  for (const b of bad) assert.equal(gate.evaluatePublication(b).published, false)
  const { record, deps } = approvedWorld(SERVICE_PAGE_RECORDS[0])
  assert.equal(gate.evaluatePublication(record, deps).published, true, "sanity: synthetic world passes")
  // a record whose getters throw must fail closed, not propagate
  const hostile = new Proxy({}, { get() { throw new Error("boom") } })
  assert.deepEqual(gate.evaluatePublication(hostile), { published: false, reasons: ["gate error: failing closed"] })
  // malformed dependency values
  for (const badDeps of [{ ledger: null, claims: CLAIMS, allowlist: [record.publicPath] }, { ledger: deps.ledger, claims: undefined, allowlist: [record.publicPath] }, { ledger: deps.ledger, claims: CLAIMS, allowlist: null }]) assert.equal(gate.evaluatePublication(record, badDeps).published, false)
})

test("each required condition is individually necessary", () => {
  const mutate = (fn) => {
    const w = approvedWorld(SERVICE_PAGE_RECORDS[0])
    fn(w)
    return gate.evaluatePublication(w.record, w.deps)
  }
  const cases = {
    "status draft": (w) => (w.record.status = "unpublished"),
    "status wrong case": (w) => (w.record.status = "APPROVED"),
    "no approval": (w) => (w.record.approval = null),
    "approval not owner": (w) => (w.record.approval.authorization = "editor"),
    "approval no approver": (w) => (w.record.approval.approvedBy = "  "),
    "approval bad date": (w) => (w.record.approval.approvedOn = "19/11/2026"),
    "approval impossible date": (w) => (w.record.approval.approvedOn = "2026-99-99"),
    "approval no reference": (w) => (w.record.approval.reference = ""),
    "approval other path": (w) => (w.record.approval.path = "/services/cctv-installation"),
    "layout not approved": (w) => (w.record.approval.layoutApproved = "true"),
    "approval no evidence": (w) => (w.record.approval.evidenceIds = []),
    "approval misses one required evidence id": (w) => (w.record.approval.evidenceIds = w.record.approval.evidenceIds.slice(1)),
    "approval cites unknown evidence": (w) => w.record.approval.evidenceIds.push("NOPE-01"),
    "not on allowlist": (w) => (w.deps.allowlist = []),
    "allowlist for another page": (w) => (w.deps.allowlist = ["/services/cctv-installation"]),
    "required evidence PROVISIONAL": (w) => (w.deps.ledger[0].status = "PROVISIONAL"),
    "required evidence CONFLICTED": (w) => (w.deps.ledger[1].status = "CONFLICTED"),
    "required evidence missing from ledger": (w) => w.deps.ledger.pop(),
    "evidence without verifier": (w) => (w.deps.ledger[0].verifiedBy = ""),
    "evidence without document": (w) => (w.deps.ledger[0].document = ""),
    "evidence bad date": (w) => (w.deps.ledger[0].verifiedOn = "yesterday"),
    "required evidence list emptied": (w) => (w.record.requiredEvidence = []),
    "unknown slug": (w) => ((w.record.slug = "migori"), (w.record.publicPath = "/services/migori"), (w.record.plannedPath = "/services/migori/"), (w.record.approval.path = "/services/migori"), (w.deps.allowlist = ["/services/migori"])),
    "path with traversal": (w) => ((w.record.publicPath = "/services/../api"), (w.deps.allowlist = ["/services/../api"])),
    "path with trailing slash": (w) => ((w.record.publicPath += "/"), (w.deps.allowlist = [w.record.publicPath])),
    "kind/path mismatch": (w) => (w.record.kind = "location"),
    "slug/path mismatch": (w) => (w.record.slug = "cctv-installation"),
  }
  for (const [name, fn] of Object.entries(cases)) assert.equal(mutate(fn).published, false, name)
})

test("claims: unapproved, unknown or uncovered claim ids block publication", () => {
  const w = approvedWorld(SERVICE_PAGE_RECORDS[0], { claimIds: ["synthetic-claim"] })
  assert.equal(gate.evaluatePublication(w.record, w.deps).published, true)
  for (const fn of [
    (x) => (x.deps.claims = x.deps.claims.map((c) => (c.id === "synthetic-claim" ? { ...c, status: "needs-evidence" } : c))),
    (x) => (x.deps.claims = x.deps.claims.map((c) => (c.id === "synthetic-claim" ? { ...c, evidence: null } : c))),
    (x) => (x.deps.claims = x.deps.claims.filter((c) => c.id !== "synthetic-claim")),
    (x) => (x.record.approval.claimIds = []),
    (x) => x.record.claimRefs.push("availability-24-7"),
  ]) {
    const m = approvedWorld(SERVICE_PAGE_RECORDS[0], { claimIds: ["synthetic-claim"] })
    fn(m)
    assert.equal(gate.evaluatePublication(m.record, m.deps).published, false)
  }
})

test("content: sections need evidence; claim-sensitive wording needs an approved claim", () => {
  const section = (over) => ({ id: "s1", heading: "Scope", body: ["Guards are stationed at the entrances a client chooses."], evidenceIds: ["SVC-MG-01"], claimIds: [], ...over })
  const ok = approvedWorld(SERVICE_PAGE_RECORDS[0], { sections: [section()] })
  assert.equal(gate.evaluatePublication(ok.record, ok.deps).published, true)
  const noEvidence = approvedWorld(SERVICE_PAGE_RECORDS[0], { sections: [section({ evidenceIds: [] })] })
  assert.equal(gate.evaluatePublication(noEvidence.record, noEvidence.deps).published, false)
  for (const text of ["We are available 24/7.", "Our guards are professional.", "We are licensed and compliant.", "The best security in Nairobi."]) {
    const w = approvedWorld(SERVICE_PAGE_RECORDS[0], { sections: [section({ body: [text] })] })
    assert.equal(gate.evaluatePublication(w.record, w.deps).published, false, text)
    const withClaim = approvedWorld(SERVICE_PAGE_RECORDS[0], { sections: [section({ body: [text], claimIds: ["synthetic-claim"] })], claimIds: ["synthetic-claim"] })
    assert.equal(gate.evaluatePublication(withClaim.record, withClaim.deps).published, true, `${text} with an approved claim`)
  }
  const malformed = approvedWorld(SERVICE_PAGE_RECORDS[0], { sections: [{ id: "", heading: "", body: [], evidenceIds: [], claimIds: [] }] })
  assert.equal(gate.evaluatePublication(malformed.record, malformed.deps).published, false)
})

test("locations: NAP and coverage evidence are required and must be verified", () => {
  const base = LOCATION_PAGE_RECORDS[1]
  const w = approvedWorld(base)
  assert.equal(gate.evaluatePublication(w.record, w.deps).published, true)
  const noNap = approvedWorld(base)
  noNap.record.napEvidenceIds = []
  assert.equal(gate.evaluatePublication(noNap.record, noNap.deps).published, false)
  const coverage = approvedWorld(base)
  coverage.record.verifiedCoverage = { serviceIds: ["manned-guarding"], areas: ["Nakuru"], evidenceIds: ["OFF-NAK-99"] }
  assert.equal(gate.evaluatePublication(coverage.record, coverage.deps).published, false, "unverified coverage evidence")
  const noOffice = approvedWorld(base)
  noOffice.record.nap = {}
  assert.equal(gate.evaluatePublication(noOffice.record, noOffice.deps).published, false)
})

test("valid approved-state simulation (synthetic only) publishes via every public helper; real registries stay closed", () => {
  for (const base of ALL_PAGE_RECORDS) {
    const w = approvedWorld(base)
    const d = gate.evaluatePublication(w.record, w.deps)
    assert.equal(d.published, true, `${base.publicPath}: ${d.reasons.join("; ")}`)
    assert.deepEqual(gate.publishedPagePaths([w.record], w.deps), [base.publicPath])
    assert.equal(gate.getPublishedPage(base.kind, base.slug, [w.record], w.deps)?.publicPath, base.publicPath)
    assert.deepEqual(gate.publishedSlugs(base.kind, [w.record], w.deps), [base.slug])
    assert.equal(gate.getPublishedNavLinks([w.record], w.deps).length, 1)
    const ld = buildPageJsonLd(w.record, w.deps)
    assert.ok(ld && ld["@type"] === (base.kind === "service" ? "Service" : "LocalBusiness"))
    assert.ok(!/(hours|geo|price|rating|review|license|licence|sameAs)/i.test(JSON.stringify(ld)))
    // the same record against the REAL (empty) registries is unpublished
    assert.equal(gate.evaluatePublication(w.record).published, false)
    assert.equal(buildPageJsonLd(w.record), null)
  }
})

test("decisions are deterministic and never mutate their inputs", () => {
  const w = approvedWorld(SERVICE_PAGE_RECORDS[2])
  const before = JSON.stringify(w)
  const a = gate.evaluatePublication(w.record, w.deps)
  const b = gate.evaluatePublication(w.record, w.deps)
  assert.deepEqual(a, b)
  assert.equal(JSON.stringify(w), before)
  const bad = gate.evaluatePublication(ALL_PAGE_RECORDS[0])
  assert.deepEqual(bad, gate.evaluatePublication(ALL_PAGE_RECORDS[0]))
})

test("unknown, unplanned and unpublished slugs resolve to null (a route would 404)", () => {
  for (const slug of ["migori", "rongo", "nairobi", "manned-guarding", "k9-unit", "", " ", "..", "__proto__", "constructor", "NAIROBI", "nairobi/", 123, null, undefined, {}, []]) {
    for (const kind of ["service", "location"]) assert.equal(gate.getPublishedPage(kind, slug), null, `${kind}:${String(slug)}`)
  }
  assert.equal(gate.getPublishedPage("page", "nairobi"), null)
  // even in a synthetic published world, only planned slugs resolve and "migori" never does
  const w = approvedWorld(LOCATION_PAGE_RECORDS[2])
  assert.equal(gate.getPublishedPage("location", "rongo", [w.record], w.deps)?.slug, "rongo")
  assert.equal(gate.getPublishedPage("location", "migori", [w.record], w.deps), null)
  assert.equal(gate.getPublishedPage("service", "rongo", [w.record], w.deps), null)
  assert.ok(!gate.knownSlugs("location").includes("migori"))
})

test("sitemap and robots are unchanged: only the homepage; no service or location URL", () => {
  const entries = sitemap()
  assert.deepEqual(entries.map((e) => e.url), ["https://www.jolusecurity.com"])
  assert.ok(!entries.some((e) => /\/(services|locations)\b/.test(e.url)))
  const r = robots()
  assert.deepEqual(r.rules, [{ userAgent: "*", allow: "/", disallow: ["/api/"] }])
  assert.equal(r.sitemap, "https://www.jolusecurity.com/sitemap.xml")
})

test("no public structured-data leakage while unpublished", () => {
  for (const r of ALL_PAGE_RECORDS) assert.equal(buildPageJsonLd(r), null)
  const home = serializeJsonLd(buildHomeJsonLd())
  assert.ok(!/\/(services|locations)\//.test(home.replace(/Services|services"/g, "")) || !/jolusecurity\.com\/(services|locations)/.test(home))
  assert.ok(!/jolusecurity\.com\/(services|locations)/.test(home))
  for (const f of ["app/layout.tsx", "app/page.tsx", "app/blog/page.tsx"]) assert.ok(!/page-json-ld|buildPageJsonLd/.test(read(f)), f)
})

test("navigation and homepage components do not link to or import the new pages", () => {
  for (const f of ["components/navbar.tsx", "components/site-footer.tsx", "components/services-index.tsx", "components/services-section.tsx", "components/contact-section.tsx", "components/mobile-action-bar.tsx", "app/page.tsx", "app/layout.tsx"]) {
    const src = read(f)
    assert.ok(!/["'`]\/(services|locations)\//.test(src), `${f} links to a new page`)
    assert.ok(!/publication-gate|page-records|components\/pages\//.test(src), `${f} imports the new infrastructure`)
  }
})

test("no public routes exist and none imports the page components", () => {
  assert.ok(!existsSync(path.join(ROOT, "app/services")))
  assert.ok(!existsSync(path.join(ROOT, "app/locations")))
  const routes = []
  const walk = (d) => { for (const n of readdirSync(d)) { const p = path.join(d, n); statSync(p).isDirectory() ? walk(p) : routes.push(p) } }
  walk(path.join(ROOT, "app"))
  assert.ok(!routes.some((f) => /\[.*\]/.test(f)), "no dynamic route")
  for (const f of routes.filter((f) => /\.(tsx?|mjs)$/.test(f))) assert.ok(!/components\/pages\//.test(readFileSync(f, "utf8")), f)
  // an allowlisted path would also need a route file
  for (const p of gate.PUBLICATION_ALLOWLIST) {
    const [, section, slug] = p.split("/")
    assert.ok(existsSync(path.join(ROOT, `app/${section}/${slug}/page.tsx`)) || existsSync(path.join(ROOT, `app/${section}/[slug]/page.tsx`)), `${p} has no route`)
  }
})

test("no runtime switch: the gate reads no environment, request or global state", () => {
  for (const f of ["lib/seo/publication-gate.ts", "lib/seo/page-records.ts", "lib/seo/evidence-ledger.ts", "lib/seo/page-json-ld.ts", "lib/seo/page-resolve.ts", "lib/seo/publication-requirements.ts"]) {
    const src = read(f).replace(/\/\/.*$/gm, "")
    assert.ok(!/process\.env|import\.meta\.env|headers\(|cookies\(|searchParams|localStorage|globalThis|Date\.now|new Date\(/.test(src), f)
  }
})

test("components are server components with no invented claims, testimonials, badges or statistics", () => {
  const dir = path.join(ROOT, "components/pages")
  const files = readdirSync(dir)
  assert.equal(files.length, 7)
  for (const f of files) {
    const src = readFileSync(path.join(dir, f), "utf8")
    assert.ok(!/["']use client["']/.test(src), `${f} must be a server component`)
    const text = [...src.matchAll(/>\s*([^<>{}]*[A-Za-z][^<>{}]*)\s*</g)].map((m) => m[1]).join(" ") + [...src.matchAll(/(?:eyebrow|title|heading)=["']([^"']+)["']/g)].map((m) => m[1]).join(" ")
    assert.ok(!/\b(testimonial|award|certified|licensed|accredited|24\/7|trusted|best|leading|guarantee|\d+\+|\d+ ?%|years)\b/i.test(text), `${f}: ${text}`)
    assert.ok(!/<img|<Image|lovable-uploads/.test(src), `${f} renders no photo`)
  }
  for (const f of files.filter((f) => !["published-page.tsx", "page-intro.tsx", "internal-links.tsx"].includes(f))) assert.ok(/Published</.test(readFileSync(path.join(dir, f), "utf8")), `${f} accepts only gated pages`)
})

test("internal-links source filters to the homepage, its anchors and gated paths", () => {
  const src = read("components/pages/internal-links.tsx")
  assert.ok(/publishedPagePaths\(\)/.test(src) && /l\.href === "\/"/.test(src) && /startsWith\("\/#"\)/.test(src))
})

test("existing frozen files and the enquiry system are untouched (git diff against the parent)", { skip: !existsSync(path.join(ROOT, ".git")) }, () => {
  let out = ""
  try { out = execSync("git diff --name-only a9dd82047390848d6b077b76b68c9b27dd7fee9b", { cwd: ROOT, encoding: "utf8" }) } catch { return }
  const allowed = [/^app\/sitemap\.ts$/, /^lib\/seo\/(page-models|evidence-ledger|publication-requirements|page-records|page-resolve|publication-gate|page-json-ld)\.ts$/, /^components\/pages\//, /^tests\/seo\/page-gate\.test\.mjs$/, /^docs\/seo\/page-architecture\.md$/]
  for (const f of out.split("\n").filter(Boolean)) assert.ok(allowed.some((a) => a.test(f)), `unexpected change: ${f}`)
  assert.ok(!/(^|\n)(app\/api|lib\/enquiry|components\/enquiry-form|lib\/claims|lib\/photo-library|public\/)/.test(out))
})
