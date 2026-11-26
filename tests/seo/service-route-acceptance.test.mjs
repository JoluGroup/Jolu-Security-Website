// Release 04B lane D: service route acceptance. The route architecture is the canonical static template
// (tests/helpers/manifest-routes.mjs, docs/seo/page-architecture.md) rendered through the publication gate. A route file
// is added in the SAME reviewed change as its manifest entry, so production has no app/services folder today.
//
// APPROVED behaviour is proven in isolated fixtures only: a synthetic world (invented evidence and approvals, never the real
// ledger) whose manifest entry carries the REAL draft metadata, and a temporary route tree written from the canonical
// template. UNAPPROVED behaviour is proven against the real, empty registries.
import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"

const ROOT = path.resolve(import.meta.dirname, "../..")
const gate = await import("@/lib/seo/publication-gate")
const { gatedPageMetadata } = await import("@/lib/seo/page-metadata")
const { buildServicePageJsonLd } = await import("@/lib/seo/service-json-ld")
const { canonicalUrl } = await import("@/lib/seo/metadata")
const { SERVICE_PAGE_RECORDS } = await import("@/lib/seo/page-records")
const { SERVICE_CONTENT } = await import("@/lib/seo/service-content")
const { default: sitemap } = await import("../../app/sitemap.ts")
const R = await import("../helpers/manifest-routes.mjs")
const W = await import("../helpers/gate-world.mjs")
const { contentFor, worldFor } = await import("../helpers/aeo-fixture.mjs")
const { ServiceLanding } = await import("../helpers/service-landing-loader.mjs")

const EXPECTED_SLUGS = ["manned-guarding", "cctv-installation", "electric-fencing", "alarm-response", "events-security", "k9-unit-services", "vip-close-protection"]
// Manned guarding is excluded from approved fixtures: its regulator sentence still needs compliance approval.
const READY = EXPECTED_SLUGS.filter((s) => s !== "manned-guarding")
const words = (s) => s.trim().split(/\s+/).length
const textOf = (html) => html.replace(/<script.*?<\/script>/gs, " ").replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ")

/** A synthetic approved world for `slug` whose manifest entry uses the real draft title and description. */
function approved(slug) {
  const c = contentFor(slug)
  const w = worldFor(slug, c)
  Object.assign(w.deps.manifest[0], { title: c.metaTitle, description: c.metaDescription })
  W.redigest(w)
  const records = SERVICE_PAGE_RECORDS.map((r) => (r.slug === slug ? w.record : r))
  return { c, w, records }
}

describe("canonical destinations", () => {
  it("the seven service destinations are exactly the expected /services/<slug> paths, each with draft content", () => {
    assert.deepEqual(SERVICE_PAGE_RECORDS.map((r) => r.publicPath).sort(), EXPECTED_SLUGS.map((s) => `/services/${s}`).sort())
    assert.deepEqual(SERVICE_CONTENT.map((c) => c.slug).sort(), [...EXPECTED_SLUGS].sort())
  })
})

