import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { describe, it } from "node:test"

const { LIVE_PAGES, HOME_TITLE, HOME_DESCRIPTION } = await import("@/lib/seo/pages")
const { pageMetadata, rootMetadata, canonicalUrl } = await import("@/lib/seo/metadata")
const { buildHomeJsonLd, serializeJsonLd } = await import("@/lib/seo/json-ld")
const { PLANNED_PAGES } = await import("@/lib/seo/planned-pages")
const { BRAND } = await import("@/lib/seo/brand")
const { default: sitemap } = await import("@/app/sitemap")
const { default: robots } = await import("@/app/robots")
const { siteConfig } = await import("@/lib/site-config")
const { WORKBOOK_KEYWORDS } = await import("@/lib/seo/workbook-keywords")
const { HOME_KEYWORDS, EDITORIAL_KEYWORDS, keywordsForPath } = await import("@/lib/seo/keyword-map")
const { classifyKeyword, CLAIM_RULES, JUDGMENT_RULES } = await import("@/lib/seo/claim-classifier")
const { COPY_REVIEW_ITEMS, COPY_REVIEW_PATTERN } = await import("@/lib/seo/copy-review")
const { SERVICES } = await import("@/lib/services")

const ROOT = path.resolve(import.meta.dirname, "../..")
const SITE = "https://jolusecurity.com"

const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1")
function publicSourceFiles() {
  const files = []
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name)
      if (statSync(full).isDirectory()) walk(full)
      else if (/\.(tsx?|mdx?)$/.test(name)) files.push(full)
    }
  }
  for (const dir of ["components", "app"]) walk(path.join(ROOT, dir))
  for (const f of ["lib/services.ts", "lib/site-config.ts", "lib/seo/pages.ts"]) files.push(path.join(ROOT, f))
  return files
}

// Words and phrases that would be unsupported public claims today (lib/claims.ts: every claim "needs-evidence").
const CLAIM_PATTERNS = [
  /licen[cs]ed/i, /registered/i, /certified/i, /accredited/i, /compliant/i, /\bpsra\b/i,
  /24\s?\/\s?7/, /24[- ]hours?/i, /round[- ]the[- ]clock/i, /around the clock/i,
  /(?<![\w-])best(?![\w-])/i, /(?<![\w-])top[- ](rated|tier)(?![\w-])/i, /(?<![\w-])leading(?![\w-])/i, /\btrusted\b/i, /\bno\.?\s?1\b/i, /#1/, /award/i,
  /guarantee/i, /\brapid\b/i, /(?<![\w-])fast(?![\w-])/i, /within \d+/i, /\b\d+\s*(minutes?|hours?|hrs?)\b/i, /\d+\+/, /since \d{4}/i, /\bover \d+ years/i,
  /testimonial/i, /\breviews?\b/i, /rated/i, /\bstars?\b/i, /\bcheap/i, /\baffordable\b/i,
]
const claimsIn = (text) => CLAIM_PATTERNS.filter((rx) => rx.test(text)).map(String)

describe("existing URL behaviour is preserved", () => {
  it("the published routes are exactly / and /blog", () => {
    assert.deepEqual(LIVE_PAGES.map((p) => p.path), ["/", "/blog"])
  })
  it("canonical URLs are absolute, on the site host, and self-referencing", () => {
    assert.equal(canonicalUrl("/"), SITE)
    assert.equal(canonicalUrl("/blog"), `${SITE}/blog`)
    for (const page of LIVE_PAGES) {
      assert.equal(pageMetadata(page.path).alternates.canonical, page.path)
    }
  })
  it("the root layout sets no canonical, so no route can inherit a wrong one", () => {
    assert.equal(rootMetadata.alternates, undefined)
  })
})

