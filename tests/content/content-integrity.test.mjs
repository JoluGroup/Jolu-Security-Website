import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { describe, it } from "node:test"
import { renderComponent } from "./render-helper.mjs"

const ROOT = path.resolve(import.meta.dirname, "../..")
const { siteConfig } = await import("@/lib/site-config")
const { OFFICES, getApprovedOffices, selectApprovedOffices, PLANNED_OFFICE_NAMES } = await import("@/lib/offices")
const { CLIENT_CATEGORIES, getApprovedClientCategories, selectApprovedClientCategories } = await import("@/lib/client-categories")
const { CLAIMS, getApprovedClaims } = await import("@/lib/claims")
const { buildHomeJsonLd, serializeJsonLd } = await import("@/lib/seo/json-ld")
const { HOME_DESCRIPTION, LIVE_PAGES } = await import("@/lib/seo/pages")
const { pageMetadata, rootMetadata } = await import("@/lib/seo/metadata")

// Office text copied from the separate JOLU Machineries site. Must not render or be emitted without JOLU Security evidence.
const MACHINERIES_STRINGS = [
  "Thome", "Along West Road", "Opposite Nakuru Athletics", "Evans Hospital", "KENGAS", "Near KENGAS Rongo",
  "Regional Office & Showroom", "Head Office", "Branch Office",
]
const hasMachineriesText = (text) => MACHINERIES_STRINGS.filter((s) => text.toLowerCase().includes(s.toLowerCase()))

const read = (rel) => readFileSync(path.join(ROOT, rel), "utf8")
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1")
function files(dirs, re = /\.(tsx?|mdx?)$/) {
  const out = []
  const walk = (d) => {
    for (const n of readdirSync(d)) {
      const f = path.join(d, n)
      if (statSync(f).isDirectory()) walk(f)
      else if (re.test(n)) out.push(f)
    }
  }
  for (const d of dirs) walk(path.join(ROOT, d))
  return out
}

const noApprovedOffices = getApprovedOffices().length === 0

describe("offices registry", () => {
  it("no office is approved, and unapproved entries carry no address or label text", () => {
    assert.equal(noApprovedOffices, true)
    for (const o of OFFICES) {
      assert.equal(o.status, "needs-evidence", o.id)
      assert.equal(o.address, null, o.id)
      assert.equal(o.label, null, o.id)
      assert.equal(o.evidence, null, o.id)
    }
  })
  it("siteConfig no longer carries offices or client categories", () => {
    assert.equal("offices" in siteConfig, false)
    assert.equal("clientCategories" in siteConfig, false)
  })
  it("approval needs status, evidence, label and address together", () => {
    const base = { id: "x", name: "X", label: "Label", address: "Addr" }
    assert.equal(selectApprovedOffices([{ ...base, status: "approved", evidence: null }]).length, 0)
    assert.equal(selectApprovedOffices([{ ...base, status: "approved", evidence: "  " }]).length, 0)
    assert.equal(selectApprovedOffices([{ ...base, status: "needs-evidence", evidence: "doc" }]).length, 0)
    assert.equal(selectApprovedOffices([{ ...base, status: "approved", evidence: "doc", address: null }]).length, 0)
    assert.equal(selectApprovedOffices([{ ...base, status: "approved", evidence: "doc" }]).length, 1)
  })
  it("the publication gate still has the planned office identities", () => {
    assert.deepEqual([...PLANNED_OFFICE_NAMES].sort(), ["Migori", "Nairobi", "Nakuru"])
  })
})

