import assert from "node:assert/strict"
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { describe, it } from "node:test"
import { claimsIn, strictClaimsIn } from "../helpers/claim-patterns.mjs"

const { SERVICE_BRIEFS, COMMON_EVIDENCE } = await import("@/lib/seo/service-briefs")
const { renderServiceDocs, briefFileName, SCOPE_TERMS } = await import("@/lib/seo/service-docs")
const { PUBLISHING_CHECKLIST } = await import("@/lib/seo/service-publishing-checklist")
const { PLANNED_PAGES } = await import("@/lib/seo/planned-pages")
const { WORKBOOK_KEYWORDS } = await import("@/lib/seo/workbook-keywords")
const { keywordsForPath } = await import("@/lib/seo/keyword-map")
const { LIVE_PAGES } = await import("@/lib/seo/pages")
const { default: sitemap } = await import("@/app/sitemap")
const { CLAIMS } = await import("@/lib/claims")
const { SERVICES, isServiceId } = await import("@/lib/services")
const { PROTECTION_LAYERS } = await import("@/lib/protection-layers")
const { siteConfig } = await import("@/lib/site-config")

const ROOT = path.resolve(import.meta.dirname, "../..")
const DOCS = path.join(ROOT, "docs/seo/service-pages")
const SITE = "https://www.jolusecurity.com"
const plannedService = PLANNED_PAGES.filter((p) => p.kind === "service")
const pageOf = (b) => PLANNED_PAGES.find((p) => p.path === b.path)
const briefDoc = (b) => readFileSync(path.join(DOCS, briefFileName(b)), "utf8")
const idsIn = (text) => [...text.matchAll(/^\| (KW-\d{3}) \|/gm)].map((m) => m[1])
const section = (doc, heading) => {
  const start = doc.indexOf(heading)
  assert.ok(start >= 0, `missing section ${heading}`)
  const rest = doc.slice(start + heading.length)
  const end = rest.search(/\n#{2,3} /)
  return end < 0 ? rest : rest.slice(0, end)
}

describe("service briefs cover exactly the planned service pages, in a rule-based order", () => {
  it("one brief per planned service page, nothing extra", () => {
    assert.equal(SERVICE_BRIEFS.length, 7)
    assert.deepEqual(SERVICE_BRIEFS.map((b) => b.path).sort(), plannedService.map((p) => p.path).sort())
    assert.deepEqual(SERVICE_BRIEFS.map((b) => b.rank), [1, 2, 3, 4, 5, 6, 7])
  })
  it("rank follows the stated rule: page priority, then P1 keyword count, then PAGE MAP row order", () => {
    const PAGE_MAP_ORDER = ["manned-guarding", "events-security", "k9-unit", "cctv-installation", "electric-fencing", "alarm-response", "vip-close-protection"] // PAGE MAP & META rows 6-12
    const key = (b) => [pageOf(b).priority, -keywordsForPath(b.path).filter((k) => k.priority === "P1").length, PAGE_MAP_ORDER.indexOf(b.serviceId)]
    const expected = [...SERVICE_BRIEFS].sort((a, b) => {
      const ka = key(a), kb = key(b)
      return ka[0].localeCompare(kb[0]) || ka[1] - kb[1] || ka[2] - kb[2]
    })
    assert.deepEqual(SERVICE_BRIEFS.map((b) => b.serviceId), expected.map((b) => b.serviceId))
  })
  it("waves and roadmap windows match the workbook (P1 = Week 3, P2 = Weeks 6-7)", () => {
    for (const b of SERVICE_BRIEFS) {
      const p1 = pageOf(b).priority === "P1"
      assert.equal(b.wave, p1 ? 1 : 2, b.path)
      assert.equal(b.roadmapWindow, p1 ? "Week 3" : "Weeks 6-7", b.path)
    }
    assert.deepEqual(SERVICE_BRIEFS.filter((b) => b.wave === 1).map((b) => b.serviceId), ["manned-guarding", "cctv-installation", "electric-fencing"])
  })
  it("each brief points at a real service and a protection layer that names it", () => {
    for (const b of SERVICE_BRIEFS) {
      const service = SERVICES.find((s) => s.id === b.serviceId)
      assert.ok(service, b.serviceId)
      const layer = PROTECTION_LAYERS.find((l) => l.id === b.layerId)
      assert.ok(layer, b.layerId)
      assert.ok(layer.services.toLowerCase().includes(service.name.toLowerCase().replace(/ services$/, "")), `${service.name} not in layer ${layer.services}`)
      assert.equal(isServiceId(b.serviceId), true)
    }
  })
})

describe("keyword mapping: nothing lost, nothing on two pages", () => {
  it("every keyword of every service page is accounted for exactly once in its brief", () => {
    let total = 0
    for (const b of SERVICE_BRIEFS) {
      const page = pageOf(b)
      const doc = briefDoc(b)
      const listed = [
        ...idsIn(section(doc, "### Priority supporting keywords")),
        ...idsIn(section(doc, "### Other supporting keywords")),
        ...idsIn(section(doc, "### Held back: claim-sensitive keywords")),
      ]
      assert.equal(new Set(listed).size, listed.length, `${b.path}: duplicate ids in brief`)
      const expected = keywordsForPath(b.path).filter((k) => k.keyword.toLowerCase() !== page.primaryKeyword.toLowerCase()).map((k) => k.id)
      assert.deepEqual([...listed].sort(), [...expected].sort(), b.path)
      total += keywordsForPath(b.path).length
    }
    assert.equal(total, 250)
    assert.equal(total, WORKBOOK_KEYWORDS.filter((k) => k.plannedPath.startsWith("/services/")).length)
  })
  it("the primary keyword, title and priority equal the workbook-derived planned page", () => {
    for (const b of SERVICE_BRIEFS) {
      const page = pageOf(b)
      assert.equal(b.seoTitle, page.titleDraft, b.path)
      assert.ok(briefDoc(b).includes(`| Primary keyword | ${page.primaryKeyword} |`), b.path)
      assert.ok(briefDoc(b).includes(`| Workbook page priority | ${page.priority} |`), b.path)
    }
  })
  it("held keywords are exactly the claim-sensitive ones, each with handling text for its category", () => {
    for (const b of SERVICE_BRIEFS) {
      const held = keywordsForPath(b.path).filter((k) => k.claimSensitive.length > 0)
      const doc = briefDoc(b)
      const heldTable = section(doc, "### Held back: claim-sensitive keywords")
      assert.deepEqual(idsIn(heldTable).sort(), held.map((k) => k.id).sort(), b.path)
      assert.ok(doc.includes(`${held.length} held back as claim-sensitive`), b.path)
      for (const k of held) for (const c of k.claimSensitive) assert.ok(heldTable.includes(c), `${k.id} ${c}`)
    }
  })
  it("held keywords never appear in proposed titles, descriptions, H1s or outlines", () => {
    for (const b of SERVICE_BRIEFS) {
      const copy = JSON.stringify([b.seoTitle, b.seoDescription, b.h1, b.outline]).toLowerCase()
      for (const k of keywordsForPath(b.path).filter((k) => k.claimSensitive.length > 0)) {
        assert.equal(copy.includes(k.keyword.toLowerCase()), false, `${b.path}: ${k.id} ${k.keyword}`)
      }
    }
  })
  it("scope-dependent keywords listed in each brief exist on that page and match the rule", () => {
    for (const b of SERVICE_BRIEFS) {
      const scopeIds = idsIn(section(briefDoc(b), "### Scope-dependent keywords"))
      const onPage = new Map(keywordsForPath(b.path).map((k) => [k.id, k]))
      for (const id of scopeIds) {
        assert.ok(onPage.has(id), `${b.path} ${id}`)
        assert.ok(SCOPE_TERMS.test(onPage.get(id).keyword), id)
      }
      const expected = keywordsForPath(b.path).filter((k) => k.claimSensitive.length === 0 && SCOPE_TERMS.test(k.keyword) && k.keyword.toLowerCase() !== pageOf(b).primaryKeyword.toLowerCase())
      assert.deepEqual(scopeIds.sort(), expected.map((k) => k.id).sort(), b.path)
    }
  })
  it("guide keywords are real editorial rows", () => {
    for (const b of SERVICE_BRIEFS) {
      assert.ok(b.guideKeywordIds.length > 0, b.path)
      for (const id of b.guideKeywordIds) {
        const k = WORKBOOK_KEYWORDS.find((x) => x.id === id)
        assert.ok(k && k.disposition === "editorial", `${b.path} ${id}`)
      }
    }
  })
})

describe("proposed metadata and copy make no unsupported claims", () => {
  it("titles: unique, 60 characters or fewer, brand suffix", () => {
    const titles = SERVICE_BRIEFS.map((b) => b.seoTitle)
    assert.equal(new Set(titles).size, titles.length)
    for (const t of titles) assert.ok(t.length <= 60 && t.endsWith(" | JOLU SECURITY"), t)
  })
  it("descriptions: unique, 70-160 characters, primary keyword, brand, existing approved wording, no claims", () => {
    const seen = new Set()
    for (const b of SERVICE_BRIEFS) {
      const d = b.seoDescription
      const service = SERVICES.find((s) => s.id === b.serviceId)
      assert.ok(d.length >= 70 && d.length <= 160, `${b.path} ${d.length}`)
      assert.ok(d.toLowerCase().startsWith(pageOf(b).primaryKeyword.toLowerCase()), b.path)
      assert.ok(d.includes("JOLU SECURITY"), b.path)
      assert.ok(d.includes(service.description), `${b.path}: existing wording not used verbatim`)
      assert.ok(d.endsWith("Request a quote."), b.path)
      assert.equal(seen.has(d), false)
      seen.add(d)
    }
  })
  it("H1 is the primary keyword, capitalised", () => {
    for (const b of SERVICE_BRIEFS) {
      const pk = pageOf(b).primaryKeyword
      assert.equal(b.h1, pk[0].toUpperCase() + pk.slice(1), b.path)
    }
  })
  it("title, description, H1 and outline contain no claim phrases (strict list incl. legacy wording)", () => {
    for (const b of SERVICE_BRIEFS) {
      const copy = [b.seoTitle, b.seoDescription, b.h1, ...b.outline.flatMap((s) => [s.heading, s.purpose])].join(" ")
      assert.deepEqual(strictClaimsIn(copy), [], b.path)
    }
  })
  it("the strict list really does catch legacy phrases (guard against a toothless scanner)", () => {
    for (const phrase of ["swift and reliable response", "standby 24/7", "state-of-the-art cameras", "highly trained dogs", "elite VIP protection", "detect explosives", "bouncer services", "licensed and compliant", "within 30 minutes"]) {
      assert.ok(strictClaimsIn(phrase).length > 0, phrase)
    }
    assert.deepEqual(claimsIn("Security guards stationed at the sites and entrances you choose."), [])
  })
})

describe("evidence and claims", () => {
  const allIds = [...COMMON_EVIDENCE, ...SERVICE_BRIEFS.flatMap((b) => b.serviceEvidence)].map((e) => e.id)
  it("evidence ids are unique, owned, and say what they block", () => {
    assert.equal(new Set(allIds).size, allIds.length)
    assert.deepEqual(COMMON_EVIDENCE.map((e) => e.id), Array.from({ length: 11 }, (_, i) => `C${i + 1}`))
    for (const e of [...COMMON_EVIDENCE, ...SERVICE_BRIEFS.flatMap((b) => b.serviceEvidence)]) {
      assert.ok(e.requirement.length > 30 && e.owner && ["publication", "claim", "section"].includes(e.blocks), e.id)
    }
    assert.ok(COMMON_EVIDENCE.filter((e) => e.blocks === "publication").length >= 6)
  })
  it("every held-keyword category on a page has an evidence item that covers it", () => {
    const cover = {
      pricing: /pricing/i,
      "availability or response time": /availab|24-hour|response-time|response time/i,
      "superlative or quality": /\bbest\b|\btop\b|quality/i,
      licensing: /PSRA|licen[cs]e|registration/i,
      "local presence or proximity": /office|NAP/i,
    }
    for (const b of SERVICE_BRIEFS) {
      const text = [...COMMON_EVIDENCE, ...b.serviceEvidence].map((e) => e.requirement).join(" ")
      for (const cat of new Set(keywordsForPath(b.path).flatMap((k) => k.claimSensitive))) assert.match(text, cover[cat], `${b.path}: ${cat}`)
    }
  })
  it("registry claims named by a brief exist and are all still needs-evidence", () => {
    for (const b of SERVICE_BRIEFS) {
      assert.ok(b.registryClaimIds.includes("licensed-compliant") && b.registryClaimIds.includes("reply-time"), b.path)
      for (const id of b.registryClaimIds) {
        const claim = CLAIMS.find((c) => c.id === id)
        assert.ok(claim, id)
        assert.equal(claim.status, "needs-evidence", id)
      }
    }
    assert.equal(CLAIMS.some((c) => c.status === "approved"), false)
  })
  it("pages whose keywords promise 24-hour or speed list the availability claim; only guarding lists guards-deployed", () => {
    for (const b of SERVICE_BRIEFS) {
      const availability = keywordsForPath(b.path).some((k) => k.claimSensitive.includes("availability or response time"))
      if (availability) assert.ok(b.registryClaimIds.includes("availability-24-7"), b.path)
      assert.equal(b.registryClaimIds.includes("guards-deployed"), b.serviceId === "manned-guarding")
    }
  })
  it("layer headlines quoted in legacy wording match the live headline text", () => {
    for (const b of SERVICE_BRIEFS) {
      const layer = PROTECTION_LAYERS.find((l) => l.id === b.layerId)
      const headline = `${layer.headline.lead} ${layer.headline.emphasis}`
      assert.ok(b.legacyWording.some((l) => l.wording.includes(headline)), `${b.path}: ${headline}`)
    }
  })
  it("the existing-wording table in each brief quotes the live service description and layer text verbatim", () => {
    for (const b of SERVICE_BRIEFS) {
      const service = SERVICES.find((s) => s.id === b.serviceId)
      const layer = PROTECTION_LAYERS.find((l) => l.id === b.layerId)
      const doc = briefDoc(b)
      assert.ok(doc.includes(`| lib/services.ts, ${service.name} | ${service.description} |`), b.path)
      assert.ok(doc.includes(layer.description), b.path)
    }
  })
  it("states that no photo may be shown because every clearance is pending", () => {
    const photos = readFileSync(path.join(ROOT, "lib/photo-library.ts"), "utf8")
    assert.equal(/status:\s*"cleared"/.test(photos), false)
    for (const b of SERVICE_BRIEFS) assert.ok(briefDoc(b).includes("All entries in `lib/photo-library.ts` have pending rights clearance"), b.path)
  })
  it("the legacy-document discrepancies are real: the PDFs exist, are linked, and the website holds different office data", () => {
    for (const d of siteConfig.downloads) assert.ok(existsSync(path.join(ROOT, "public", d.href.replace(/^\//, ""))), d.href)
    const evidence = readFileSync(path.join(DOCS, "evidence-and-approvals.md"), "utf8")
    for (const d of siteConfig.downloads) assert.ok(evidence.includes(d.href), d.href)
    assert.equal(siteConfig.offices.some((o) => /Eldoret|Kisumu|KFA|Geoffrey Kamau/i.test(o.address + o.name)), false)
    for (const word of ["Eldoret", "Kisumu", "KFA Building", "Geoffrey Kamau", "769 281 518"]) assert.ok(evidence.includes(word), word)
    assert.equal(JSON.stringify(siteConfig.contact).includes("769281518"), false)
  })
})

describe("internal links resolve", () => {
  const plannedPaths = new Set(PLANNED_PAGES.map((p) => p.path))
  const editorialUrls = new Set(WORKBOOK_KEYWORDS.filter((k) => k.disposition === "editorial").map((k) => k.workbookUrl))
  it("existing links point at real live routes, anchors and a valid enquiry preselect", () => {
    for (const b of SERVICE_BRIEFS) {
      const existing = b.internalLinks.filter((l) => l.status === "exists")
      assert.deepEqual(existing.map((l) => l.to), [`/?service=${b.serviceId}#contact`, siteConfig.servicesHref], b.path)
      assert.equal(isServiceId(new URL(existing[0].to, SITE).searchParams.get("service")), true)
      assert.equal(LIVE_PAGES.some((p) => p.path === new URL(existing[0].to, SITE).pathname), true)
    }
  })
  it("every other link targets a planned page or workbook editorial URL, never itself, never an unplanned path", () => {
    for (const b of SERVICE_BRIEFS) {
      for (const l of b.internalLinks.filter((l) => l.status !== "exists")) {
        const ok = l.to === "/" || plannedPaths.has(l.to) || editorialUrls.has(l.to)
        assert.ok(ok, `${b.path} -> ${l.to}`)
        assert.notEqual(l.to, b.path)
        assert.ok(["planned-after-publication", "blocked-until-target-published"].includes(l.status))
      }
    }
  })
  it("related services are other briefed services, 2-3 each, and links to them are not live yet", () => {
    for (const b of SERVICE_BRIEFS) {
      assert.ok(b.relatedServiceIds.length >= 2 && b.relatedServiceIds.length <= 3, b.path)
      assert.equal(b.relatedServiceIds.includes(b.serviceId), false)
      for (const id of b.relatedServiceIds) assert.ok(SERVICE_BRIEFS.some((o) => o.serviceId === id), id)
      const relatedLinks = b.internalLinks.filter((l) => l.status === "planned-after-publication" && l.to.startsWith("/services/"))
      assert.equal(relatedLinks.length, b.relatedServiceIds.length, b.path)
    }
  })
  it("office links name only the three approved offices' pages and no Migori page", () => {
    for (const b of SERVICE_BRIEFS) {
      const offices = b.internalLinks.filter((l) => l.to.startsWith("/locations/")).map((l) => l.to)
      assert.deepEqual(offices, ["/locations/nairobi/", "/locations/nakuru/", "/locations/rongo/"], b.path)
    }
  })
})

describe("nothing is published", () => {
  it("no service route exists and no service path is live or in the sitemap", () => {
    assert.equal(existsSync(path.join(ROOT, "app/services")), false)
    const urls = new Set(sitemap().map((e) => e.url))
    for (const b of SERVICE_BRIEFS) {
      assert.equal(LIVE_PAGES.some((p) => p.path.startsWith("/services")), false)
      assert.equal(urls.has(`${SITE}${b.path.replace(/\/$/, "")}`) || urls.has(`${SITE}${b.path}`), false, b.path)
    }
    assert.deepEqual([...urls], [SITE])
  })
  it("the planning specs are not imported by any page or component", () => {
    const hits = []
    const walk = (dir) => {
      for (const name of readdirSync(dir)) {
        const full = path.join(dir, name)
        if (statSync(full).isDirectory()) walk(full)
        else if (/\.(tsx?|mjs)$/.test(name) && /service-briefs|service-docs|service-publishing-checklist/.test(readFileSync(full, "utf8"))) hits.push(path.relative(ROOT, full))
      }
    }
    for (const d of ["app", "components"]) walk(path.join(ROOT, d))
    assert.deepEqual(hits, [])
  })
})

describe("documents are generated from the specs and complete", () => {
  it("every generated file equals the committed file (run scripts/seo/build-service-docs.mjs after changing a spec)", () => {
    const files = renderServiceDocs()
    assert.equal(Object.keys(files).length, 10)
    for (const [name, content] of Object.entries(files)) {
      assert.equal(readFileSync(path.join(DOCS, name), "utf8"), content, name)
    }
  })
  it("the committed docs folder holds exactly the expected files", () => {
    const listed = []
    const walk = (dir, prefix = "") => {
      for (const name of readdirSync(dir)) {
        const full = path.join(dir, name)
        if (statSync(full).isDirectory()) walk(full, `${prefix}${name}/`)
        else listed.push(`${prefix}${name}`)
      }
    }
    walk(DOCS)
    assert.deepEqual(listed.sort(), [...Object.keys(renderServiceDocs()), "page-architecture.md"].sort())
  })
  it("each brief states it is planned, not published, and has every required section", () => {
    for (const b of SERVICE_BRIEFS) {
      const doc = briefDoc(b)
      assert.ok(doc.includes("Status: PLANNED, NOT PUBLISHED"))
      for (const h of ["## Summary", "## Proposed metadata", "## Keywords", "## Page outline", "## Existing approved wording", "## Missing operational evidence", "## Claims requiring approval", "## Suggested internal links"]) assert.ok(doc.includes(h), `${b.path}: ${h}`)
      assert.ok(doc.includes(`\`${SITE}${b.path.replace(/\/$/, "")}\``), b.path)
    }
  })
  it("the plan ranks all seven pages and its totals match the data", () => {
    const plan = readFileSync(path.join(DOCS, "implementation-plan.md"), "utf8")
    for (const b of SERVICE_BRIEFS) assert.ok(plan.includes(`| ${b.rank} | \`${b.path}\` |`), b.path)
    const wave1 = SERVICE_BRIEFS.filter((b) => b.wave === 1).flatMap((b) => keywordsForPath(b.path))
    assert.ok(plan.includes(`${wave1.length} of the 250 service keywords and ${wave1.filter((k) => k.priority === "P1").length} of the 81 service P1 keywords`))
  })
  it("the architecture proposal records the Next.js constraints it depends on", () => {
    const arch = readFileSync(path.join(DOCS, "page-architecture.md"), "utf8")
    for (const phrase of ["PROPOSAL ONLY", "generateStaticParams", "at least one param", "dynamicParams = false", "trailingSlash", "await", "Service` node", "No price", "LIVE_PAGES", "frozen"]) assert.ok(arch.includes(phrase), phrase)
  })
  it("the checklist covers all ten TECHNICAL AUDIT areas plus governance, each with proof, and is rendered", () => {
    const areas = new Set(PUBLISHING_CHECKLIST.map((c) => c.area))
    for (const a of ["Indexation", "Information architecture", "Core Web Vitals", "Structured data", "Trust signals", "Conversion tracking", "On-page", "Images", "Security", "Content quality", "Governance"]) assert.ok(areas.has(a), a)
    for (const c of PUBLISHING_CHECKLIST) assert.ok(c.check.length > 20 && c.proof.length > 5 && c.source.length > 3)
    const doc = readFileSync(path.join(DOCS, "publishing-checklist.md"), "utf8")
    assert.equal((doc.match(/^\| \[ \] \|/gm) ?? []).length, PUBLISHING_CHECKLIST.length)
  })
  it("contains no search volume, difficulty, CPC, ranking or pricing figure", () => {
    for (const name of Object.keys(renderServiceDocs())) {
      const doc = readFileSync(path.join(DOCS, name), "utf8")
      assert.equal(/\b\d[\d,.]*\s*(searches|\/mo\b|per month|monthly searches|KES|USD|\$)/i.test(doc), false, name)
      assert.equal(/\b(difficulty|ranking|position|volume|cpc)\s*[:=]\s*\d/i.test(doc), false, name)
    }
  })
})