describe("page metadata", () => {
  it("the homepage title is exactly the owner-approved string and is used for title, Open Graph and Twitter", () => {
    const APPROVED = "JOLU SECURITY | Professional Security Services"
    const m = pageMetadata("/")
    assert.deepEqual(m.title, { absolute: APPROVED })
    assert.equal(HOME_TITLE, APPROVED)
    assert.equal(m.openGraph.title, APPROVED)
    assert.equal(m.twitter.title, APPROVED)
    assert.equal(rootMetadata.title.default, APPROVED)
    assert.ok(APPROVED.length <= 60)
    // The workbook keyword is research data only; the owner chose a different homepage title.
    assert.equal(/kenya/i.test(JSON.stringify([m.title, m.openGraph.title, m.twitter.title, m.description])), false)
    assert.match(HOME_DESCRIPTION, /^JOLU SECURITY: /)
  })
  it("lengths stay within what search results display", () => {
    for (const page of LIVE_PAGES) {
      const m = pageMetadata(page.path)
      const full = typeof m.title === "string" ? `${m.title} | ${BRAND}` : m.title.absolute
      assert.ok(full.length <= 60, `${page.path} title is ${full.length} chars`)
      assert.ok(m.description.length >= 70 && m.description.length <= 160, `${page.path} description is ${m.description.length} chars`)
    }
  })
  it("titles and descriptions are unique per page", () => {
    const titles = LIVE_PAGES.map((p) => JSON.stringify(pageMetadata(p.path).title))
    const descriptions = LIVE_PAGES.map((p) => pageMetadata(p.path).description)
    assert.equal(new Set(titles).size, titles.length)
    assert.equal(new Set(descriptions).size, descriptions.length)
  })
  it("the root title template applies the approved brand to inner pages", () => {
    assert.equal(rootMetadata.title.template, "%s | JOLU SECURITY")
    assert.equal(rootMetadata.title.default, HOME_TITLE)
    assert.equal(pageMetadata("/blog").title, "Blog")
  })
  it("never uses the workbook's unapproved brand variant", () => {
    const all = JSON.stringify([rootMetadata, ...LIVE_PAGES.map((p) => pageMetadata(p.path)), buildHomeJsonLd()])
    assert.equal(/Jolu Group/i.test(all), false)
  })
  it("Open Graph and Twitter metadata are complete and consistent with the page", () => {
    for (const page of LIVE_PAGES) {
      const m = pageMetadata(page.path)
      const full = typeof m.title === "string" ? `${m.title} | ${BRAND}` : m.title.absolute
      assert.equal(m.openGraph.title, full)
      assert.equal(m.openGraph.description, m.description)
      assert.equal(m.openGraph.url, page.path)
      assert.equal(m.openGraph.siteName, BRAND)
      assert.equal(m.openGraph.type, "website")
      assert.equal(m.openGraph.locale, "en_KE")
      assert.equal(m.openGraph.images[0].url, "/brand/jolu-preview.png")
      assert.deepEqual([m.openGraph.images[0].width, m.openGraph.images[0].height], [1200, 630])
      assert.equal(m.twitter.card, "summary_large_image")
      assert.equal(m.twitter.title, full)
      assert.equal(m.twitter.description, m.description)
    }
  })
})

describe("indexing: sitemap, robots and the Blog placeholder", () => {
  it("the sitemap lists exactly the indexable live pages, at their canonical URLs", () => {
    const urls = sitemap().map((e) => e.url)
    assert.deepEqual(urls, LIVE_PAGES.filter((p) => p.indexable).map((p) => canonicalUrl(p.path)))
    assert.deepEqual(urls, [SITE])
  })
  it("every sitemap URL equals its page's canonical (no redirect or variant in the sitemap)", () => {
    for (const entry of sitemap()) {
      const page = LIVE_PAGES.find((p) => canonicalUrl(p.path) === entry.url)
      assert.ok(page, entry.url)
      assert.equal(canonicalUrl(pageMetadata(page.path).alternates.canonical), entry.url)
    }
  })
  it("the sitemap carries no invented modification dates", () => {
    for (const entry of sitemap()) assert.equal(entry.lastModified, undefined)
  })
  it("the Blog placeholder is noindex,follow, absent from the sitemap, and NOT blocked in robots.txt", () => {
    const blog = pageMetadata("/blog")
    assert.deepEqual(blog.robots, { index: false, follow: true })
    assert.equal(sitemap().some((e) => e.url.includes("/blog")), false)
    const rules = [robots().rules].flat()
    for (const rule of rules) assert.equal([rule.disallow].flat().some((d) => d && "/blog".startsWith(d.replace(/\*$/, "")) && d !== ""), false)
  })
  it("the homepage is indexable (no robots override)", () => {
    assert.equal(pageMetadata("/").robots, undefined)
  })
  it("robots.txt allows crawling, blocks only the API, and points at the sitemap", () => {
    const r = robots()
    assert.deepEqual([r.rules].flat().map((x) => [x.userAgent, x.allow, x.disallow]), [["*", "/", ["/api/"]]])
    assert.equal(r.sitemap, `${SITE}/sitemap.xml`)
  })
  it("the static public/robots.txt is gone (Next.js rejects having both)", () => {
    assert.throws(() => statSync(path.join(ROOT, "public/robots.txt")))
  })
})