describe("no Machineries-derived office text in source or rendered output", () => {
  it("no rendered-source file (app, components, services, config, registries) contains the known strings", () => {
    const targets = [...files(["app", "components"]), ...["lib/site-config.ts", "lib/offices.ts", "lib/client-categories.ts", "lib/services.ts", "lib/claims.ts", "lib/seo/json-ld.ts", "lib/seo/page-json-ld.ts", "lib/seo/pages.ts", "lib/seo/metadata.ts"].map((f) => path.join(ROOT, f))]
    const hits = []
    for (const f of targets) {
      const found = hasMachineriesText(read(path.relative(ROOT, f)))
      if (found.length) hits.push(`${path.relative(ROOT, f)}: ${found.join(", ")}`)
    }
    assert.deepEqual(hits, [])
  })
  it("the rendered footer, contact section and office list contain none of them and keep no empty Offices heading", async () => {
    assert.equal(noApprovedOffices, true)
    for (const [file, name] of [["components/site-footer.tsx", "SiteFooter"], ["components/contact-section.tsx", "ContactSection"], ["components/office-list.tsx", "OfficeList"]]) {
      const html = await renderComponent(file, name)
      assert.deepEqual(hasMachineriesText(html), [], name)
      assert.equal(/Offices/.test(html), false, `${name} must not show an Offices heading`)
      assert.equal(/footer-offices-title/.test(html), false, name)
    }
    assert.equal(await renderComponent("components/office-list.tsx", "OfficeList"), "")
  })
  it("every surface that renders offices goes through the approved registry", () => {
    for (const f of ["components/site-footer.tsx", "components/contact-section.tsx"]) assert.match(read(f), /getApprovedOffices\(\)/, f)
    assert.match(read("components/office-list.tsx"), /getApprovedOffices\(\)/)
    for (const f of files(["app", "components"])) assert.equal(/siteConfig\.offices|\.offices\b/.test(stripComments(readFileSync(f, "utf8"))), false, f)
  })
  it("JSON-LD, metadata and the sitemap contain none of them", () => {
    const all = JSON.stringify([buildHomeJsonLd(), rootMetadata, ...LIVE_PAGES.map((p) => pageMetadata(p.path)), HOME_DESCRIPTION])
    assert.deepEqual(hasMachineriesText(all), [])
  })
})

describe("structured data is gated on approved evidence", () => {
  const data = buildHomeJsonLd()
  const text = serializeJsonLd(data)
  it("has no PostalAddress, address, location, areaServed or geo while no office is approved", () => {
    assert.equal(noApprovedOffices, true)
    for (const key of ["PostalAddress", "address", "addressLocality", "streetAddress", "location", "areaServed", "geo", "GeoCoordinates", "Place"]) {
      assert.equal(text.includes(`"${key}"`), false, key)
    }
  })
  it("the JSON-LD builder reads no office data and emits no areaServed/location keys at all", () => {
    const src = stripComments(read("lib/seo/json-ld.ts"))
    assert.equal(/offices|PostalAddress|areaServed|location\s*:/.test(src), false)
    assert.equal(/areaServed/.test(stripComments(read("lib/seo/page-json-ld.ts"))), false)
  })
  it("keeps a valid Organization and WebSite with the approved brand, logo and contact points", () => {
    const org = data["@graph"].find((n) => n["@type"] === "Organization")
    const site = data["@graph"].find((n) => n["@type"] === "WebSite")
    assert.equal(org.name, "JOLU SECURITY")
    assert.equal(org.alternateName, "Jolu Security")
    assert.equal(org.logo.url, "https://jolusecurity.com/lovable-uploads/jolu-logo.png")
    assert.equal(org.email, "info@jolusecurity.com")
    assert.deepEqual(org.contactPoint.map((c) => c.telephone), ["+254790298003", "+254705038679"])
    assert.equal(site.publisher["@id"], org["@id"])
  })
  it("homepage description and site description make no nationwide-coverage claim", () => {
    for (const t of [HOME_DESCRIPTION, siteConfig.description]) assert.equal(/across kenya|nationwide|countrywide|all counties/i.test(t), false, t)
  })
})

describe("client categories and claims are evidence-gated", () => {
  it("every category and every claim is needs-evidence, so none is approved", () => {
    assert.equal(getApprovedClientCategories().length, 0)
    for (const c of CLIENT_CATEGORIES) assert.equal(c.status, "needs-evidence", c.id)
    assert.equal(getApprovedClaims().length, 0)
    for (const c of CLAIMS) assert.equal(c.status, "needs-evidence", c.id)
  })
  it("approval of a category needs status and evidence", () => {
    const e = { id: "estates", label: "Estates" }
    assert.equal(selectApprovedClientCategories([{ ...e, status: "approved", evidence: "" }]).length, 0)
    assert.equal(selectApprovedClientCategories([{ ...e, status: "needs-evidence", evidence: "doc" }]).length, 0)
    assert.equal(selectApprovedClientCategories([{ ...e, status: "approved", evidence: "doc" }]).length, 1)
  })
  it("the trust strip renders nothing at all (no heading, no list)", async () => {
    assert.equal(await renderComponent("components/trust-strip.tsx", "TrustStrip"), "")
  })
  it("the old category wording and unapproved claim text render nowhere in the footer or contact section", async () => {
    const html = (await renderComponent("components/site-footer.tsx", "SiteFooter")) + (await renderComponent("components/contact-section.tsx", "ContactSection"))
    for (const c of CLAIMS) assert.equal(html.includes(c.text), false, c.text)
    for (const c of CLIENT_CATEGORIES) assert.equal(html.includes(`>${c.label}<`), false, c.label)
  })
  it("no component source hard-codes the category list or claim texts", () => {
    for (const f of files(["app", "components"])) {
      const src = stripComments(readFileSync(f, "utf8"))
      assert.equal(/Residential communities|Security for estates/.test(src), false, f)
      for (const c of CLAIMS) assert.equal(src.includes(c.text), false, `${path.relative(ROOT, f)}: ${c.text}`)
    }
  })
})