describe("approved fixture: route, sitemap, metadata, structured data and navigation agree", () => {
  for (const slug of READY) {
    it(`${slug}`, async () => {
      const { c, w, records } = approved(slug)
      const publicPath = `/services/${slug}`
      assert.deepEqual(gate.evaluatePublication(w.record, w.deps, records.filter((r) => r.slug !== slug)).reasons, [])
      // route availability, sitemap source and navigation all come from the same gate decision
      assert.deepEqual(gate.publishedPagePaths(records, w.deps), [publicPath])
      assert.deepEqual(gate.getPublishedNavLinks(records, w.deps).map((l) => l.href), [publicPath])
      const page = gate.getPublishedPage("service", slug, records, w.deps)
      assert.ok(page)
      assert.equal(gate.getPublishedPage("service", "cctv-installation" === slug ? "alarm-response" : "cctv-installation", records, w.deps), null, "only the approved page")
      // metadata: unique title from the manifest, self-referencing canonical on the page path
      const meta = gatedPageMetadata(page)
      assert.equal(meta.title, c.metaTitle)
      assert.equal(meta.description, c.metaDescription)
      assert.equal(meta.alternates.canonical, publicPath)
      assert.equal(meta.openGraph.url, publicPath)
      // the canonical route template for this entry passes the route verifier in a temporary tree
      const dir = mkdtempSync(path.join(tmpdir(), "r04b-route-"))
      try {
        mkdirSync(path.join(dir, "app/services", slug), { recursive: true })
        writeFileSync(path.join(dir, R.routeFileFor(publicPath)), R.goodRoute("service", slug))
        assert.deepEqual(R.verifyManifestRoutes(w.deps.manifest, dir), { checked: 1, problems: [] })
        assert.deepEqual(R.findUnmanifestedRoutes(w.deps.manifest, dir), [])
      } finally { rmSync(dir, { recursive: true, force: true }) }
      // structured data: Service, BreadcrumbList and FAQPage built from the same content, on the apex origin
      const ld = buildServicePageJsonLd(page, c)
      const types = ld["@graph"].map((n) => n["@type"])
      for (const t of ["Organization", "Service", "BreadcrumbList", "FAQPage"]) assert.ok(types.includes(t), t)
      const crumbs = ld["@graph"].find((n) => n["@type"] === "BreadcrumbList").itemListElement
      assert.equal(crumbs.at(-1).item, canonicalUrl(publicPath))
      assert.ok(canonicalUrl(publicPath).startsWith("https://jolusecurity.com/"))
      // rendered page: one H1, answer-first summary, cost-driver table, 4-6 FAQs, assessment CTA, related links
      const html = await ServiceLanding({ page, content: c })
      const text = textOf(html)
      assert.equal((html.match(/<h1[ >]/g) ?? []).length, 1)
      assert.ok(words(c.answer) >= 45 && words(c.answer) <= 60, `${words(c.answer)} words`)
      assert.ok(text.indexOf(c.answer) > text.indexOf(c.h1))
      assert.equal((html.match(/<table[ >]/g) ?? []).length, 1)
      assert.ok(c.faqs.length >= 4 && c.faqs.length <= 6)
      assert.match(text, new RegExp(`Request a site assessment for ${c.h1.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i"))
      assert.ok(html.includes(`href="/?service=${w.record.serviceId}#contact"`), "site-assessment CTA links to the enquiry form for this service")
      assert.match(html, /<nav aria-label="Related services"/)
      assert.ok(html.includes('href="/#services"') && html.includes('href="/#contact"'))
      // related links never point at an unpublished page (only this page is published in the fixture's own registry;
      // the real registry used by the component has none, so no /services/ link is rendered at all)
      const related = /<nav aria-label="Related services".*?<\/nav>/s.exec(html)[0]
      assert.ok(!/href="\/services\//.test(related), "no link to an unpublished service")
      // the FAQ markup equals the visible FAQ
      const faq = JSON.parse(/<script type="application\/ld\+json">(.*?)<\/script>/s.exec(html)[1])["@graph"].find((n) => n["@type"] === "FAQPage")
      assert.deepEqual(faq.mainEntity.map((q) => [q.name, q.acceptedAnswer.text]), c.faqs.map((f) => [f.question, f.answer]))
      for (const f of c.faqs) assert.ok(text.includes(f.question) && text.includes(f.answer), f.question)
    })
  }
})

describe("unapproved (production): every service page is unreachable on every surface", () => {
  for (const slug of EXPECTED_SLUGS) {
    it(`${slug}`, () => {
      const rec = SERVICE_PAGE_RECORDS.find((r) => r.slug === slug)
      assert.equal(gate.getPublishedPage("service", slug), null, "route lookup returns null, so the route calls notFound()")
      assert.equal(gatedPageMetadata(rec), null, "no metadata")
      assert.equal(buildServicePageJsonLd(rec, contentFor(slug)), null, "no JSON-LD")
      assert.ok(!existsSync(path.join(ROOT, "app/services", slug)), "no route file")
    })
  }
  it("sitemap, navigation and the published-path list are empty of service pages", () => {
    assert.deepEqual(gate.publishedPagePaths(), [])
    assert.deepEqual(gate.getPublishedNavLinks(), [])
    assert.ok(!sitemap().some((e) => e.url.includes("/services/")))
  })
  it("an approved-looking record cannot reach the real registries (empty ledger and manifest)", () => {
    const { w } = approved("alarm-response")
    assert.equal(gate.evaluatePublication(w.record).published, false)
  })
})

describe("draft content never reaches a client bundle or a public API", () => {
  const files = []
  const walk = (d) => { for (const n of readdirSync(d)) { const p = path.join(d, n); if (statSync(p).isDirectory()) walk(p); else if (/\.(tsx?|mjs)$/.test(n)) files.push(p) } }
  for (const d of ["app", "components", "lib"]) walk(path.join(ROOT, d))
  const rel = (p) => path.relative(ROOT, p).split(path.sep).join("/")
  it("no 'use client' module imports draft content, the AEO components or the publication gate", () => {
    for (const f of files) {
      const src = readFileSync(f, "utf8")
      if (!/^\s*["']use client["']/m.test(src)) continue
      assert.ok(!/service-content|components\/aeo|publication-gate|service-sections|service-json-ld|evidence-ledger/.test(src), rel(f))
    }
  })
  it("no API route reads draft content or page records", () => {
    for (const f of files.filter((f) => /^app\/api\//.test(rel(f)))) assert.ok(!/lib\/seo\//.test(readFileSync(f, "utf8")), rel(f))
  })
})
