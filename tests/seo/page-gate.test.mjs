// Publication-safety tests for the page architecture (Milestones 5D.2 and 5D.4). No page is published; approved-state
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
const { PUBLICATION_MANIFEST } = await import("@/lib/seo/publication-manifest")
const { REQUIRED_EVIDENCE, LOCATION_IDENTITY } = await import("@/lib/seo/publication-requirements")
const { CLAIMS } = await import("@/lib/claims")
const { PLANNED_PAGES } = await import("@/lib/seo/planned-pages")
const { buildPageJsonLd } = await import("@/lib/seo/page-json-ld")
const { gatedPageMetadata } = await import("@/lib/seo/page-metadata")
const { buildHomeJsonLd, serializeJsonLd } = await import("@/lib/seo/json-ld")
const { resolvePlanned } = await import("@/lib/seo/page-resolve")
const { default: sitemap } = await import("../../app/sitemap.ts")
const { default: robots } = await import("../../app/robots.ts")
const W = await import("../helpers/gate-world.mjs")

const read = (f) => readFileSync(path.join(ROOT, f), "utf8")
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")

test("default: every record is unpublished; ledger, manifest and approvals are empty", () => {
  assert.equal(ALL_PAGE_RECORDS.length, 10)
  assert.equal(SERVICE_PAGE_RECORDS.length, 7)
  assert.equal(LOCATION_PAGE_RECORDS.length, 3)
  assert.equal(PUBLICATION_MANIFEST.length, 0)
  assert.equal(EVIDENCE_LEDGER.length, 0)
  for (const r of ALL_PAGE_RECORDS) {
    assert.equal(r.status, "unpublished", r.publicPath)
    assert.equal(r.approval, null)
    assert.equal(r.sections.length, 0)
    assert.equal(gate.evaluatePublication(r).published, false, r.publicPath)
    assert.equal(gate.publishRecord(r), null)
  }
  for (const r of LOCATION_PAGE_RECORDS) assert.equal(r.nap, null, `${r.slug} has no verified NAP`)
  assert.deepEqual(gate.getPublishedPages(), [])
  assert.deepEqual(gate.publishedPagePaths(), [])
  assert.deepEqual(gate.getPublishedNavLinks(), [])
  assert.ok(CLAIMS.every((c) => c.status === "needs-evidence"))
  for (const f of ["lib/seo/page-records.ts", "lib/seo/evidence-ledger.ts", "lib/seo/publication-manifest.ts"]) assert.ok(!/status:\s*["']approved["']|VERIFIED|routeFile:\s*["']/.test(strip(read(f))), f)
})

test("registries are deeply frozen (F-11)", () => {
  assert.ok(Object.isFrozen(ALL_PAGE_RECORDS) && Object.isFrozen(SERVICE_PAGE_RECORDS) && Object.isFrozen(LOCATION_PAGE_RECORDS))
  for (const r of ALL_PAGE_RECORDS) assert.ok(Object.isFrozen(r) && Object.isFrozen(r.sections) && Object.isFrozen(r.evidenceRefs))
  assert.ok(Object.isFrozen(EVIDENCE_LEDGER) && Object.isFrozen(PUBLICATION_MANIFEST) && Object.isFrozen(REQUIRED_EVIDENCE) && Object.isFrozen(REQUIRED_EVIDENCE["/services/manned-guarding"]))
  assert.ok(Object.isFrozen(LOCATION_IDENTITY.nairobi))
  assert.throws(() => EVIDENCE_LEDGER.push({}), TypeError)
  assert.throws(() => PUBLICATION_MANIFEST.push({}), TypeError)
  assert.throws(() => { ALL_PAGE_RECORDS[0].status = "approved" }, TypeError)
  assert.throws(() => REQUIRED_EVIDENCE["/services/manned-guarding"].pop(), TypeError)
  assert.equal(gate.publishedPagePaths().length, 0)
})

test("records and the canonical table agree with the planned pages and keyword registry", () => {
  const planned = PLANNED_PAGES.filter((p) => p.kind === "service" || p.kind === "location")
  assert.equal(planned.length, 10)
  for (const r of ALL_PAGE_RECORDS) {
    assert.ok(planned.some((p) => p.path === r.plannedPath))
    assert.equal(r.plannedPath, `${r.publicPath}/`)
    assert.ok(resolvePlanned(r).primaryKeyword.length > 0)
    for (const k of ["primaryKeyword", "supportingKeywords", "keywords", "title", "description", "requiredEvidence", "claimRefs", "napEvidenceIds"]) assert.ok(!(k in r), `record has ${k}`)
    assert.ok(REQUIRED_EVIDENCE[r.publicPath].length >= 13, r.publicPath)
    for (const id of REQUIRED_EVIDENCE[r.publicPath]) assert.match(id, /^(COM|OFF-(NBO|NAK|RON)|SVC-(MG|CC|EF|EV|K9|AR|VP)|CMP|CNT|CLM|DIG)-\d{2}$/)
  }
  assert.ok(!ALL_PAGE_RECORDS.some((r) => /migori/i.test(r.slug)), "no migori page")
  assert.equal(LOCATION_PAGE_RECORDS.find((r) => r.slug === "rongo").officeName, "Migori")
  for (const r of LOCATION_PAGE_RECORDS) for (const id of Object.values(LOCATION_IDENTITY[r.slug]).filter((v) => /^OFF-/.test(v))) assert.ok(REQUIRED_EVIDENCE[r.publicPath].includes(id), `${r.slug} requires ${id}`)
})