describe("approved contact information and branding are unchanged", () => {
  it("phones, email and WhatsApp values are exactly the approved ones", () => {
    const { contact } = siteConfig
    assert.deepEqual(contact.phones.map((p) => [p.display, p.displayIntl, p.e164, p.href]), [
      ["0790 298 003", "+254 790 298 003", "+254790298003", "tel:+254790298003"],
      ["0705 038 679", "+254 705 038 679", "+254705038679", "tel:+254705038679"],
    ])
    assert.equal(contact.email, "info@jolusecurity.com")
    assert.equal(contact.whatsappHref, "https://wa.me/254790298003")
    assert.equal(contact.whatsappNumber, "254790298003")
  })
  it("the footer and contact section still render the phones, email and WhatsApp link", async () => {
    for (const [file, name] of [["components/site-footer.tsx", "SiteFooter"], ["components/contact-section.tsx", "ContactSection"]]) {
      const html = await renderComponent(file, name)
      for (const needle of ["tel:+254790298003", "tel:+254705038679", "+254 790 298 003", "+254 705 038 679", "mailto:info@jolusecurity.com", "info@jolusecurity.com", "https://wa.me/254790298003"]) {
        assert.ok(html.includes(needle), `${name} missing ${needle}`)
      }
    }
  })
  it("the logo reference and the brand name are unchanged and rendered", async () => {
    assert.deepEqual(siteConfig.logo, { src: "/lovable-uploads/jolu-logo.png", alt: "Jolu Security logo" })
    assert.equal(siteConfig.name, "Jolu Security")
    assert.equal(siteConfig.url, "https://jolusecurity.com")
    const html = await renderComponent("components/site-footer.tsx", "SiteFooter")
    assert.ok(html.includes('src="/lovable-uploads/jolu-logo.png"'))
    assert.ok(statSync(path.join(ROOT, "public/lovable-uploads/jolu-logo.png")).isFile())
  })
})

describe("rendered copy carries no unsupported claim phrases", () => {
  // Phrases the owner treats as unverified: licensing, certification, availability, guard numbers, history, coverage.
  const PATTERNS = [/licen[cs]ed/i, /certified/i, /accredited/i, /\bpsra\b/i, /\biso\s?\d/i, /24\s?\/\s?7/, /round[- ]the[- ]clock/i, /nationwide/i, /countrywide/i, /across kenya/i, /all counties/i, /trusted by/i, /\d+\+/, /\b\d+\s+(years|guards)\b/i, /since \d{4}/i, /years of (experience|service)/i]
  it("app and components string content has no hit", () => {
    const hits = []
    for (const f of files(["app", "components"])) {
      const src = stripComments(readFileSync(f, "utf8"))
      for (const rx of PATTERNS) if (rx.test(src)) hits.push(`${path.relative(ROOT, f)}: ${rx}`)
    }
    assert.deepEqual(hits, [])
  })
})

describe("owner-approved content (Patch 2)", () => {
  it("the industries heading is exactly the approved string and the old heading is gone", async () => {
    const html = await renderComponent("components/industries-section.tsx", "IndustriesSection")
    assert.match(html, /<h2[^>]*id="industries-title"[^>]*>Security Solutions for Different Environments<\/h2>/)
    assert.equal(html.includes("Where we work"), false)
    assert.match(html, /id="industries"/)
    assert.match(html, />Industries</)
  })
  it("Professional Protection is retained in the hero", () => {
    assert.ok(read("components/protection-stage.tsx").includes("Professional Protection"))
  })
  it("removed claim strings have not returned in rendered/metadata sources", () => {
    const meta = JSON.stringify([rootMetadata, ...LIVE_PAGES.map((p) => pageMetadata(p.path)), buildHomeJsonLd()])
    assert.equal(/kenya|areaServed|PostalAddress/i.test(meta.replace(/en-KE/g, "")), false)
    assert.equal(/Security Companies in Kenya|across Kenya|in Kenya/i.test(stripComments(read("lib/seo/pages.ts")).replace(/^.*$/m, "")), false)
    for (const f of ["components/intro-section.tsx", "components/industries-section.tsx", "components/protection-stage.tsx", "lib/site-config.ts"]) {
      assert.equal(/across Kenya|services in Kenya|Security Companies in Kenya/i.test(stripComments(read(f))), false, f)
    }
  })
})