describe("structured data", () => {
  const data = buildHomeJsonLd()
  const graph = data["@graph"]
  const org = graph.find((n) => n["@type"] === "Organization")
  const site = graph.find((n) => n["@type"] === "WebSite")

  it("is valid JSON that round-trips and uses schema.org", () => {
    assert.equal(data["@context"], "https://schema.org")
    assert.deepEqual(JSON.parse(serializeJsonLd(data)), data)
  })
  it("Organization matches the approved brand and contact details", () => {
    assert.equal(org.name, "JOLU SECURITY")
    assert.equal(org.url, `${SITE}/`)
    assert.equal(org.email, siteConfig.contact.email)
    assert.equal(org.telephone, siteConfig.contact.primaryPhone.e164)
    assert.deepEqual(org.contactPoint.map((c) => c.telephone), siteConfig.contact.phones.map((p) => p.e164))
    assert.equal(org.logo.url, `${SITE}${siteConfig.logo.src}`)
  })
  // Offices are unverified (the old addresses were copied from the JOLU Machineries site). Until JOLU
  // Security-specific evidence is approved in lib/offices.ts, no office or area data may be emitted.
  // Detailed regression coverage lives in tests/content/.
  it("emits no office, address, location or areaServed data while no office is approved", () => {
    assert.equal(siteConfig.offices, undefined)
    assert.equal(org.location, undefined)
    assert.equal(org.areaServed, undefined)
    const text = JSON.stringify(data)
    for (const key of ["PostalAddress", "areaServed", "location", "address", "geo"]) assert.equal(text.includes(`"${key}"`), false, key)
  })
  it("the offer catalog is exactly the services the site already lists", () => {
    const names = org.hasOfferCatalog.itemListElement.map((o) => o.itemOffered.name)
    assert.deepEqual(names, SERVICES.map((s) => s.name))
    for (const offer of org.hasOfferCatalog.itemListElement) {
      assert.equal(offer.itemOffered["@type"], "Service")
      assert.equal(offer.itemOffered.provider["@id"], org["@id"])
      assert.equal(offer.price, undefined)
    }
  })
  it("WebSite refers to the Organization and every @id reference resolves", () => {
    assert.equal(site.publisher["@id"], org["@id"])
    const ids = new Set(graph.map((n) => n["@id"]).filter(Boolean))
    const refs = [...JSON.stringify(data).matchAll(/"@id":"([^"]+)"/g)].map((m) => m[1])
    for (const ref of refs) assert.ok(ids.has(ref), `dangling @id ${ref}`)
  })
  it("contains nothing that is not verified or visible: no ratings, reviews, hours, prices, geo, social links, FAQ", () => {
    const forbidden = ["aggregateRating", "review", "openingHours", "openingHoursSpecification", "priceRange", "geo", "sameAs", "FAQPage", "Question", "hasCredential", "award", "foundingDate", "numberOfEmployees", "makesOffer"]
    const text = JSON.stringify(data)
    for (const key of forbidden) assert.equal(text.includes(`"${key}"`), false, `forbidden: ${key}`)
    assert.equal(text.includes('"price"'), false)
  })
  it("every URL in the data is absolute https on the site host", () => {
    const urls = [...JSON.stringify(data).matchAll(/"(https?:\/\/[^"]+)"/g)].map((m) => m[1]).filter((u) => !u.startsWith("https://schema.org"))
    assert.ok(urls.length > 0)
    for (const u of urls) assert.ok(u.startsWith(SITE), u)
  })
  it("serialisation cannot break out of the script tag or use raw line separators", () => {
    const hostile = { name: "</script><script>alert(1)</script>", note: "a b c" }
    const out = serializeJsonLd(hostile)
    assert.equal(out.includes("</script>"), false)
    assert.equal(out.includes("<"), false)
    assert.equal(out.includes(" ") || out.includes(" "), false)
    assert.deepEqual(JSON.parse(out), hostile)
  })
})

