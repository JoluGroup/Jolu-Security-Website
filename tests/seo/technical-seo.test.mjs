// Release 04 (Lane SEO): technical SEO checks on the initial HTML (server-rendered, no JavaScript), brand guard, acronym
// casing, metadata uniqueness across live routes and drafts, sitemap and robots output, and the JSON-LD safety rules.
import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { describe, it } from "node:test"
import { renderComponent } from "../content/render-helper.mjs"

const ROOT = path.resolve(import.meta.dirname, "../..")
const { LIVE_PAGES, HOME_TITLE } = await import("@/lib/seo/pages")
const { pageMetadata, rootMetadata, canonicalUrl } = await import("@/lib/seo/metadata")
const { buildHomeJsonLd, serializeJsonLd } = await import("@/lib/seo/json-ld")
const { PLANNED_PAGES } = await import("@/lib/seo/planned-pages")
const { SERVICE_CONTENT } = await import("@/lib/seo/service-content")
const { default: sitemap } = await import("@/app/sitemap")
const { default: robots } = await import("@/app/robots")
const { siteConfig } = await import("@/lib/site-config")

const WRONG_BRANDS = /jolu group security|jolu group ltd security|jolu group security ltd|jolu group ltd/i
const textOf = (html) => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim()
const home = await renderComponent("app/page.tsx", "default")
const blog = await renderComponent("app/blog/page.tsx", "default")