test("the gate accepts and rejects every case in the shared table (F-02 to F-09)", () => {
  const results = W.runCases(gate)
  assert.ok(results.length >= 190, `only ${results.length} cases`)
  assert.deepEqual(results.filter((r) => !r.ok).map((r) => r.name), [])
})

test("a record cannot weaken the canonical requirements (F-02)", () => {
  const { record, deps } = W.world()
  assert.equal(gate.evaluatePublication(record, deps).published, true, "sanity")
  const weak = { ...W.clone(record), requiredEvidence: [] }
  const onlyOne = { ...deps, ledger: deps.ledger.filter((e) => e.id === "COM-05") }
  assert.equal(gate.evaluatePublication(weak, onlyOne).published, false)
  const d = gate.evaluatePublication(weak, onlyOne)
  for (const id of REQUIRED_EVIDENCE[record.publicPath].filter((x) => x !== "COM-05")) assert.ok(d.reasons.some((r) => r.includes(id)), id)
})

test("published pages are frozen snapshots; later changes to the source cannot affect them (F-11)", () => {
  const { record, deps } = W.world()
  const page = gate.publishRecord(record, deps)
  assert.ok(page && Object.isFrozen(page) && Object.isFrozen(page.sections) && Object.isFrozen(page.approval))
  record.status = "unpublished"
  record.sections = []
  assert.equal(page.status, "approved")
  assert.equal(page.sections.length, 1)
  assert.throws(() => { page.status = "unpublished" }, TypeError)
  // a record whose status flips between reads is evaluated once, on a snapshot
  let reads = 0
  const flip = new Proxy(W.clone(W.world().record), { get(t, k) { return k === "status" ? (reads++ === 0 ? "approved" : "unpublished") : t[k] } })
  const flipped = gate.publishRecord(flip, deps)
  assert.ok(flipped === null || flipped.status === "approved")
  // non-plain data cannot be snapshotted
  const cyc = W.clone(W.world().record); cyc.self = cyc
  assert.equal(gate.evaluatePublication(cyc, deps).published, false)
})

test("evaluation is deterministic and does not mutate its inputs", () => {
  const w = W.world()
  const before = JSON.stringify(w)
  const a = gate.evaluatePublication(w.record, w.deps)
  assert.deepEqual(a, gate.evaluatePublication(w.record, w.deps))
  assert.equal(JSON.stringify(w), before)
  const bad = W.world(); bad.record.status = "unpublished"
  assert.deepEqual(gate.evaluatePublication(bad.record, bad.deps), gate.evaluatePublication(bad.record, bad.deps))
})

test("unknown, unplanned and unpublished slugs resolve to null (a route would 404)", () => {
  for (const slug of ["migori", "rongo", "nairobi", "manned-guarding", "k9-unit", "", " ", "..", "__proto__", "constructor", "NAIROBI", "nairobi/", 123, null, undefined, {}, []]) for (const kind of ["service", "location"]) assert.equal(gate.getPublishedPage(kind, slug), null, `${kind}:${String(slug)}`)
  assert.equal(gate.getPublishedPage("page", "nairobi"), null)
  const w = W.world(W.RONGO)
  assert.equal(gate.getPublishedPage("location", "rongo", [w.record], w.deps)?.slug, "rongo")
  assert.equal(gate.getPublishedPage("location", "migori", [w.record], w.deps), null)
  assert.equal(gate.getPublishedPage("service", "rongo", [w.record], w.deps), null)
  assert.ok(!gate.knownSlugs("location").includes("migori"))
  assert.deepEqual(gate.getPublishedPages(null), [])
})