describe("planned pages stay unpublished and metric-free", () => {
  // Release 04B: a planned SERVICE page may have a route directory, holding only the canonical gated template (which answers
  // 404 until the gate publishes the page). Every other planned page still has no route directory.
  it("no planned page is live or in the sitemap; only the seven service routes exist, each the canonical gated template", async () => {
    const R = await import("../helpers/manifest-routes.mjs")
    const live = new Set(LIVE_PAGES.map((p) => p.path))
    const inSitemap = new Set(sitemap().map((e) => new URL(e.url).pathname))
    for (const page of PLANNED_PAGES) {
      assert.equal(live.has(page.path), false, page.path)
      assert.equal(inSitemap.has(page.path), false, page.path)
      const m = /^\/services\/([a-z0-9-]+)\/$/.exec(page.path)
      if (m) assert.equal(readFileSync(path.join(ROOT, "app/services", m[1], "page.tsx"), "utf8"), R.goodRoute("service", m[1]), page.path)
      else assert.throws(() => statSync(path.join(ROOT, "app", page.path)), undefined, `unexpected route directory for ${page.path}`)
    }
  })
  it("one primary URL per intent: planned paths and primary keywords are unique", () => {
    assert.equal(new Set(PLANNED_PAGES.map((p) => p.path)).size, PLANNED_PAGES.length)
    assert.equal(new Set(PLANNED_PAGES.map((p) => p.primaryKeyword.toLowerCase())).size, PLANNED_PAGES.length)
  })
  it("carries no search volume, difficulty, CPC, traffic or ranking fields", () => {
    const allowed = new Set(["path", "kind", "name", "primaryKeyword", "intent", "geography", "priority", "titleDraft", "descriptionDraft", "supportingKeywords", "totalWorkbookKeywords", "claimSensitiveKeywordCount", "workbookCaution"])
    for (const page of PLANNED_PAGES) {
      for (const key of Object.keys(page)) assert.ok(allowed.has(key), `${page.path}: unexpected field ${key}`)
      for (const kw of page.supportingKeywords) assert.deepEqual(Object.keys(kw).sort(), ["claimSensitive", "id", "keyword", "priority"])
    }
  })
  it("every planned page cites real workbook rows and uses the approved brand with correct casing", () => {
    for (const page of PLANNED_PAGES) {
      assert.match(page.titleDraft, / \| JOLU SECURITY$/)
      assert.equal(/Cctv|Vip /.test(page.titleDraft), false)
      for (const kw of page.supportingKeywords) assert.match(kw.id, /^KW-\d{3}$/)
    }
  })
  it("each planned page's keyword lists come from the workbook data and match the classifier", () => {
    for (const page of PLANNED_PAGES) {
      const fromData = keywordsForPath(page.path)
      assert.equal(page.totalWorkbookKeywords, fromData.length, page.path)
      assert.equal(page.claimSensitiveKeywordCount, fromData.filter((k) => k.claimSensitive.length > 0).length, page.path)
      assert.equal(page.supportingKeywords.length, fromData.filter((k) => k.keyword.toLowerCase() !== page.primaryKeyword.toLowerCase()).length, page.path)
      for (const kw of page.supportingKeywords) {
        assert.deepEqual(kw.claimSensitive, classifyKeyword(kw.keyword).categories, kw.id)
      }
    }
  })
})

describe("no unsupported claims in anything search engines or visitors see from the SEO layer", () => {
  it("live titles, descriptions, social metadata and structured data contain no claim phrases", () => {
    const text = JSON.stringify([...LIVE_PAGES.map((p) => pageMetadata(p.path)), rootMetadata, buildHomeJsonLd()])
    assert.deepEqual(claimsIn(text), [])
  })
  it("planned-page draft titles and descriptions contain no claim phrases", () => {
    for (const page of PLANNED_PAGES) assert.deepEqual(claimsIn(`${page.titleDraft} ${page.descriptionDraft}`), [], page.path)
  })
  it("all public-facing source (every component, page and API message, services, config) contains no claim phrases", () => {
    const files = publicSourceFiles()
    // Guard against the scan silently shrinking: the files that were once excluded must now be in scope.
    for (const must of ["components/enquiry-form.tsx", "app/api/enquiry/route.ts", "components/ui/button.tsx", "components/protection-stage.tsx", "lib/services.ts", "lib/site-config.ts"]) {
      assert.ok(files.some((f) => f.endsWith(must)), `scan must include ${must}`)
    }
    const hits = []
    for (const file of files) {
      const found = claimsIn(stripComments(readFileSync(file, "utf8")))
      if (found.length) hits.push(`${path.relative(ROOT, file)}: ${found.join(" ")}`)
    }
    assert.deepEqual(hits, [])
  })
})

