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
const { SERVICES } = await import("@/lib/services")

const ROOT = path.resolve(import.meta.dirname, "../..")
const SITE = "https://www.jolusecurity.com"

// Words and phrases that would be unsupported public claims today (lib/claims.ts: every claim "needs-evidence").
const CLAIM_PATTERNS = [
  /licen[cs]ed/i, /registered/i, /certified/i, /accredited/i, /compliant/i, /\bpsra\b/i,
  /24\s?\/\s?7/, /24[- ]hours?/i, /round[- ]the[- ]clock/i, /around the clock/i,
  /(?<![\w-])best(?![\w-])/i, /(?<![\w-])top[- ](rated|tier)(?![\w-])/i, /(?<![\w-])leading(?![\w-])/i, /\btrusted\b/i, /\bno\.?\s?1\b/i, /#1/, /award/i,
  /guarantee/i, /\brapid\b/i, /(?<![\w-])fast(?![\w-])/i, /within \d+/i, /\bminutes?\b/i, /\d+\+/, /since \d{4}/i, /\bover \d+ years/i,
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
  it("the homepage title and description follow the workbook primary keyword with the approved brand", () => {
    const m = pageMetadata("/")
    assert.deepEqual(m.title, { absolute: "Security Companies in Kenya | JOLU SECURITY" })
    assert.equal(HOME_TITLE, "Security Companies in Kenya | JOLU SECURITY")
    assert.match(HOME_DESCRIPTION, /^JOLU SECURITY: /)
    assert.ok(HOME_TITLE.toLowerCase().includes("security companies in kenya"))
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
      assert.equal(m.openGraph.images[0].url, siteConfig.logo.src)
      assert.deepEqual([m.openGraph.images[0].width, m.openGraph.images[0].height], [501, 501])
      assert.equal(m.twitter.card, "summary")
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
  it("lists exactly the approved offices, using their visible wording", () => {
    assert.equal(org.location.length, siteConfig.offices.length)
    siteConfig.offices.forEach((office, i) => {
      const place = org.location[i]
      assert.equal(place["@type"], "Place")
      assert.equal(place.address.addressLocality, office.name)
      assert.equal(place.address.addressCountry, "KE")
      // Together the structured fields reproduce the visible address.
      assert.equal(`${place.address.streetAddress}, ${office.name}, Kenya`.replace(`, ${office.name}, ${office.name}`, `, ${office.name}`), office.address.includes(`${office.name}, Kenya`) ? office.address : `${office.address}`)
    })
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
  it("no planned page is live, in the sitemap, or has a live route", () => {
    const live = new Set(LIVE_PAGES.map((p) => p.path))
    const inSitemap = new Set(sitemap().map((e) => new URL(e.url).pathname))
    for (const page of PLANNED_PAGES) {
      assert.equal(live.has(page.path), false, page.path)
      assert.equal(inSitemap.has(page.path), false, page.path)
      assert.throws(() => statSync(path.join(ROOT, "app", page.path)), undefined, `unexpected route directory for ${page.path}`)
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
  it("claim-sensitive keywords are flagged so they are not written into copy without evidence", () => {
    const flagged = PLANNED_PAGES.flatMap((p) => p.supportingKeywords.filter((k) => k.claimSensitive.length))
    assert.ok(flagged.length > 0)
    for (const kw of flagged) assert.ok(claimsIn(kw.keyword).length > 0 || kw.claimSensitive.includes("pricing") || /(^|\s)top(\s|$)/i.test(kw.keyword), kw.keyword)
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
  it("the visible site source (components, pages, services, config) contains no claim phrases", () => {
    const files = []
    const walk = (dir) => {
      for (const name of readdirSync(dir)) {
        const full = path.join(dir, name)
        if (statSync(full).isDirectory()) walk(full)
        else if (/\.(tsx?|mdx?)$/.test(name)) files.push(full)
      }
    }
    for (const dir of ["components", "app"]) walk(path.join(ROOT, dir))
    files.push(path.join(ROOT, "lib/services.ts"), path.join(ROOT, "lib/site-config.ts"), path.join(ROOT, "lib/seo/pages.ts"))
    const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1")
    const hits = []
    for (const file of files) {
      if (/components\/ui\//.test(file) || /app\/api\//.test(file) || /enquiry-form\.tsx$/.test(file)) continue
      const found = claimsIn(strip(readFileSync(file, "utf8")))
      if (found.length) hits.push(`${path.relative(ROOT, file)}: ${found.join(" ")}`)
    }
    assert.deepEqual(hits, [])
  })
})