test("runtime boundary: a forged TypeScript cast cannot pass (F-12)", () => {
  const { record, deps } = W.world()
  const page = gate.publishRecord(record, deps)
  assert.doesNotThrow(() => gate.assertPublished(page))
  for (const forged of [record, { ...page }, JSON.parse(JSON.stringify(page)), Object.create(page), ALL_PAGE_RECORDS[0], null, undefined, "page", 5]) {
    assert.throws(() => gate.assertPublished(forged), /publication gate/)
    assert.equal(gate.isPublishedSnapshot(forged), forged === page)
    if (forged !== page) { assert.equal(buildPageJsonLd(forged), null); assert.equal(gatedPageMetadata(forged), null); assert.equal(gate.getManifestEntry(forged), null) }
  }
  for (const f of ["service-overview", "location-overview", "evidence-sections", "contact-cta"]) assert.ok(/assertPublished\(page\)/.test(read(`components/pages/${f}.tsx`)), f)
  assert.ok(/getPublishedPage\(/.test(read("components/pages/published-page.tsx")))
})

test("published synthetic pages produce metadata and structured data from gate-verified values only", () => {
  const s = gate.publishRecord(...Object.values(W.world()))
  const ld = buildPageJsonLd(s)
  assert.equal(ld["@type"], "Service")
  const md = gatedPageMetadata(s)
  assert.equal(md.alternates.canonical, s.publicPath)
  assert.equal(md.title, "Test page")
  const w = W.world(W.NAKURU, { nap: { displayName: "Test Office" } })
  const l = gate.publishRecord(w.record, w.deps)
  const lld = buildPageJsonLd(l)
  assert.equal(lld["@type"], "LocalBusiness")
  assert.equal(lld.name, l.nap.displayName)
  assert.equal(lld.address.streetAddress, l.nap.streetAddress)
  assert.equal(lld.telephone, l.nap.telephone)
  for (const x of [ld, lld]) assert.ok(!/(hours|geo|price|rating|review|licen|sameAs)/i.test(JSON.stringify(x)))
  for (const r of ALL_PAGE_RECORDS) { assert.equal(buildPageJsonLd(r), null); assert.equal(gatedPageMetadata(r), null) }
})

test("NAP is never rendered from siteConfig offices (F-04)", () => {
  const src = strip(read("components/pages/location-overview.tsx"))
  assert.ok(!/siteConfig|\.offices|office\.(address|label|name)/.test(src))
  assert.ok(/nap\.(streetAddress|branchDesignation|displayName)/.test(src))
  const ld = read("lib/seo/page-json-ld.ts")
  assert.ok(!/siteConfig\.offices|office\.address|office\.label/.test(strip(ld)))
})

test("every field the components render is a field the gate scans (F-06)", () => {
  const rendered = { page: new Set(), nap: new Set(), section: new Set() }
  for (const f of readdirSync(path.join(ROOT, "components/pages"))) {
    const src = strip(read(`components/pages/${f}`))
    for (const m of src.matchAll(/\bpage\.(\w+)/g)) rendered.page.add(m[1])
    for (const m of src.matchAll(/\bnap\.(\w+)/g)) rendered.nap.add(m[1])
    for (const m of src.matchAll(/\bsection\.(\w+)/g)) rendered.section.add(m[1])
  }
  // fields that carry visitor-visible text must be scanned by the gate (each has a rejection case in the shared table)
  assert.deepEqual([...rendered.nap].sort(), ["branchDesignation", "displayName", "locality", "streetAddress"])
  assert.deepEqual([...rendered.section].sort(), ["body", "heading", "id"])
  const allowedPage = new Set(["kind", "serviceId", "sections", "nap", "verifiedCoverage"])
  for (const k of rendered.page) assert.ok(allowedPage.has(k), `components read an unreviewed field: page.${k}`)
  const names = W.runCases(gate).map((r) => r.name)
  for (const needle of ["section heading", "NAP name", "NAP designation", "NAP address", "area text"]) assert.ok(names.some((n) => n.includes(needle)), needle)
})

test("sitemap and robots are unchanged; the sitemap never breaks and lists no new URL (F-09)", () => {
  const entries = sitemap()
  assert.deepEqual(entries.map((e) => e.url), ["https://www.jolusecurity.com"])
  assert.deepEqual(robots().rules, [{ userAgent: "*", allow: "/", disallow: ["/api/"] }])
  assert.equal(robots().sitemap, "https://www.jolusecurity.com/sitemap.xml")
  assert.ok(/try \{[\s\S]*publishedPagePaths\(\)[\s\S]*\} catch/.test(read("app/sitemap.ts")))
})

test("the publication manifest matches the route files that exist (vacuous while empty)", () => {
  for (const e of PUBLICATION_MANIFEST) {
    assert.ok(existsSync(path.join(ROOT, e.routeFile)), `${e.routeFile} missing`)
    const src = read(e.routeFile)
    assert.ok(/PublishedPage/.test(src) && src.includes(e.publicPath.split("/")[2]), `${e.routeFile} does not render ${e.publicPath}`)
    assert.ok(/gatedPageMetadata|generateMetadata/.test(src), `${e.routeFile} has no metadata`)
  }
  assert.ok(!existsSync(path.join(ROOT, "app/services")) && !existsSync(path.join(ROOT, "app/locations")))
  const routes = []
  const walk = (d) => { for (const n of readdirSync(d)) { const p = path.join(d, n); if (statSync(p).isDirectory()) walk(p); else routes.push(p) } }
  walk(path.join(ROOT, "app"))
  assert.ok(!routes.some((f) => /\[.*\]/.test(f)), "no dynamic route")
  for (const f of routes.filter((f) => /\.(tsx?|mjs)$/.test(f))) assert.ok(!/components\/pages\//.test(read(path.relative(ROOT, f))), f)
})

test("no public structured-data, navigation or link exposure while unpublished", () => {
  const home = serializeJsonLd(buildHomeJsonLd())
  assert.ok(!/jolusecurity\.com\/(services|locations)/.test(home))
  for (const f of ["app/layout.tsx", "app/page.tsx", "app/blog/page.tsx"]) assert.ok(!/page-json-ld|buildPageJsonLd/.test(read(f)), f)
  for (const f of ["components/navbar.tsx", "components/site-footer.tsx", "components/services-index.tsx", "components/services-section.tsx", "components/contact-section.tsx", "components/mobile-action-bar.tsx", "app/page.tsx", "app/layout.tsx"]) {
    const src = read(f)
    assert.ok(!/["'`]\/(services|locations)\//.test(src), `${f} links to a new page`)
    assert.ok(!/publication-gate|page-records|components\/pages\//.test(src), `${f} imports the new infrastructure`)
  }
  assert.ok(/publishedPagePaths\(\)/.test(read("components/pages/internal-links.tsx")))
})

test("no runtime switch or clock: the gate reads no environment, request, clock or global state", () => {
  for (const f of ["lib/seo/publication-gate.ts", "lib/seo/page-records.ts", "lib/seo/evidence-ledger.ts", "lib/seo/page-json-ld.ts", "lib/seo/page-metadata.ts", "lib/seo/page-resolve.ts", "lib/seo/publication-requirements.ts", "lib/seo/publication-manifest.ts", "lib/seo/publication-deps.ts", "lib/seo/freeze.ts"]) {
    assert.ok(!/process\.env|import\.meta\.env|headers\(|cookies\(|searchParams|localStorage|globalThis|Date\.now|new Date\(\)|Math\.random|fetch\(/.test(strip(read(f))), f)
  }
})

test("components are server components with no invented claims, testimonials, badges, statistics or HTML injection", () => {
  const dir = path.join(ROOT, "components/pages")
  const files = readdirSync(dir)
  assert.equal(files.length, 7)
  for (const f of files) {
    const src = readFileSync(path.join(dir, f), "utf8")
    assert.ok(!/["']use client["']/.test(src), `${f} must be a server component`)
    assert.ok(!/dangerouslySetInnerHTML|innerHTML|<img|<Image|lovable-uploads/.test(src), f)
    const text = [...src.matchAll(/>\s*([^<>{}]*[A-Za-z][^<>{}]*)\s*</g)].map((m) => m[1]).join(" ") + [...src.matchAll(/(?:eyebrow|title|heading)=["']([^"']+)["']/g)].map((m) => m[1]).join(" ")
    assert.ok(!/\b(testimonial|award|certified|licensed|accredited|24\/7|trusted|best|leading|guarantee|\d+\+|\d+ ?%|years)\b/i.test(text), `${f}: ${text}`)
  }
})

test("existing frozen files and the enquiry system are untouched (git diff against the parent)", { skip: !existsSync(path.join(ROOT, ".git")) && !existsSync(path.join(ROOT, "../.git")) }, () => {
  let out = ""
  try { out = execSync("git diff --name-only a9dd82047390848d6b077b76b68c9b27dd7fee9b", { cwd: ROOT, encoding: "utf8" }) } catch { return }
  const allowed = [/^app\/sitemap\.ts$/, /^lib\/seo\/(page-models|evidence-ledger|publication-requirements|page-records|page-resolve|publication-gate|page-json-ld|page-metadata|publication-manifest|publication-deps|freeze)\.ts$/, /^components\/pages\//, /^tests\/(seo|helpers)\//, /^docs\/seo\//]
  for (const f of out.split("\n").filter(Boolean)) assert.ok(allowed.some((a) => a.test(f)), `unexpected change: ${f}`)
  assert.ok(!/(^|\n)(app\/api|lib\/enquiry|components\/enquiry-form|lib\/claims|lib\/photo-library|public\/|app\/page|app\/layout|app\/blog|next\.config)/.test(out))
})