describe("copy flagged for owner review (existing approved copy is not modified)", () => {
  const found = []
  for (const file of publicSourceFiles()) {
    const src = stripComments(readFileSync(file, "utf8"))
    for (const m of src.matchAll(new RegExp(COPY_REVIEW_PATTERN.source, "gi"))) {
      found.push({ file: path.relative(ROOT, file), phrase: m[0] })
    }
  }
  it("every 'professional' wording in public source is on the review list, and nothing else is", (t) => {
    // Each listed phrase must contain the matched word and exist in its file; each match must be covered by a listed item.
    const word = (phrase) => phrase.match(COPY_REVIEW_PATTERN)[0].toLowerCase()
    const listed = new Set(COPY_REVIEW_ITEMS.map((i) => `${i.file}|${word(i.phrase)}`))
    const actual = new Set(found.map((f) => `${f.file}|${f.phrase.toLowerCase()}`))
    assert.deepEqual([...actual].sort(), [...listed].sort())
    for (const item of COPY_REVIEW_ITEMS) assert.ok(readFileSync(path.join(ROOT, item.file), "utf8").includes(item.phrase), item.phrase)
    for (const item of COPY_REVIEW_ITEMS) t.diagnostic(`REVIEW: "${item.phrase}" in ${item.file} - ${item.note}`)
  })
  it("the named existing phrases are still present and unchanged (review only, no edits)", () => {
    const protection = readFileSync(path.join(ROOT, "components/protection-stage.tsx"), "utf8")
    const services = readFileSync(path.join(ROOT, "lib/services.ts"), "utf8")
    assert.ok(protection.includes("Professional Protection"))
    assert.ok(services.includes('name: "Professionalism"'))
  })
  it("no approved claim in the registry backs this wording yet", () => {
    const claims = readFileSync(path.join(ROOT, "lib/claims.ts"), "utf8")
    assert.equal(/status: "approved"/.test(claims), false)
  })
})

describe("workbook keyword data: nothing lost, nothing duplicated", () => {
  it("holds all 311 workbook keywords exactly once, KW-001..KW-311", () => {
    assert.equal(WORKBOOK_KEYWORDS.length, 311)
    const ids = WORKBOOK_KEYWORDS.map((k) => k.id)
    assert.equal(new Set(ids).size, 311)
    assert.deepEqual(ids, Array.from({ length: 311 }, (_, i) => `KW-${String(i + 1).padStart(3, "0")}`))
  })
  it("matches workbook counts: 9 homepage, 19 editorial, 283 planned-page keywords", () => {
    assert.equal(HOME_KEYWORDS.length, 9)
    assert.equal(EDITORIAL_KEYWORDS.length, 19)
    assert.equal(WORKBOOK_KEYWORDS.filter((k) => k.disposition === "planned-page").length, 283)
    const byPriority = Object.groupBy(WORKBOOK_KEYWORDS, (k) => k.priority)
    assert.deepEqual([byPriority.P1.length, byPriority.P2.length, byPriority.P3.length], [98, 194, 19]) // EXECUTIVE DASHBOARD
  })
  it("matches per-page keyword counts taken from the workbook", () => {
    const expected = {
      "/services/manned-guarding/": 52, "/services/events-security/": 34, "/services/k9-unit-services/": 31,
      "/services/cctv-installation/": 37, "/services/electric-fencing/": 34, "/services/alarm-response/": 31,
      "/services/vip-close-protection/": 31, "/locations/nairobi/": 9, "/locations/nakuru/": 2, "/locations/rongo/": 4,
      "/industries/residential/": 3, "/industries/commercial/": 3, "/industries/educational/": 3,
      "/industries/retail/": 3, "/industries/hospitality/": 3, "/industries/construction/": 3,
    }
    assert.deepEqual(Object.fromEntries(PLANNED_PAGES.map((p) => [p.path, p.totalWorkbookKeywords])), expected)
  })
  it("spot-checks rows against values read from the workbook", () => {
    const row = (id) => WORKBOOK_KEYWORDS.find((k) => k.id === id)
    assert.deepEqual([row("KW-001").keyword, row("KW-001").priority, row("KW-001").plannedPath], ["security companies in kenya", "P1", "/"])
    assert.deepEqual([row("KW-007").workbookUrl, row("KW-007").plannedPath], ["/locations/rongo/", "/locations/rongo/"])
    assert.deepEqual([row("KW-009").workbookUrl, row("KW-009").plannedPath, row("KW-009").geography], ["/locations/migori/", "/locations/rongo/", "Migori"])
    assert.deepEqual([row("KW-063").keyword, row("KW-063").priority, row("KW-063").plannedPath], ["alarm response services in nairobi", "P1", "/services/alarm-response/"])
    assert.deepEqual([row("KW-212").keyword, row("KW-212").plannedPath], ["electric fence installation cost in kenya", "/services/electric-fencing/"])
    assert.deepEqual([row("KW-295").disposition, row("KW-295").cluster], ["editorial", "Compliance"])
    for (const k of WORKBOOK_KEYWORDS) assert.ok(["P1", "P2", "P3"].includes(k.priority) && ["Transactional", "Commercial", "Informational"].includes(k.intent), k.id)
  })
  it("every homepage-bound keyword the audit named is mapped to /", () => {
    for (const id of ["KW-001", "KW-002", "KW-081", "KW-083", "KW-085", "KW-089", "KW-090", "KW-091", "KW-092"]) {
      const k = WORKBOOK_KEYWORDS.find((x) => x.id === id)
      assert.equal(k.plannedPath, "/", id)
      assert.equal(k.disposition, "homepage", id)
    }
  })
  it("carries no metric fields", () => {
    const allowed = ["claimSensitive", "classification", "cluster", "disposition", "geography", "id", "intent", "keyword", "plannedPath", "priority", "workbookUrl"]
    for (const k of WORKBOOK_KEYWORDS) assert.deepEqual(Object.keys(k).sort(), allowed, k.id)
  })
})

