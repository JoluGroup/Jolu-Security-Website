import assert from "node:assert/strict"
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { describe, it } from "node:test"

const { LOCATION_BRIEFS, COMMON_EVIDENCE, napFor, LOCATION_WORDS } = await import("@/lib/seo/location-briefs")
const { renderLocationDocs, briefFileName, OWNER_DECISIONS } = await import("@/lib/seo/location-docs")
const { LOCATION_CHECKLIST, STRUCTURED_DATA_RULES } = await import("@/lib/seo/location-publishing-checklist")
const { PLANNED_PAGES } = await import("@/lib/seo/planned-pages")
const { WORKBOOK_KEYWORDS } = await import("@/lib/seo/workbook-keywords")
const { keywordsForPath } = await import("@/lib/seo/keyword-map")
const { LIVE_PAGES } = await import("@/lib/seo/pages")
const { buildHomeJsonLd, serializeJsonLd } = await import("@/lib/seo/json-ld")
const { default: sitemap } = await import("@/app/sitemap")
const { CLAIMS } = await import("@/lib/claims")
const { SERVICES } = await import("@/lib/services")
const { siteConfig } = await import("@/lib/site-config")

const ROOT = path.resolve(import.meta.dirname, "../..")
const DOCS = path.join(ROOT, "docs/seo/location-pages")
const SITE = "https://www.jolusecurity.com"
const pageOf = (b) => PLANNED_PAGES.find((p) => p.path === b.path)
const doc = (b) => readFileSync(path.join(DOCS, briefFileName(b)), "utf8")
const read = (name) => readFileSync(path.join(DOCS, name), "utf8")
const idsIn = (text) => [...text.matchAll(/^\| (KW-\d{3}) \|/gm)].map((m) => m[1])
const section = (text, heading) => {
  const start = text.indexOf(heading)
  assert.ok(start >= 0, `missing section ${heading}`)
  const rest = text.slice(start + heading.length)
  const end = rest.search(/\n#{2,3} /)
  return end < 0 ? rest : rest.slice(0, end)
}
// Phrases a location page must not assert until evidenced. Mirrors the repository's claim scan and adds local-presence wording.
const CLAIM_PATTERNS = [
  /licen[cs]ed/i, /registered/i, /certified/i, /accredited/i, /compliant/i, /\bpsra\b/i,
  /24\s?\/\s?7/, /24[- ]hours?/i, /round[- ]the[- ]clock/i, /open now/i, /open (daily|every)/i,
  /(?<![\w-])best(?![\w-])/i, /(?<![\w-])top(?![\w-])/i, /(?<![\w-])leading(?![\w-])/i, /\btrusted\b/i, /\baward/i,
  /guarantee/i, /\brapid\b/i, /(?<![\w-])fast(?![\w-])/i, /within \d+/i, /\d+\+/, /since \d{4}/i,
  /testimonial/i, /\breviews?\b/i, /\bstars?\b/i, /\bcheap/i, /\baffordable\b/i, /\bnear me\b/i, /\bnearest\b/i, /\bclosest\b/i,
  /\bprice/i, /\bcost/i, /\bkm\b/i, /\bminutes\b/i, /\bwalk-in\b/i,
]
const claimsIn = (text) => CLAIM_PATTERNS.filter((rx) => rx.test(text)).map(String)
const HOURS_PATTERN = /\b\d{1,2}\s?[:.]\s?\d{2}\s?(am|pm)?\b|\b\d{1,2}\s?(am|pm)\b|\b(mon|tue|wed|thu|fri|sat|sun)[a-z]*\s*(-|to|–)\s*(mon|tue|wed|thu|fri|sat|sun)/i

describe("location briefs cover exactly the three planned location pages, one page per location", () => {
  it("three briefs match the planned location pages; ranks 1-3", () => {
    assert.deepEqual(LOCATION_BRIEFS.map((b) => b.path), ["/locations/nairobi/", "/locations/nakuru/", "/locations/rongo/"])
    assert.deepEqual(PLANNED_PAGES.filter((p) => p.kind === "location").map((p) => p.path).sort(), LOCATION_BRIEFS.map((b) => b.path).sort())
    assert.deepEqual(LOCATION_BRIEFS.map((b) => b.rank), [1, 2, 3])
  })
  it("there is no Migori page anywhere: no planned page, brief, slug, brief file or keyword path", () => {
    assert.equal(PLANNED_PAGES.some((p) => /migori/i.test(p.path)), false)
    assert.equal(LOCATION_BRIEFS.some((b) => /migori/i.test(b.path) || /migori/i.test(b.slug)), false)
    assert.equal(WORKBOOK_KEYWORDS.some((k) => /migori/i.test(k.plannedPath)), false)
    assert.equal(readdirSync(path.join(DOCS, "briefs")).some((f) => /migori/i.test(f)), false)
    assert.equal(existsSync(path.join(ROOT, "app/locations")), false)
    // The workbook's own suggestion survives only as workbookUrl on the two keywords moved to Rongo in 5A.1.
    assert.deepEqual(WORKBOOK_KEYWORDS.filter((k) => /migori/i.test(k.workbookUrl)).map((k) => k.id).sort(), ["KW-009", "KW-010"])
    for (const id of ["KW-009", "KW-010"]) assert.equal(WORKBOOK_KEYWORDS.find((k) => k.id === id).plannedPath, "/locations/rongo/")
  })
  it("no page is planned for the Eldoret and Kisumu branches that only the legacy PDF mentions", () => {
    assert.equal(PLANNED_PAGES.some((p) => /eldoret|kisumu/i.test(p.path + p.name)), false)
    assert.equal(siteConfig.offices.some((o) => /eldoret|kisumu/i.test(o.name + o.address)), false)
  })
  it("rank follows the stated rule: page priority, roadmap window, P1 keywords, PAGE MAP row order", () => {
    const PAGE_MAP_ORDER = ["nairobi", "nakuru", "rongo"] // PAGE MAP & META rows 'Location: Nairobi / Nakuru / Rongo'
    const WEEKS_5_6 = new Set(["nairobi", "nakuru"]) // 90 DAY ROADMAP: 'Publish differentiated Nairobi and Nakuru location pages'
    const key = (b) => [pageOf(b).priority, WEEKS_5_6.has(b.slug) ? 0 : 1, -keywordsForPath(b.path).filter((k) => k.priority === "P1").length, PAGE_MAP_ORDER.indexOf(b.slug)]
    const expected = [...LOCATION_BRIEFS].sort((a, b) => { const x = key(a), y = key(b); return x[0].localeCompare(y[0]) || x[1] - y[1] || x[2] - y[2] || x[3] - y[3] })
    assert.deepEqual(LOCATION_BRIEFS.map((b) => b.slug), expected.map((b) => b.slug))
  })
  it("waves and windows match the workbook (P1 pages Weeks 5-6, Rongo P2 with no window)", () => {
    for (const b of LOCATION_BRIEFS) {
      const p1 = pageOf(b).priority === "P1"
      assert.equal(b.wave, p1 ? 1 : 2, b.path)
      assert.equal(b.roadmapWindow.startsWith("Weeks 5-6"), p1, b.path)
    }
    assert.deepEqual(PLANNED_PAGES.filter((p) => p.kind === "location").map((p) => [p.slug ?? p.path, p.priority]), [["/locations/nairobi/", "P1"], ["/locations/nakuru/", "P1"], ["/locations/rongo/", "P2"]])
  })
  it("each brief points at an approved office on the site; Rongo is the office the site calls Migori", () => {
    for (const b of LOCATION_BRIEFS) assert.ok(siteConfig.offices.some((o) => o.name === b.officeName), b.officeName)
    assert.equal(LOCATION_BRIEFS.find((b) => b.slug === "rongo").officeName, "Migori")
    assert.match(siteConfig.offices.find((o) => o.name === "Migori").address, /Rongo/)
  })
})

describe("keyword mapping", () => {
  it("every keyword on a location page is documented exactly once in its brief", () => {
    for (const b of LOCATION_BRIEFS) {
      const text = doc(b)
      const listed = [...idsIn(section(text, "### Supporting keywords usable in copy")), ...idsIn(section(text, "### Held back: claim-sensitive keywords"))]
      const page = pageOf(b)
      const expected = keywordsForPath(b.path).filter((k) => k.keyword.toLowerCase() !== page.primaryKeyword.toLowerCase()).map((k) => k.id)
      assert.deepEqual([...listed].sort(), [...expected].sort(), b.path)
      assert.equal(new Set(listed).size, listed.length)
      assert.ok(text.includes(`**${page.primaryKeyword}**`))
    }
    assert.equal(LOCATION_BRIEFS.reduce((n, b) => n + keywordsForPath(b.path).length, 0), 15)
  })
  it("held keywords are exactly the claim-sensitive ones", () => {
    for (const b of LOCATION_BRIEFS) {
      const held = keywordsForPath(b.path).filter((k) => k.claimSensitive.length > 0).map((k) => k.id).sort()
      assert.deepEqual(idsIn(section(doc(b), "### Held back: claim-sensitive keywords")).sort(), held, b.path)
    }
    assert.deepEqual(keywordsForPath("/locations/nairobi/").filter((k) => k.claimSensitive.length).map((k) => k.id).sort(), ["KW-082", "KW-086", "KW-087"])
  })
  it("mapping defect detector: a keyword on a location page that names ANOTHER place must be a documented conflict", () => {
    for (const b of LOCATION_BRIEFS) {
      const others = Object.entries(LOCATION_WORDS).filter(([slug]) => slug !== b.slug)
      const mismatched = keywordsForPath(b.path).filter((k) => others.some(([, rx]) => rx.test(k.keyword))).map((k) => k.id).sort()
      const documented = b.keywordConflicts.filter((c) => c.proposedPath).map((c) => c.id).sort()
      assert.deepEqual(mismatched, documented, b.path)
    }
    assert.deepEqual(LOCATION_BRIEFS[0].keywordConflicts.filter((c) => c.proposedPath).map((c) => c.id).sort(), ["KW-093", "KW-094"])
  })
  it("proposed re-maps are real: each keyword names the target place, is mapped elsewhere today, and is listed once", () => {
    const seen = []
    for (const b of LOCATION_BRIEFS) {
      for (const id of b.proposedAdditions) {
        const k = WORKBOOK_KEYWORDS.find((x) => x.id === id)
        assert.ok(LOCATION_WORDS[b.slug].test(k.keyword), `${id} does not name ${b.slug}`)
        assert.notEqual(k.plannedPath, b.path)
        seen.push(id)
      }
    }
    assert.deepEqual(seen.sort(), ["KW-093", "KW-094"])
    for (const c of LOCATION_BRIEFS[0].keywordConflicts.filter((c) => c.proposedPath)) {
      const target = LOCATION_BRIEFS.find((b) => b.path === c.proposedPath)
      assert.ok(target.proposedAdditions.includes(c.id), c.id)
    }
  })
  it("'near me' keywords stay held and are not moved by this milestone", () => {
    for (const id of ["KW-086", "KW-087"]) {
      const k = WORKBOOK_KEYWORDS.find((x) => x.id === id)
      assert.ok(k.claimSensitive.includes("local presence or proximity"))
      assert.equal(k.plannedPath, "/locations/nairobi/")
    }
  })
  it("service-plus-city keywords stay on service and industry pages: none is a location-page keyword", () => {
    for (const b of LOCATION_BRIEFS) {
      for (const k of keywordsForPath(b.path)) assert.ok(/^security (compan|guard compan)|private security (compan|firms)|^hire security guards|^top security companies|near me/i.test(k.keyword), `${k.id} ${k.keyword}`)
    }
  })
})

describe("proposed metadata and copy make no unsupported claims", () => {
  it("titles: unique, at most 60 characters, brand suffix, built on the workbook's planned title", () => {
    const titles = LOCATION_BRIEFS.map((b) => b.seoTitle)
    assert.equal(new Set(titles).size, 3)
    for (const b of LOCATION_BRIEFS) {
      assert.ok(b.seoTitle.length <= 60 && b.seoTitle.endsWith(" | JOLU SECURITY"), b.seoTitle)
      assert.ok(b.seoTitle.startsWith(pageOf(b).titleDraft.replace(" | JOLU SECURITY", "")), b.path)
    }
  })
  it("descriptions: unique, 70-160 characters, start with the primary keyword, name the brand and the approved office label", () => {
    const seen = new Set()
    for (const b of LOCATION_BRIEFS) {
      const d = b.seoDescription
      assert.ok(d.length >= 70 && d.length <= 160, `${b.path} ${d.length}`)
      assert.ok(d.toLowerCase().startsWith(pageOf(b).primaryKeyword.toLowerCase()), b.path)
      assert.ok(d.includes("JOLU SECURITY") && d.endsWith("Request a quote."))
      assert.ok(d.includes(siteConfig.offices.find((o) => o.name === b.officeName).label.split(" &")[0]), b.path)
      assert.equal(seen.has(d), false)
      seen.add(d)
    }
  })
  it("H1 is the primary keyword, capitalised; Rongo's adds Migori County", () => {
    for (const b of LOCATION_BRIEFS) {
      const pk = pageOf(b).primaryKeyword
      assert.ok(b.h1.startsWith(pk[0].toUpperCase() + pk.slice(1)), b.path)
    }
    assert.ok(LOCATION_BRIEFS[2].seoTitle.includes("Migori County") && LOCATION_BRIEFS[2].h1.includes("Migori County"))
    for (const b of LOCATION_BRIEFS.slice(0, 2)) assert.equal(/migori|rongo/i.test(b.seoTitle + b.seoDescription + b.h1), false)
  })
  it("metadata holds no address, hours, held keyword or claim phrase", () => {
    for (const b of LOCATION_BRIEFS) {
      const copy = [b.seoTitle, b.seoDescription, b.h1, ...b.outline.flatMap((s) => [s.heading, s.purpose])].join(" ")
      assert.deepEqual(claimsIn(copy), [], b.path)
      assert.equal(HOURS_PATTERN.test(copy), false)
      const addr = siteConfig.offices.find((o) => o.name === b.officeName).address.split(",")[0]
      assert.equal(copy.includes(addr), false, `address in copy: ${addr}`)
      for (const k of keywordsForPath(b.path).filter((k) => k.claimSensitive.length)) assert.equal(copy.toLowerCase().includes(k.keyword.toLowerCase()), false, k.keyword)
    }
  })
  it("the claim scanner is not toothless", () => {
    for (const phrase of ["licensed security company in Nairobi", "open 24/7", "the best security company", "top security companies in Nairobi", "security near me", "reply within 30 minutes", "client reviews", "since 2015", "cheap guards"]) assert.ok(claimsIn(phrase).length > 0, phrase)
    assert.deepEqual(claimsIn("Contact the JOLU SECURITY Head Office to discuss your security requirements."), [])
  })
})

describe("NAP, hours and structured data are not invented", () => {
  it("NAP values come from lib/site-config.ts and nothing else", () => {
    for (const b of LOCATION_BRIEFS) {
      const office = siteConfig.offices.find((o) => o.name === b.officeName)
      const nap = napFor(b)
      assert.equal(nap.find((n) => n.field === "Address line").approvedValue, office.address)
      assert.equal(nap.find((n) => n.field === "Office label").approvedValue, office.label)
      for (const f of ["Opening hours", "Coordinates", "Google Business Profile URL", "Postal code / P.O. box", "Signage / on-site evidence"]) {
        const row = nap.find((n) => n.field === f)
        assert.equal(row.approvedValue, null, `${b.slug} ${f}`)
        assert.equal(row.status, "missing")
      }
      assert.ok(nap.every((n) => n.status !== "verified"))
    }
  })
  it("flags the real conflicts: Nakuru address, Rongo/Migori name", () => {
    const status = (slug, field) => napFor(LOCATION_BRIEFS.find((b) => b.slug === slug)).find((n) => n.field === field).status
    assert.equal(status("nakuru", "Address line"), "conflict")
    assert.equal(status("rongo", "Office name on the site"), "conflict")
    assert.equal(status("nairobi", "Address line"), "on-site-unverified")
    const evidence = read("evidence-and-approvals.md")
    for (const needle of ["KFA Building", "Geoffrey Kamau", "+254 769 281 518", "0705 038 679", "Eldoret", "Kisumu", "JOLU GROUP SECURITY LIMITED", ...siteConfig.downloads.map((d) => d.href)]) assert.ok(evidence.includes(needle), needle)
    const profileAddr = siteConfig.offices.find((o) => o.name === "Nakuru").address
    assert.equal(/KFA|Geoffrey Kamau/i.test(profileAddr), false)
    assert.equal(JSON.stringify(siteConfig.contact).includes("769 281 518") || JSON.stringify(siteConfig.contact).includes("769281518"), false)
    for (const d of siteConfig.downloads) assert.ok(existsSync(path.join(ROOT, "public", d.href.replace(/^\//, ""))), d.href)
  })
  it("the repository still holds NO opening-hours evidence (if this fails, hours were added: update the briefs and checklist)", () => {
    for (const file of ["lib/site-config.ts", "lib/claims.ts", "lib/services.ts", "lib/protection-layers.ts"]) {
      const src = readFileSync(path.join(ROOT, file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1")
      assert.equal(/opening ?hours|openingHours|office hours|opens at|closes at/i.test(src), false, file)
      assert.equal(HOURS_PATTERN.test(src), false, file)
    }
    for (const b of LOCATION_BRIEFS) assert.ok(doc(b).includes("No opening hours exist in the repository"), b.path)
  })
  it("the live homepage structured data still contains no hours, geo, rating, review, price range, licence or sameAs", () => {
    const json = serializeJsonLd(buildHomeJsonLd())
    for (const key of ["openingHours", "geo", "aggregateRating", "review", "priceRange", "hasCredential", "license", "sameAs", "FAQPage", "LocalBusiness", "BreadcrumbList"]) assert.equal(json.includes(key), false, key)
  })
  it("structured-data rules: unverified properties are never allowed by default", () => {
    const by = (name) => STRUCTURED_DATA_RULES.find((r) => r.property.startsWith(name))
    for (const p of ["priceRange", "aggregateRating", "hasCredential"]) assert.equal(by(p).treatment, "never-until-evidenced", p)
    for (const p of ["openingHoursSpecification", "geo", "sameAs", "image", "FAQPage", "BreadcrumbList", "hasMap"]) assert.equal(by(p).treatment, "omit-by-default", p)
    for (const p of ["address", "telephone", "name", "areaServed"]) assert.equal(by(p).treatment, "include-when-verified", p)
    const known = new Set([...COMMON_EVIDENCE.map((e) => e.id)])
    for (const r of STRUCTURED_DATA_RULES) for (const id of r.evidence) assert.ok(known.has(id), `${r.property} -> ${id}`)
    assert.match(read("structured-data-requirements.md"), /not re-checked in this milestone/)
  })
  it("every location is documented as NOT eligible for LocalBusiness markup today", () => {
    const text = read("structured-data-requirements.md")
    for (const b of LOCATION_BRIEFS) {
      assert.ok(text.includes(`| \`${b.path}\` | No |`), b.path)
      assert.ok(doc(b).includes("Eligible today: none"), b.path)
    }
  })
})

describe("evidence and claims", () => {
  const all = () => [...COMMON_EVIDENCE, ...LOCATION_BRIEFS.flatMap((b) => b.localEvidence)]
  it("evidence ids are unique, owned and say what they block", () => {
    const ids = all().map((e) => e.id)
    assert.equal(new Set(ids).size, ids.length)
    assert.deepEqual(COMMON_EVIDENCE.map((e) => e.id), Array.from({ length: 15 }, (_, i) => `L${i + 1}`))
    for (const e of all()) assert.ok(e.requirement.length > 40 && e.owner && ["publication", "claim", "section"].includes(e.blocks), e.id)
  })
  it("common evidence covers the workbook's local requirements: NAP, hours, service area, services, GBP, hours-vs-availability", () => {
    const text = COMMON_EVIDENCE.map((e) => e.requirement).join(" ")
    for (const rx of [/NAP/, /opening hours/i, /service area/i, /Google Business Profile/, /not the same as service availability/, /signage/i, /doorway/i, /redirect/i, /conversion tracking/i]) assert.match(text, rx)
  })
  it("each office has its own evidence for its real problems", () => {
    const byId = (b, id) => b.localEvidence.find((e) => e.id === id)
    const [nbo, nak, ron] = LOCATION_BRIEFS
    assert.equal(byId(nak, "NAK1").blocks, "publication")
    assert.match(byId(nak, "NAK1").requirement, /KFA Building/)
    assert.equal(byId(ron, "RON1").blocks, "publication")
    assert.match(byId(ron, "RON1").requirement, /Migori/)
    assert.equal(byId(ron, "RON2").blocks, "publication")
    assert.match(byId(nbo, "NBO1").requirement, /Thome/)
    for (const b of LOCATION_BRIEFS) assert.ok(b.localEvidence.length >= 3, b.path)
  })
  it("registry claims are all still needs-evidence and every claim is listed in each brief", () => {
    assert.equal(CLAIMS.some((c) => c.status !== "needs-evidence"), false)
    for (const b of LOCATION_BRIEFS) for (const c of CLAIMS) assert.ok(doc(b).includes(`| ${c.id} |`), `${b.path} ${c.id}`)
  })
  it("the photo library has no cleared photo, so no brief may plan one", () => {
    assert.equal(/status:\s*"cleared"/.test(readFileSync(path.join(ROOT, "lib/photo-library.ts"), "utf8")), false)
    assert.match(COMMON_EVIDENCE.find((e) => e.id === "L9").requirement, /clearance pending/)
  })
  it("owner decisions are unique and cover the open conflicts", () => {
    assert.deepEqual(OWNER_DECISIONS.map((d) => d.id), Array.from({ length: 12 }, (_, i) => `L-D${i + 1}`))
    const text = OWNER_DECISIONS.map((d) => d.decision).join(" ")
    for (const rx of [/KW-093/, /KW-094/, /KW-086/, /Rongo \/ Migori/, /head office/i, /Eldoret and Kisumu/, /map/i, /unique-content/i]) assert.match(text, rx)
  })
})

describe("unique content and internal links", () => {
  it("each outline has at least six sections that need office-specific content, and at least four place-specific headings", () => {
    const FACTUAL = new Set(["Office details", "Opening hours", "Directions and map", "Directions"]) // same label, different verified facts
    for (const b of LOCATION_BRIEFS) {
      const others = new Set(LOCATION_BRIEFS.filter((o) => o !== b).flatMap((o) => o.outline.map((s) => s.heading)))
      const own = b.outline.filter((s) => s.unique)
      assert.ok(own.length >= 6, b.path)
      assert.ok(own.filter((s) => !others.has(s.heading)).length >= 4, `${b.path}: too few place-specific headings`)
      for (const s of own.filter((s) => others.has(s.heading))) assert.ok(FACTUAL.has(s.heading), `${b.path}: shared heading ${s.heading} is not a factual block`)
      assert.ok(b.uniqueContent.length >= 5)
    }
    assert.ok(LOCATION_BRIEFS[1].outline.some((s) => /showroom/i.test(s.heading)))
    assert.ok(LOCATION_BRIEFS[2].outline.some((s) => /Migori County/.test(s.heading)))
  })
  it("conditional sections name the evidence that unlocks them, and every named id exists", () => {
    const known = new Set([...COMMON_EVIDENCE.map((e) => e.id), ...LOCATION_BRIEFS.flatMap((b) => b.localEvidence.map((e) => e.id))])
    for (const b of LOCATION_BRIEFS) for (const s of b.outline) for (const id of s.condition?.match(/\b[A-Z]{1,3}\d{1,2}\b/g) ?? []) assert.ok(known.has(id), `${b.path} ${id}`)
    for (const b of LOCATION_BRIEFS) assert.ok(b.outline.find((s) => s.heading === "Opening hours").condition.includes("omit"))
  })
  it("existing links resolve; every other link targets a planned page or the homepage; no self or Migori link", () => {
    const planned = new Set(PLANNED_PAGES.map((p) => p.path))
    for (const b of LOCATION_BRIEFS) {
      assert.deepEqual(b.internalLinks.filter((l) => l.status === "exists").map((l) => l.to), [siteConfig.quoteHref, siteConfig.servicesHref], b.path)
      for (const l of b.internalLinks.filter((l) => l.status !== "exists")) {
        assert.ok(l.to === "/" || planned.has(l.to), `${b.path} -> ${l.to}`)
        assert.notEqual(l.to, b.path)
        assert.equal(/migori/i.test(l.to), false)
      }
      assert.deepEqual(b.internalLinks.filter((l) => l.to.startsWith("/locations/")).map((l) => l.to).sort(), LOCATION_BRIEFS.filter((o) => o !== b).map((o) => o.path).sort())
      assert.deepEqual(b.internalLinks.filter((l) => l.to.startsWith("/services/")).map((l) => l.status), SERVICES.map(() => "blocked-until-target-published"))
    }
  })
})

describe("nothing is published", () => {
  it("no location route exists; no location path is live or in the sitemap", () => {
    assert.equal(existsSync(path.join(ROOT, "app/locations")), false)
    assert.equal(LIVE_PAGES.some((p) => p.path.startsWith("/locations")), false)
    assert.deepEqual([...new Set(sitemap().map((e) => e.url))], [SITE])
  })
  it("planning specs are not imported by any page or component, and lib/site-config.ts is untouched in shape", () => {
    const hits = []
    const walk = (dir) => {
      for (const name of readdirSync(dir)) {
        const full = path.join(dir, name)
        if (statSync(full).isDirectory()) walk(full)
        else if (/\.(tsx?|mjs)$/.test(name) && /location-briefs|location-docs|location-publishing-checklist/.test(readFileSync(full, "utf8"))) hits.push(path.relative(ROOT, full))
      }
    }
    for (const d of ["app", "components"]) walk(path.join(ROOT, d))
    assert.deepEqual(hits, [])
    assert.deepEqual(siteConfig.offices.map((o) => o.name), ["Nairobi", "Nakuru", "Migori"])
  })
})

describe("documents are generated from the specs and complete", () => {
  it("every generated file equals the committed file (run scripts/seo/build-location-docs.mjs after changing a spec)", () => {
    const files = renderLocationDocs()
    assert.equal(Object.keys(files).length, 8)
    for (const [name, content] of Object.entries(files)) assert.equal(read(name), content, name)
  })
  it("the docs folder holds exactly the expected files", () => {
    const listed = []
    const walk = (dir, prefix = "") => { for (const n of readdirSync(dir)) { const f = path.join(dir, n); if (statSync(f).isDirectory()) walk(f, `${prefix}${n}/`); else listed.push(`${prefix}${n}`) } }
    walk(DOCS)
    assert.deepEqual(listed.sort(), [...Object.keys(renderLocationDocs()), "page-architecture.md"].sort())
  })
  it("each brief is marked not published and has every required section", () => {
    for (const b of LOCATION_BRIEFS) {
      const text = doc(b)
      assert.ok(text.includes("Status: PLANNED, NOT PUBLISHED"))
      for (const h of ["## Summary", "## Proposed metadata", "## Keywords", "## Page outline", "## Existing approved information", "## Operating hours", "## Services requiring confirmation for this office", "## Unique content requirements", "## Missing evidence", "## Claims requiring approval", "## Structured-data eligibility", "## Suggested internal links"]) assert.ok(text.includes(h), `${b.path} ${h}`)
      assert.ok(text.includes(`\`${SITE}${b.path.replace(/\/$/, "")}\``))
      for (const s of SERVICES) assert.ok(text.includes(`| ${s.name} | Unconfirmed |`), `${b.path} ${s.name}`)
    }
  })
  it("the plan's numbers match the data, including the proposed re-map", () => {
    const plan = read("priority-plan.md")
    for (const b of LOCATION_BRIEFS) assert.ok(plan.includes(`| ${b.rank} | \`${b.path}\` |`), b.path)
    assert.ok(plan.includes("With the move, Nairobi has 7 (6 P1), Nakuru 3 (2 P1) and Rongo 5 (1 P1)."))
    // Independent recomputation from the workbook data.
    const nairobiAfter = keywordsForPath("/locations/nairobi/").filter((k) => !["KW-093", "KW-094"].includes(k.id))
    assert.equal(nairobiAfter.length, 7)
    assert.equal(nairobiAfter.filter((k) => k.priority === "P1").length, 6)
  })
  it("the architecture proposal records the constraints it depends on", () => {
    const arch = read("page-architecture.md")
    for (const phrase of ["PROPOSAL ONLY", "generateStaticParams", "at least one param", "dynamicParams = false", "trailingSlash", "await", "migori", "siteConfig.offices", "LIVE_PAGES", "frozen", "never-until-evidenced"]) assert.ok(arch.includes(phrase), phrase)
  })
  it("the checklist covers every TECHNICAL AUDIT area plus governance and NAP/local, and is rendered", () => {
    const areas = new Set(LOCATION_CHECKLIST.map((c) => c.area))
    for (const a of ["Indexation", "Information architecture", "Core Web Vitals", "Structured data", "Trust signals", "Conversion tracking", "On-page", "Images", "Security", "Content quality", "Governance", "NAP and local"]) assert.ok(areas.has(a), a)
    for (const c of LOCATION_CHECKLIST) assert.ok(c.check.length > 20 && c.proof.length > 5 && c.source.length > 3)
    assert.equal((read("publishing-checklist.md").match(/^\| \[ \] \|/gm) ?? []).length, LOCATION_CHECKLIST.length)
  })
  it("the NAP checklist has a block per office with an empty sign-off column", () => {
    const nap = read("nap-verification-checklist.md")
    for (const b of LOCATION_BRIEFS) assert.ok(nap.includes(`## ${b.placeName}`), b.placeName)
    assert.ok(nap.includes("Evidence reference | Verified by / date"))
    assert.equal(/\| verified \|/.test(nap), false)
  })
  it("no volume, difficulty, CPC, ranking, price or hours figure appears in any document", () => {
    for (const name of [...Object.keys(renderLocationDocs()), "page-architecture.md"]) {
      const text = read(name)
      assert.equal(/\b\d[\d,.]*\s*(searches|\/mo\b|per month|monthly searches|KES|USD|\$)/i.test(text), false, name)
      assert.equal(/\b(difficulty|ranking|position|volume|cpc)\s*[:=]\s*\d/i.test(text), false, name)
      assert.equal(/\b\d{1,2}[:.]\d{2}\s?(am|pm)\b|\b\d{1,2}\s?(am|pm)\b/i.test(text), false, `${name} contains an hours-like time`)
    }
  })
})
