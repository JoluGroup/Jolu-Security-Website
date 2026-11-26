// Release 04 (Lane SEO): route architecture reconciliation. One intent = one canonical URL; nothing planned is live.
import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import path from "node:path"
import { describe, it } from "node:test"

const ROOT = path.resolve(import.meta.dirname, "../..")
const RA = await import("@/lib/seo/route-architecture")
const { WORKBOOK_KEYWORDS } = await import("@/lib/seo/workbook-keywords")
const { LIVE_PAGES } = await import("@/lib/seo/pages")
const { SERVICE_PAGE_RECORDS, LOCATION_PAGE_RECORDS } = await import("@/lib/seo/page-records")
const { getLocationOpportunities, eligibleLocalBusinessLocations } = await import("@/lib/seo/location-support")
const { buildHomeJsonLd } = await import("@/lib/seo/json-ld")
const nextConfig = (await import("node:fs")).readFileSync(path.join(ROOT, "next.config.ts"), "utf8")

describe("canonical paths", () => {
  it("trailingSlash is not configured, so canonical paths have no trailing slash and the workbook's slashes are normalised", () => {
    assert.ok(!/trailingSlash/.test(nextConfig))
    for (const e of RA.buildRouteTable()) assert.ok(e.path === "/" || !e.path.endsWith("/"), e.path)
    assert.equal(RA.stripSlash("/services/manned-guarding/"), "/services/manned-guarding")
    assert.equal(RA.stripSlash("/"), "/")
  })
  it("every service record's public path equals its planned path without the slash", () => {
    for (const r of [...SERVICE_PAGE_RECORDS, ...LOCATION_PAGE_RECORDS]) assert.equal(RA.stripSlash(r.plannedPath), r.publicPath)
  })
  it("the route table has one entry per canonical path and no path collides with another intent", () => {
    const table = RA.buildRouteTable()
    assert.equal(new Set(table.map((e) => e.path)).size, table.length)
    const primaries = table.filter((e) => e.primaryKeyword && e.kind !== "insight").map((e) => e.primaryKeyword.toLowerCase())
    assert.equal(new Set(primaries).size, primaries.length)
  })
})