describe("Rongo and Migori are one planned location", () => {
  const locations = PLANNED_PAGES.filter((p) => p.kind === "location")
  it("plans exactly Nairobi, Nakuru and Rongo, and no Migori page", () => {
    assert.deepEqual(locations.map((p) => p.path).sort(), ["/locations/nairobi/", "/locations/nakuru/", "/locations/rongo/"])
    assert.equal(PLANNED_PAGES.some((p) => /migori/i.test(p.path)), false)
    assert.equal(WORKBOOK_KEYWORDS.some((k) => k.plannedPath.includes("migori")), false)
  })
  it("every workbook keyword that pointed at the Migori page now resolves to the Rongo page", () => {
    const moved = WORKBOOK_KEYWORDS.filter((k) => k.workbookUrl === "/locations/migori/")
    assert.deepEqual(moved.map((k) => k.id), ["KW-009", "KW-010"])
    for (const k of moved) assert.equal(k.plannedPath, "/locations/rongo/")
  })
  it("the Rongo page keeps its Migori targeting without a separate page", () => {
    const rongo = PLANNED_PAGES.find((p) => p.path === "/locations/rongo/")
    assert.deepEqual(rongo.geography, ["Rongo", "Migori"])
    const ids = new Set(rongo.supportingKeywords.map((k) => k.id))
    for (const id of ["KW-007", "KW-008", "KW-009", "KW-010"]) assert.ok(ids.has(id) || rongo.primaryKeyword === WORKBOOK_KEYWORDS.find((k) => k.id === id).keyword, id)
    assert.match(rongo.workbookCaution, /Migori County/)
  })
  it("detects duplicate location intents: one place per page, and no place shared between location pages", () => {
    const place = (p) => p.primaryKeyword.toLowerCase().replace(/^security compan(y|ies) in /, "")
    const places = locations.map(place)
    assert.equal(new Set(places).size, places.length, places.join(","))
    const seen = new Map()
    for (const p of locations) {
      for (const g of p.geography.filter((g) => g !== "Local")) {
        assert.equal(seen.has(g), false, `${g} is targeted by both ${seen.get(g)} and ${p.path}`)
        seen.set(g, p.path)
      }
    }
    // The duplicate-intent check itself must fire on a real duplicate.
    const withDuplicate = [...locations, { ...locations[0], path: "/locations/dup/" }]
    assert.notEqual(new Set(withDuplicate.map(place)).size, withDuplicate.length)
  })
  it("no keyword is planned on two pages (one intent = one primary URL)", () => {
    const owners = new Map()
    for (const p of PLANNED_PAGES) {
      for (const k of keywordsForPath(p.path)) {
        assert.equal(owners.has(k.id), false, `${k.id} on ${owners.get(k.id)} and ${p.path}`)
        owners.set(k.id, p.path)
      }
    }
  })
})