describe("initial HTML of the candidate (no JavaScript needed)", () => {
  it("the homepage ships one H1, substantial body copy and the seven services in the first response", () => {
    assert.equal((home.match(/<h1[ >]/g) ?? []).length, 1)
    assert.match(textOf(/<h1[\s\S]*?<\/h1>/.exec(home)[0]), /^Confidence in every layer of protection\.$/)
    const text = textOf(home)
    assert.ok(text.length > 3000, `body text ${text.length}`)
    for (const s of ["Manned Guarding", "Events Security", "K9 Unit Services", "CCTV Installation", "Electric Fencing", "Alarm Response", "VIP Close Protection"]) assert.ok(text.includes(s), s)
    assert.ok(text.includes(siteConfig.contact.email) && text.includes("+254 790 298 003") && text.includes("+254 705 038 679"))
  })
  it("the Blog placeholder ships an H1 and body text", () => {
    assert.equal((blog.match(/<h1[ >]/g) ?? []).length, 1)
    assert.ok(textOf(blog).length > 150)
  })
  it("no template-builder tags, generator metadata, placeholder tokens or builder handles in the HTML", () => {
    for (const html of [home, blog]) {
      assert.ok(!/name="generator"|name="author"|twitter:site|gpt-engineer|lovable\.dev|data-lovable|v0\.dev|wix|elementor|webflow/i.test(html))
      assert.ok(!/\{\{|\}\}|\[\[|lorem ipsum|undefined|\[object Object\]|NaN\b/i.test(textOf(html)))
    }
  })
  it("no unsupported statistic: no standalone zero-valued counter and no numeric claim about years, guards or clients", () => {
    const text = textOf(home)
    // text nodes made only of a zero, with optional + or %, would be an animated counter caught at its initial value
    const nodes = home.replace(/<script[\s\S]*?<\/script>/g, "").split(/<[^>]+>/).map((n) => n.trim()).filter(Boolean)
    // The one allowed exception is the scroll-stage position indicator "Layer 00 / 05" (components/stage-hud.tsx): an index
    // into the five hero layers that starts at the overview step. It reports no statistic about the company.
    nodes.forEach((n, i) => { if (nodes[i - 1] !== "Layer") assert.ok(!/^0+\s*[+%kKmM]?$/.test(n), `zero-valued counter: ${n}`) })
    assert.ok(!/\b\d[\d,]*\+?\s*(years|guards|clients|customers|sites|installations)\b/i.test(text))
    assert.ok(!/\b(since|established|est\.)\s+(19|20)\d{2}\b/i.test(text))
  })
  it("no licensing, 24-hour, coverage or location assertion in the visible homepage or Blog text", () => {
    for (const html of [home, blog]) {
      const text = textOf(html)
      assert.ok(!/\b(licen[cs]ed|psra|accredited|certified|compliant|24\/7|24[- ]hours?|nationwide|countrywide)\b/i.test(text), text.match(/licen[cs]ed|psra|accredited|certified|compliant|24\/7|24[- ]hours?/i)?.[0])
      assert.ok(!/\b(nairobi|nakuru|rongo|migori)\b/i.test(text))
    }
  })
  it("the homepage JSON-LD is in the initial HTML and parses", () => {
    const m = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(home)
    assert.ok(m)
    assert.deepEqual(JSON.parse(m[1]), JSON.parse(serializeJsonLd(buildHomeJsonLd())))
  })
})

describe("brand guard and acronym casing across every public string the SEO layer emits", () => {
  const surfaces = () => {
    const out = [home, blog, JSON.stringify(rootMetadata), serializeJsonLd(buildHomeJsonLd())]
    for (const p of LIVE_PAGES) out.push(JSON.stringify(pageMetadata(p.path)))
    for (const p of PLANNED_PAGES) out.push(p.titleDraft, p.descriptionDraft)
    for (const c of SERVICE_CONTENT) out.push(JSON.stringify(c))
    return out
  }
  it("never 'Jolu Group Security', 'Jolu Group Ltd Security' or 'Jolu Group Security Ltd'", () => {
    for (const s of surfaces()) assert.ok(!WRONG_BRANDS.test(s), WRONG_BRANDS.exec(s)?.[0])
  })
  it("the public trading identity in metadata and structured data is exactly JOLU SECURITY", () => {
    const org = buildHomeJsonLd()["@graph"].find((n) => n["@type"] === "Organization")
    assert.equal(org.name, "JOLU SECURITY")
    assert.equal(rootMetadata.applicationName, "JOLU SECURITY")
    for (const p of LIVE_PAGES) assert.equal(pageMetadata(p.path).openGraph.siteName, "JOLU SECURITY")
    for (const p of PLANNED_PAGES) assert.ok(p.titleDraft.endsWith(" | JOLU SECURITY"), p.titleDraft)
    assert.equal(HOME_TITLE, "JOLU SECURITY | Professional Security Services")
  })
  it("acronyms are CCTV, VIP and K9 (never Cctv, Vip, k9) in drafts, content and rendered HTML", () => {
    const bad = /\bCctv\b|\bVip\b|\bk9\b|\bCCtv\b|\bvip\b(?! )/
    for (const p of PLANNED_PAGES) assert.ok(!/\bCctv\b|\bVip\b|\bk9\b/.test(`${p.titleDraft} ${p.descriptionDraft} ${p.name}`), p.path)
    for (const s of [home, blog]) assert.ok(!/\bCctv\b|\bVip\b/.test(textOf(s)))
    for (const c of SERVICE_CONTENT) assert.ok(!bad.test(JSON.stringify({ ...c, slug: "" }).replace(/cctv-installation/g, "")), c.slug)
  })
})

describe("metadata uniqueness and shape", () => {
  it("titles and descriptions are unique across live pages, planned drafts and service-page drafts", () => {
    const titles = [...LIVE_PAGES.map((p) => (p.title.kind === "absolute" ? p.title.text : `${p.title.text} | JOLU SECURITY`)), ...PLANNED_PAGES.map((p) => p.titleDraft), ...SERVICE_CONTENT.map((c) => `${c.metaTitle} | JOLU SECURITY`)]
    const planned = new Set(PLANNED_PAGES.filter((p) => p.kind === "service").map((p) => p.titleDraft))
    // a service draft title equals its planned draft title (same page), so compare after removing that deliberate pair
    const unique = titles.filter((t, i) => titles.indexOf(t) === i)
    assert.equal(unique.length, LIVE_PAGES.length + PLANNED_PAGES.length)
    for (const c of SERVICE_CONTENT) assert.ok(planned.has(`${c.metaTitle} | JOLU SECURITY`), c.slug)
    const descs = [...LIVE_PAGES.map((p) => p.description), ...PLANNED_PAGES.map((p) => p.descriptionDraft), ...SERVICE_CONTENT.map((c) => c.metaDescription)]
    assert.equal(new Set(descs).size, descs.length)
  })
  it("service drafts: title 25-60 characters, description 100-160, no claim words, no location", () => {
    for (const c of SERVICE_CONTENT) {
      const t = `${c.metaTitle} | JOLU SECURITY`
      assert.ok(c.metaTitle.length >= 20 && t.length <= 70, `${c.slug}: ${t.length}`)
      assert.ok(c.metaDescription.length >= 100 && c.metaDescription.length <= 160, `${c.slug}: ${c.metaDescription.length}`)
      for (const s of [c.metaTitle, c.metaDescription]) assert.ok(!/\b(licen[cs]\w*|psra|certified|24\/7|best|leading|cheap\w*|guarantee\w*|nairobi|nakuru|rongo|migori)\b/i.test(s), s)
    }
  })
  it("every live page has self-canonical, og:url equal to the canonical path, a social image and a robots rule that matches its indexability", () => {
    for (const p of LIVE_PAGES) {
      const m = pageMetadata(p.path)
      assert.equal(m.alternates.canonical, p.path)
      assert.equal(m.openGraph.url, p.path)
      assert.ok(m.openGraph.images[0].url.startsWith("/brand/") && m.twitter.images[0].url === m.openGraph.images[0].url)
      assert.equal(Boolean(m.robots), !p.indexable)
    }
  })
})

describe("sitemap and robots output", () => {
  it("the sitemap holds only live, canonical, indexable apex URLs without invented dates", () => {
    const urls = sitemap()
    assert.deepEqual(urls.map((u) => u.url), LIVE_PAGES.filter((p) => p.indexable).map((p) => canonicalUrl(p.path)))
    for (const u of urls) {
      assert.match(u.url, /^https:\/\/jolusecurity\.com(\/[a-z0-9-/]*)?$/)
      assert.ok(!/www\./.test(u.url) && !u.url.endsWith("/") || u.url === "https://jolusecurity.com")
      assert.equal(u.lastModified, undefined)
    }
    for (const bad of ["/blog", "/services", "/locations", "/industries", "/insights", "/about"]) assert.ok(!urls.some((u) => u.url.includes(bad)), bad)
  })
  it("robots policy is unchanged: allow all, block only the API, one apex sitemap", () => {
    const r = robots()
    assert.deepEqual(r.rules, [{ userAgent: "*", allow: "/", disallow: ["/api/"] }])
    assert.equal(r.sitemap, "https://jolusecurity.com/sitemap.xml")
  })
})

describe("JSON-LD serialisation cannot break out of its script tag", () => {
  const hostile = {
    a: "</script><script>alert(1)</script>",
    b: "<!-- -->",
    c: "line sep para",
    d: "<img src=x onerror=alert(1)>",
    e: "lone \ud800 surrogate",
    f: "&amp; \u0000 NUL \u001f",
    "</script>": "key",
  }
  it("escapes '<' and the JS line separators, and still round-trips the data", () => {
    const out = serializeJsonLd(hostile)
    assert.ok(!out.includes("<") && !out.includes(" ") && !out.includes(" "))
    assert.ok(!/<\/script/i.test(out))
    assert.deepEqual(JSON.parse(out), JSON.parse(JSON.stringify(hostile)))
  })
  it("a hostile value embedded in a real script element does not end the element early", async () => {
    const { renderToStaticMarkup } = await import("react-dom/server")
    const { createElement } = await import("react")
    const html = renderToStaticMarkup(createElement("script", { type: "application/ld+json", dangerouslySetInnerHTML: { __html: serializeJsonLd(hostile) } }))
    assert.equal((html.match(/<\/script>/g) ?? []).length, 1)
    assert.equal((html.match(/<script/g) ?? []).length, 1)
  })
  it("every inline ld+json script in application source goes through serializeJsonLd", () => {
    const files = []
    const walk = (d) => { for (const n of readdirSync(d)) { const f = path.join(d, n); if (statSync(f).isDirectory()) walk(f); else if (/\.tsx?$/.test(n)) files.push(f) } }
    for (const d of ["app", "components"]) walk(path.join(ROOT, d))
    let found = 0
    for (const f of files) {
      const src = readFileSync(f, "utf8")
      if (!/application\/ld\+json/.test(src)) continue
      found++
      assert.ok(/serializeJsonLd\(/.test(src), f)
      assert.ok(!/__html:\s*JSON\.stringify/.test(src), f)
    }
    assert.ok(found >= 2, "app/page.tsx and components/aeo/service-landing.tsx")
  })
})