describe("keyword to route reconciliation", () => {
  const table = RA.buildRouteTable()
  const byPath = new Map(table.map((e) => [e.path, e]))
  it("every one of the 311 workbook keywords lands on exactly one known route or is deliberately unassigned", () => {
    assert.equal(WORKBOOK_KEYWORDS.length, 311)
    let unassigned = 0
    for (const k of WORKBOOK_KEYWORDS) {
      const p = RA.reconciledPath(k)
      if (p === null) { unassigned++; assert.ok(RA.KEYWORD_OVERRIDES[k.id], k.id); continue }
      assert.ok(byPath.has(p), `${k.id} -> ${p}`)
    }
    assert.equal(unassigned, 2)
    assert.equal(table.reduce((n, e) => n + e.keywordCount, 0), 311 - unassigned)
  })
  it("the four contradictory workbook rows are reconciled with reasons, and nothing else is overridden", () => {
    assert.deepEqual(Object.keys(RA.KEYWORD_OVERRIDES).sort(), ["KW-086", "KW-087", "KW-093", "KW-094"])
    const by = (id) => WORKBOOK_KEYWORDS.find((k) => k.id === id)
    assert.equal(RA.reconciledPath(by("KW-093")), "/locations/nakuru")
    assert.equal(RA.reconciledPath(by("KW-094")), "/locations/rongo")
    assert.equal(RA.reconciledPath(by("KW-086")), null)
    assert.equal(RA.reconciledPath(by("KW-087")), null)
    for (const o of Object.values(RA.KEYWORD_OVERRIDES)) assert.ok(o.reason.length > 30)
  })
  it("the generated workbook data is unchanged (the overlay does not rewrite research data)", () => {
    assert.equal(WORKBOOK_KEYWORDS.find((k) => k.id === "KW-094").plannedPath, "/locations/nairobi/")
  })
  it("Migori has no page of its own: it is consolidated on the Rongo route", () => {
    assert.ok(!byPath.has("/locations/migori"))
    // company-level Migori keywords go to the Rongo page; service+Migori keywords stay on their service page (no doorway pages)
    const company = WORKBOOK_KEYWORDS.filter((k) => /migori/i.test(k.keyword) && k.cluster === "Security Companies")
    assert.equal(company.length, 3)
    assert.ok(company.every((k) => RA.reconciledPath(k) === "/locations/rongo"))
    for (const k of WORKBOOK_KEYWORDS.filter((k) => /migori/i.test(k.keyword) && k.cluster !== "Security Companies")) assert.match(RA.reconciledPath(k), /^\/services\//)
  })
})

describe("AEO briefs map onto existing intents, never a second URL", () => {
  it("each of C01-C15 appears once", () => {
    assert.deepEqual(RA.BRIEF_ROUTES.map((b) => b.id), Array.from({ length: 15 }, (_, i) => `C${String(i + 1).padStart(2, "0")}`))
  })
  it("every routed brief lands on a canonical path in the table, and the brief's own proposed variants are not routes", () => {
    const table = RA.buildRouteTable()
    for (const b of RA.BRIEF_ROUTES) {
      if (b.canonical === null) continue
      assert.ok(table.some((e) => e.path === b.canonical), `${b.id} -> ${b.canonical}`)
      if (b.proposed.startsWith("/") && b.proposed !== b.canonical) assert.ok(!table.some((e) => e.path === b.proposed), `${b.id}: ${b.proposed} must not become a second URL`)
    }
    for (const id of ["C08", "C09", "C10"]) assert.ok(RA.BRIEF_ROUTES.find((b) => b.id === id).canonical.startsWith("/locations/"))
  })
  it("C12 (tender checklist) is a new intent with no planned URL, and nothing is routed for it", () => {
    assert.equal(RA.BRIEF_ROUTES.find((b) => b.id === "C12").canonical, null)
    assert.ok(!RA.buildRouteTable().some((e) => e.path === "/insights/security-procurement"))
  })
  it("two briefs share a canonical route only where one page serves both (none today)", () => {
    const seen = RA.BRIEF_ROUTES.filter((b) => b.canonical).map((b) => b.canonical)
    assert.equal(new Set(seen).size, seen.length)
  })
})

describe("status: only the homepage and the Blog placeholder are live; nothing planned or built is reachable", () => {
  const table = RA.buildRouteTable()
  it("live routes equal LIVE_PAGES; the Blog is noindex", () => {
    assert.deepEqual(table.filter((e) => e.status === "live" || e.status === "live-noindex").map((e) => e.path).sort(), LIVE_PAGES.map((p) => p.path).sort())
    assert.equal(table.find((e) => e.path === "/blog").status, "live-noindex")
  })
  it("the seven services are built-unpublished; locations are gated; industries and /about have no gate support yet", () => {
    for (const e of table.filter((e) => e.kind === "service")) assert.equal(e.status, "built-unpublished", e.path)
    for (const e of table.filter((e) => e.kind === "location")) assert.equal(e.status, "planned-gated", e.path)
    for (const e of table.filter((e) => e.kind === "industry")) assert.equal(e.status, "planned-no-gate-support", e.path)
    assert.equal(table.find((e) => e.path === "/about").status, "planned-no-gate-support")
    for (const e of table.filter((e) => e.kind === "insight")) assert.equal(e.status, "editorial-planned")
  })
  it("no route file exists for any non-live path", () => {
    for (const e of table.filter((e) => e.status !== "live" && e.status !== "live-noindex")) {
      assert.equal(existsSync(path.join(ROOT, "app", e.path.slice(1), "page.tsx")), false, e.path)
    }
  })
})

describe("typed location support: opportunities only", () => {
  it("lists Nairobi, Nakuru and Rongo as unverified, unpublished, with the canonical evidence the gate requires", () => {
    const locs = getLocationOpportunities()
    assert.deepEqual(locs.map((l) => l.locationId), ["nairobi", "nakuru", "rongo"])
    for (const l of locs) {
      assert.equal(l.officeVerified, false)
      assert.equal(l.coverageVerified, false)
      assert.equal(l.pageStatus, "unpublished")
      assert.ok(l.keywordCount > 0)
      assert.ok(l.requiredEvidence.length > 5)
      assert.ok(!("address" in l) && !("nap" in l) && !("telephone" in l))
    }
  })
  it("reconciled keyword counts: Nairobi 5, Nakuru 3, Rongo 5 (KW-093 and KW-094 moved, near-me rows unassigned)", () => {
    const c = Object.fromEntries(getLocationOpportunities().map((l) => [l.locationId, l.keywordCount]))
    assert.deepEqual(c, { nairobi: 5, nakuru: 3, rongo: 5 })
  })
  it("no location is eligible for LocalBusiness, and the homepage graph has no LocalBusiness, address or areaServed", () => {
    assert.deepEqual([...eligibleLocalBusinessLocations()], [])
    const json = JSON.stringify(buildHomeJsonLd())
    assert.ok(!/LocalBusiness|PostalAddress|areaServed|streetAddress|"address"/.test(json))
  })
})