describe("claim-sensitive classification", () => {
  const cats = (kw) => classifyKeyword(kw).categories
  it("known answers (independent of the stored data)", () => {
    assert.deepEqual(cats("licensed security companies in kenya"), ["licensing"])
    assert.deepEqual(cats("how to verify a security company psra licence"), ["licensing"])
    assert.deepEqual(cats("best security companies in kenya"), ["superlative or quality"])
    assert.deepEqual(cats("top security companies in nairobi"), ["superlative or quality"])
    assert.deepEqual(cats("24 hour alarm response in nairobi"), ["availability or response time"])
    assert.deepEqual(cats("rapid alarm response in kenya"), ["availability or response time"])
    assert.deepEqual(cats("cctv installation cost in nairobi"), ["pricing"])
    assert.deepEqual(cats("security company rates in kenya"), ["pricing"])
    assert.deepEqual(cats("security company quotation kenya"), ["pricing"])
    assert.deepEqual(cats("security company near me"), ["local presence or proximity"])
    assert.deepEqual(cats("security guard company near me"), ["local presence or proximity"])
  })
  it("does not over-match", () => {
    assert.deepEqual(cats("corporate event security in kenya"), []) // "corporate" is not "rate"
    assert.deepEqual(cats("corporate executive protection in nairobi"), [])
    assert.deepEqual(cats("security guard services in kenya"), [])
    assert.deepEqual(cats("electric fence company in nairobi"), [])
  })
  it("judgment rule J2 removes 'best' from a technique query, and records why", () => {
    const c = classifyKeyword("best cctv placement for a home")
    assert.deepEqual(c.categories, [])
    assert.deepEqual(c.ruleCategories, ["superlative or quality"])
    assert.equal(c.basis, "judgment-excluded")
    assert.deepEqual(c.judgmentRuleIds, ["J2-best-placement"])
  })
  it("stored classification for all 311 keywords equals a fresh run (data is not stale)", () => {
    for (const k of WORKBOOK_KEYWORDS) {
      const c = classifyKeyword(k.keyword)
      assert.deepEqual(k.claimSensitive, c.categories, k.id)
      assert.equal(k.classification, c.basis, k.id)
    }
  })
  it("coverage: an independent broad watch-list finds nothing the classifier missed, except reviewed items", () => {
    const WATCH = /\b(licen|psra|regist|certif|accredit|best|top|leading|trusted|reliable|cheap|affordable|cost|pric|rate|quot|fee|24|emergency|rapid|fast|quick|immediate|near me|nearby|guarantee|insured|vetted)/i
    const missed = WORKBOOK_KEYWORDS.filter((k) => WATCH.test(k.keyword) && k.claimSensitive.length === 0).map((k) => k.id)
    assert.deepEqual(missed, ["KW-301"]) // "best cctv placement for a home": reviewed, excluded by judgment J2
  })
  it("final counts are stable and every category is used", () => {
    const flagged = WORKBOOK_KEYWORDS.filter((k) => k.claimSensitive.length > 0)
    assert.equal(flagged.length, 30)
    assert.equal(flagged.filter((k) => k.classification === "rule").length, 28)
    assert.equal(flagged.filter((k) => k.classification === "judgment-included").length, 2)
    assert.equal(WORKBOOK_KEYWORDS.filter((k) => k.classification === "judgment-excluded").length, 1)
    for (const rule of CLAIM_RULES) assert.ok(flagged.some((k) => k.claimSensitive.includes(rule.category)), rule.category)
    assert.ok(JUDGMENT_RULES.length >= 2)
  })
  it("claim-sensitive homepage keywords are not written into the live homepage metadata", () => {
    const live = JSON.stringify([pageMetadata("/"), rootMetadata, buildHomeJsonLd()]).toLowerCase()
    for (const k of HOME_KEYWORDS.filter((k) => k.claimSensitive.length)) {
      assert.equal(live.includes(k.keyword.toLowerCase()), false, `${k.id} ${k.keyword}`)
    }
  })
})

