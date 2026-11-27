// Release 04 (Lane SEO): structured data for the service pages. Built only from a gate-published page and the same
// content the page renders, so the markup cannot say anything the visitor cannot see.
import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { renderComponent } from "../content/render-helper.mjs"
import { contentFor, recordFor, scrubDeep, worldFor } from "../helpers/aeo-fixture.mjs"

const { buildServicePageJsonLd, buildFaqNode, buildBreadcrumbItems } = await import("@/lib/seo/service-json-ld")
const { buildHomeJsonLd, buildOrganizationCore, ORG_ID } = await import("@/lib/seo/json-ld")
const { publishRecord } = await import("@/lib/seo/publication-gate")
const { SERVICE_CONTENT } = await import("@/lib/seo/service-content")
const { siteConfig } = await import("@/lib/site-config")

const publishedFixture = (slug) => {
  const content = scrubDeep(contentFor(slug))
  const w = worldFor(slug, content)
  const page = publishRecord(w.record, w.deps)
  assert.ok(page, `${slug} must publish in the synthetic world`)
  return { page, content }
}
const SLUGS = SERVICE_CONTENT.map((c) => c.slug)

describe("service page JSON-LD", () => {
  for (const slug of SLUGS.filter((s) => s !== "manned-guarding")) {
    it(`${slug}: Organization, Service, BreadcrumbList and FAQPage with stable @id values`, () => {
      const { page, content } = publishedFixture(slug)
      const ld = buildServicePageJsonLd(page, content)
      const url = `https://jolusecurity.com/services/${slug}`
      assert.equal(ld["@context"], "https://schema.org")
      assert.deepEqual(ld["@graph"].map((n) => n["@type"]), ["Organization", "Service", "BreadcrumbList", "FAQPage"])
      const [org, service, crumbs, faq] = ld["@graph"]
      assert.equal(org["@id"], "https://jolusecurity.com/#organization")
      assert.equal(org["@id"], ORG_ID)
      assert.equal(service["@id"], `${url}#service`)
      assert.equal(crumbs["@id"], `${url}#breadcrumb`)
      assert.equal(faq["@id"], `${url}#faq`)
      assert.deepEqual(service.provider, { "@id": org["@id"] })
      assert.equal(service.url, url)
      assert.equal(service.name, content.h1)
      assert.equal(service.description, content.answer)
      // @id values are unique and every {"@id"} reference resolves inside the graph
      const ids = ld["@graph"].map((n) => n["@id"])
      assert.equal(new Set(ids).size, ids.length)
      for (const m of JSON.stringify(ld).matchAll(/\{"@id":"([^"]+)"\}/g)) assert.ok(ids.includes(m[1]), m[1])
    })
  }
  it("Organization carries only verified identity: name, apex URL, approved logo, verified contacts", () => {
    const org = buildOrganizationCore()
    assert.equal(org.name, "JOLU SECURITY")
    assert.equal(org.url, "https://jolusecurity.com/")
    assert.equal(org.logo.url, new URL(siteConfig.logo.src, siteConfig.url).toString())
    assert.equal(org.email, "info@jolusecurity.com")
    assert.deepEqual(org.contactPoint.map((c) => c.telephone), ["+254790298003", "+254705038679"])
    for (const k of ["sameAs", "address", "areaServed", "parentOrganization", "foundingDate", "location", "hasCredential", "aggregateRating", "review", "priceRange", "openingHours", "geo", "memberOf", "taxID", "vatID"]) assert.ok(!(k in org), k)
    const homeOrg = buildHomeJsonLd()["@graph"].find((n) => n["@type"] === "Organization")
    const { hasOfferCatalog, ...rest } = homeOrg
    assert.ok(hasOfferCatalog)
    assert.deepEqual(rest, org)
  })
  it("no unverified or forbidden property anywhere in a service graph", () => {
    const { page, content } = publishedFixture("electric-fencing")
    const json = JSON.stringify(buildServicePageJsonLd(page, content))
    for (const bad of ["areaServed", "LocalBusiness", "PostalAddress", "streetAddress", "sameAs", "parentOrganization", "aggregateRating", "\"review\"", "priceRange", "\"offers\"", "\"price\"", "openingHours", "\"geo\"", "hasCredential", "foundingDate"]) assert.ok(!json.includes(bad), bad)
    assert.ok(!/jolu group/i.test(json))
    for (const m of json.matchAll(/"(?:url|item|@id)":"([^"]+)"/g)) assert.match(m[1], /^https:\/\/jolusecurity\.com(\/|#|$)/, m[1])
  })
  it("the breadcrumb follows the real route hierarchy (Home, then the service; there is no /services index route)", () => {
    for (const c of SERVICE_CONTENT) {
      const items = buildBreadcrumbItems(c)
      assert.deepEqual(items.map((i) => i.name), ["Home", c.h1])
      assert.deepEqual(items.map((i) => i.url), ["https://jolusecurity.com", `https://jolusecurity.com/services/${c.slug}`])
    }
  })
  it("the FAQPage equals the visible FAQ: same questions, same answers, same order", async () => {
    for (const c of SERVICE_CONTENT) {
      const html = await renderComponent("components/aeo/faq-section.tsx", "FaqSection", { items: c.faqs })
      const visible = [...html.matchAll(/<summary[^>]*>([\s\S]*?)<\/summary><p[^>]*>([\s\S]*?)<\/p>/g)].map((m) => [m[1], m[2]].map((t) => t.replace(/<[^>]+>/g, "").replace(/&#x27;/g, "'").replace(/&amp;/g, "&")))
      const node = buildFaqNode(c, `https://jolusecurity.com/services/${c.slug}`)
      assert.deepEqual(node.mainEntity.map((q) => [q.name, q.acceptedAnswer.text]), visible, c.slug)
      for (const q of node.mainEntity) assert.ok(!/<[a-z]/i.test(q.acceptedAnswer.text), "plain text answers only")
    }
  })
  it("the Breadcrumb markup equals the visible breadcrumb trail", async () => {
    const c = contentFor("alarm-response")
    const html = await renderComponent("components/aeo/service-landing.tsx", "ServiceLandingBody", { content: c, requestHref: "/" })
    const nav = /<nav aria-label="Breadcrumb"[\s\S]*?<\/nav>/.exec(html)[0]
    const names = [...nav.matchAll(/<(?:a|span aria-current="page")[^>]*>([^<]+)<\/(?:a|span)>/g)].map((m) => m[1])
    assert.deepEqual(names, buildBreadcrumbItems(c).map((i) => i.name))
  })
  it("returns null for anything that did not pass the gate: unpublished record, copy of a snapshot, wrong or edited content", () => {
    const { page, content } = publishedFixture("cctv-installation")
    const real = contentFor("cctv-installation")
    assert.equal(buildServicePageJsonLd(recordFor("cctv-installation"), real), null)
    assert.equal(buildServicePageJsonLd({ ...page }, content), null)
    assert.equal(buildServicePageJsonLd(JSON.parse(JSON.stringify(page)), content), null)
    assert.equal(buildServicePageJsonLd(null, content), null)
    assert.equal(buildServicePageJsonLd(page, { ...content, answer: `${content.answer} More.` }), null)
    assert.equal(buildServicePageJsonLd(page, contentFor("alarm-response")), null)
  })
  it("every vocabulary term is a schema.org type or property in use on the site (Organization, ImageObject, ContactPoint, Service, BreadcrumbList, ListItem, FAQPage, Question, Answer)", () => {
    const { page, content } = publishedFixture("events-security")
    const types = new Set([...JSON.stringify(buildServicePageJsonLd(page, content)).matchAll(/"@type":"([A-Za-z]+)"/g)].map((m) => m[1]))
    assert.deepEqual([...types].sort(), ["Answer", "BreadcrumbList", "ContactPoint", "FAQPage", "ImageObject", "ListItem", "Organization", "Question", "Service"])
  })
})