describe("docs/seo/implementation-matrix.md agrees with the workbook-derived data", () => {
  const doc = readFileSync(path.join(ROOT, "docs/seo/implementation-matrix.md"), "utf8")
  const sections = Object.fromEntries(doc.split(/\n## /).slice(1).map((sec) => [sec.match(/^(\d+)\./)?.[1] ?? sec.slice(0, 12), sec]))

  // id -> path as documented in sections 4 (homepage), 6 (editorial) and 8 (planned pages)
  const documented = new Map()
  const add = (id, p) => { assert.equal(documented.has(id), false, `${id} documented twice`); documented.set(id, p) }
  for (const m of sections["4"].matchAll(/^\| (KW-\d{3}) \|/gm)) add(m[1], "/")
  for (const m of sections["6"].split("### EDITORIAL CALENDAR")[0].matchAll(/^\| (KW-\d{3}) \|[^\n]*\| `([^`]+)` \|/gm)) add(m[1], m[2])
  for (const part of sections["8"].split(/\n### `/).slice(1)) {
    const pagePath = part.slice(0, part.indexOf("`"))
    for (const m of part.matchAll(/^- (KW-\d{3}) /gm)) add(m[1], pagePath)
  }

  it("documents every one of the 311 keywords exactly once, at the planned path in the data", () => {
    assert.equal(documented.size, 311)
    for (const k of WORKBOOK_KEYWORDS) assert.equal(documented.get(k.id), k.plannedPath, k.id)
  })
  it("includes all ten worksheets", () => {
    for (const sheet of ["EXECUTIVE DASHBOARD", "KEYWORD MASTER", "CLUSTER STRATEGY", "PAGE MAP & META", "90 DAY ROADMAP", "EDITORIAL CALENDAR", "LOCAL SEO", "TECHNICAL AUDIT", "KPI SCORECARD", "SOURCES & METHODS"]) {
      assert.ok(sections["1"].includes(`| ${sheet} |`), sheet)
    }
  })
  it("states the claim-sensitive count the classifier produces, and lists exactly those keywords", () => {
    const flagged = WORKBOOK_KEYWORDS.filter((k) => classifyKeyword(k.keyword).categories.length > 0)
    assert.match(sections["7"], new RegExp(`\\*\\*Claim-sensitive keywords: ${flagged.length}\\*\\*`))
    const table = sections["7"].split("### All claim-sensitive keywords")[1]
    const listed = [...table.matchAll(/^\| (KW-\d{3}) \|/gm)].map((m) => m[1])
    assert.deepEqual(listed, flagged.map((k) => k.id))
  })
  it("documents every classification rule and judgment rule", () => {
    for (const rule of CLAIM_RULES) assert.ok(sections["7"].includes(`**${rule.category}**`) && sections["7"].includes(rule.pattern.source), rule.category)
    for (const j of JUDGMENT_RULES) assert.ok(sections["7"].includes(`**${j.id}**`), j.id)
  })
  it("documents the Rongo/Migori consolidation and has no Migori page", () => {
    assert.ok(sections["5"].includes("`/locations/rongo/`"))
    assert.equal(/\| `\/locations\/migori\/` \|[^\n]*\n/.test(sections["8"]), false)
    assert.equal(sections["8"].includes("### `/locations/migori/`"), false)
  })
  it("names the copy flagged for review", () => {
    for (const item of COPY_REVIEW_ITEMS) assert.ok(doc.includes(item.phrase) && doc.includes(item.file), item.phrase)
  })
  it("states no search volume, difficulty, CPC or ranking figure", () => {
    assert.equal(/\b\d[\d,.]*\s*(searches|\/mo\b|per month|monthly searches|KES)/i.test(doc), false)
    assert.equal(/\b(difficulty|ranking|position)\s*[:=]\s*\d/i.test(doc), false)
    assert.ok(/Not validated/.test(doc))
  })
})

describe("canonical host is the apex (https://jolusecurity.com), never www", () => {
  const APEX = "https://jolusecurity.com"
  it("uses the apex everywhere a canonical origin is emitted", () => {
    assert.equal(siteConfig.url, APEX)
    assert.equal(new URL(siteConfig.url).hostname, "jolusecurity.com")
    assert.equal(rootMetadata.metadataBase.origin, APEX)
    assert.equal(canonicalUrl("/"), APEX)
    assert.equal(robots().sitemap, `${APEX}/sitemap.xml`)
    const blob = JSON.stringify([
      sitemap(),
      robots(),
      buildHomeJsonLd(),
      pageMetadata("/"),
      ...LIVE_PAGES.map((p) => canonicalUrl(p.path)),
    ])
    assert.equal(/\/\/www\.jolusecurity\.com/i.test(blob), false)
    assert.ok(blob.includes(APEX))
  })
  it("has no hard-coded www canonical origin in application or library source", () => {
    const hits = []
    const walk = (dir) => {
      for (const name of readdirSync(dir)) {
        const full = path.join(dir, name)
        if (statSync(full).isDirectory()) walk(full)
        else if (/\.(tsx?|mdx?|json|webmanifest)$/.test(name) && /\/\/www\.jolusecurity\.com/i.test(readFileSync(full, "utf8"))) hits.push(full)
      }
    }
    for (const dir of ["app", "components", "lib", "public"]) walk(path.join(ROOT, dir))
    assert.deepEqual(hits, [])
  })
})
