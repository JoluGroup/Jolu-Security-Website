// Release 04 (Lane SEO): the seven answer-first service pages are BUILT and TESTED but must stay UNPUBLISHED.
import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, it } from "node:test"
import { renderComponent } from "../content/render-helper.mjs"
import { contentFor, recordFor, scrubDeep, worldFor } from "../helpers/aeo-fixture.mjs"

const ROOT = path.resolve(import.meta.dirname, "../..")
const { SERVICE_CONTENT, getServiceContent } = await import("@/lib/seo/service-content")
const { contentToSections, sectionsMatchContent, serviceDisplayName } = await import("@/lib/seo/service-sections")
const { AEO_HEADINGS } = await import("@/lib/seo/aeo-text")
const { evaluatePublication, isPublished, publishedPagePaths, publishRecord } = await import("@/lib/seo/publication-gate")
const { SERVICE_PAGE_RECORDS, LOCATION_PAGE_RECORDS } = await import("@/lib/seo/page-records")
const { PUBLICATION_MANIFEST } = await import("@/lib/seo/publication-manifest")
const { EVIDENCE_LEDGER } = await import("@/lib/seo/evidence-ledger")
const { textProblem } = await import("@/lib/seo/text-policy")
const { PLANNED_PAGES } = await import("@/lib/seo/planned-pages")
const { SERVICES } = await import("@/lib/services")
const { default: sitemap } = await import("@/app/sitemap")

const words = (s) => s.trim().split(/\s+/).length
const strings = (v, out = []) => {
  if (typeof v === "string") out.push(v)
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out))
  else if (v && typeof v === "object") Object.values(v).forEach((x) => strings(x, out))
  return out
}
const allText = (c) => strings({ ...c, slug: "", briefId: "", status: "" }).join("\n")
const SLUGS = ["manned-guarding", "cctv-installation", "electric-fencing", "events-security", "k9-unit-services", "alarm-response", "vip-close-protection"]

describe("draft content covers the seven core services and matches the registry", () => {
  it("exactly the seven service slugs, one content object each, briefs C01-C07 once", () => {
    assert.deepEqual(SERVICE_CONTENT.map((c) => c.slug).sort(), [...SLUGS].sort())
    assert.deepEqual(SERVICE_CONTENT.map((c) => c.briefId).sort(), ["C01", "C02", "C03", "C04", "C05", "C06", "C07"])
    for (const c of SERVICE_CONTENT) assert.equal(c.status, "draft-not-approved", c.slug)
  })
  it("each page is for an existing service record and planned page, and the H1 equals the approved service name", () => {
    for (const c of SERVICE_CONTENT) {
      const rec = recordFor(c.slug)
      assert.ok(rec, c.slug)
      assert.ok(PLANNED_PAGES.some((p) => p.path === rec.plannedPath), c.slug)
      assert.equal(c.h1, SERVICES.find((s) => s.id === rec.serviceId).name, c.slug)
      assert.equal(serviceDisplayName(c), c.h1)
    }
  })
  it("answer-first summary is 45-60 words, plain sentences", () => {
    for (const c of SERVICE_CONTENT) {
      const n = words(c.answer)
      assert.ok(n >= 45 && n <= 60, `${c.slug}: ${n} words`)
      assert.ok(/^[A-Z]/.test(c.answer) && /[.]$/.test(c.answer), c.slug)
    }
  })
  it("FAQ: 4-6 non-repetitive questions per page, unique across all pages, each answer a real sentence", () => {
    const seen = new Set()
    for (const c of SERVICE_CONTENT) {
      assert.ok(c.faqs.length >= 4 && c.faqs.length <= 6, `${c.slug}: ${c.faqs.length}`)
      for (const f of c.faqs) {
        assert.match(f.question, /\?$/, f.question)
        assert.ok(words(f.answer) >= 20, `${c.slug}: short answer`)
        const key = f.question.toLowerCase()
        assert.ok(!seen.has(key), `duplicate question: ${f.question}`)
        seen.add(key)
        assert.ok(!seen.has(f.answer.toLowerCase()), "duplicate answer")
        seen.add(f.answer.toLowerCase())
      }
    }
  })
  it("budget matrix: hypothetical scenarios, qualitative cells, no prices, no numbers, no currency", () => {
    for (const c of SERVICE_CONTENT) {
      const m = c.budget
      assert.match(m.scenarioA.label, /hypothetical/i, c.slug)
      assert.match(m.scenarioB.label, /hypothetical/i, c.slug)
      assert.match(m.intro, /not past \w+, client examples or quotations/, c.slug)
      assert.ok(m.rows.length >= 4, c.slug)
      const text = allText(m)
      assert.ok(!/\d/.test(text.replace(/K9/g, "")), `${c.slug}: digits in matrix`)
      assert.ok(!/\b(kes|ksh|ksh\.|usd|shillings?|dollars?)\b|[$]/i.test(text), `${c.slug}: currency`)
      assert.match(m.note, /No indicative figures/, c.slug)
    }
  })
  it("no price, rate card or number anywhere in the content", () => {
    for (const c of SERVICE_CONTENT) {
      const text = allText(c)
      assert.ok(!/\b(kes|ksh|usd|shillings?|dollars?)\b|[$]/i.test(text), c.slug)
      assert.ok(!/\bper (hour|day|month|guard|camera|metre|meter)\b/i.test(text), `${c.slug}: rate wording`)
      assert.ok(!/\d{2,}/.test(text.replace(/K9/g, "").replace(/Act, \d{4}/g, "Act")), `${c.slug}: figures`)
    }
  })
  it("rendered strings pass the gate's text policy (plain Latin, ASCII digits, ordinary spaces)", () => {
    for (const c of SERVICE_CONTENT) for (const s of strings(c)) assert.equal(textProblem(s), null, `${c.slug}: ${s.slice(0, 60)}`)
  })
  it("no paragraph or sentence is copied between pages (no doorway or duplicate content)", () => {
    const seen = new Map()
    for (const c of SERVICE_CONTENT) for (const s of contentToSections(c)) for (const b of s.body) {
      assert.ok(!seen.has(b) || seen.get(b) === c.slug, `paragraph repeated across pages: ${b.slice(0, 70)}`)
      seen.set(b, c.slug)
    }
  })
})

describe("content states no unverified fact about JOLU SECURITY", () => {
  const FORBIDDEN = [
    [/\b(24\/7|24 ?x ?7|24[- ]hours?|round[- ]the[- ]clock)\b/i, "24-hour operations"],
    [/\b(licensed|licenced|certified|accredited|iso ?\d+|insured|bonded|award[- ]winning)\b/i, "licence, certification or accreditation"],
    [/\b(guarantee[sd]?|warranty)\b/i, "guarantee"],
    [/\b(we|our) (have|has|are|were) (been )?(operating|in business|established)/i, "years of operation"],
    [/\b(trusted by|clients include|our clients|our guards|our team of|our officers|our handlers)\b/i, "clients or staff"],
    [/\b(nairobi|nakuru|rongo|migori|kisumu|mombasa|nationwide|countrywide)\b/i, "coverage or location"],
    [/\b(head ?office|branch|showroom|our offices?)\b/i, "offices"],
    [/\b(best|leading|top-rated|number one|#1|premier|market leader)\b/i, "superlative"],
    [/\bpsra (licen[cs]e|licensed|registered|number)\b/i, "PSRA licence claim"],
    [/\b(within|in) \d+ (minutes?|hours?)\b/i, "response time"],
    [/\bsupervised by\b|\bour supervisors\b/i, "supervision claim"],
  ]
  it("no forbidden claim wording appears in any rendered string", () => {
    for (const c of SERVICE_CONTENT) {
      const text = allText(c)
      for (const [re, what] of FORBIDDEN) assert.ok(!re.test(text), `${c.slug}: ${what}: ${re.exec(text)?.[0]}`)
    }
  })
  it("brand and acronym casing", () => {
    for (const c of SERVICE_CONTENT) {
      const text = allText(c)
      assert.ok(!/jolu group|jolu security ltd/i.test(text), c.slug)
      assert.ok(!/\bJolu\b/.test(text), `${c.slug}: use JOLU SECURITY`)
      assert.ok(!/\bCctv\b|\bcctv\b|\bVip\b|\bvip\b|\bk9\b|\bK-9\b/.test(text), `${c.slug}: acronym casing`)
    }
    assert.match(allText(contentFor("cctv-installation")), /\bCCTV\b/)
    assert.match(allText(contentFor("k9-unit-services")), /\bK9\b/)
    assert.match(allText(contentFor("vip-close-protection")), /\bVIP\b/)
  })
  it("CCTV text covers data protection and claims no certification", () => {
    const text = allText(contentFor("cctv-installation"))
    assert.match(text, /Data Protection Act, 2019/)
    assert.match(text, /personal data/)
    assert.ok(!/certif/i.test(text))
  })
  it("K9 and VIP text publish no tactics, routes, schedules, protected persons or handler or officer qualifications", () => {
    for (const slug of ["k9-unit-services", "vip-close-protection"]) {
      const text = allText(contentFor(slug))
      assert.ok(!/\b(firearms?|weapons?|armed|sniper|motorcade|convoy|ambush|patrol (route|schedule|pattern)|safe ?house)\b/i.test(text), slug)
      assert.ok(!/\b(our|the) (handlers?|officers?|operatives?) (are|hold|have|is)\b/i.test(text), `${slug}: invented qualification`)
      assert.ok(!/\b(minister|president|ceo|celebrity|diplomat|governor)\b/i.test(text), `${slug}: protected person`)
    }
    assert.match(allText(contentFor("k9-unit-services")), /deliberately not published/)
    assert.match(allText(contentFor("vip-close-protection")), /No tactical, route, schedule or client detail/)
  })
  it("the assessment process is presented as proposed, not as verified operations", () => {
    for (const c of SERVICE_CONTENT) {
      const sec = contentToSections(c).find((s) => s.id === "assessment")
      assert.match(sec.body[0], /process JOLU SECURITY proposes for /)
      assert.match(sec.body[0], /nothing here is a statement about work done for other clients/)
    }
  })
  it("every unresolved claim is phrased as a question or consideration the buyer asks of ANY provider", () => {
    for (const c of SERVICE_CONTENT) for (const r of c.scope.buyerRequirements) assert.match(r, /^Ask /, `${c.slug}: ${r}`)
  })
})

describe("the seven pages stay UNPUBLISHED (the publication gate is the only way in)", () => {
  it("the manifest and evidence ledger are empty and nothing is published", () => {
    assert.equal(PUBLICATION_MANIFEST.length, 0)
    assert.equal(EVIDENCE_LEDGER.length, 0)
    assert.deepEqual([...publishedPagePaths()], [])
  })
  it("every service record is unpublished, has no sections or approval, and the gate refuses it", () => {
    for (const r of SERVICE_PAGE_RECORDS) {
      assert.equal(r.status, "unpublished", r.slug)
      assert.equal(r.sections.length, 0, r.slug)
      assert.equal(r.approval, null, r.slug)
      assert.equal(isPublished(r), false, r.slug)
      assert.equal(publishRecord(r), null, r.slug)
    }
    for (const r of LOCATION_PAGE_RECORDS) assert.equal(isPublished(r), false, r.slug)
  })
  it("no route file exists for any service page, so each URL is a native 404, and the sitemap omits them", () => {
    for (const slug of SLUGS) assert.equal(existsSync(path.join(ROOT, "app/services", slug, "page.tsx")), false, slug)
    assert.equal(existsSync(path.join(ROOT, "app/services")), false)
    const urls = sitemap().map((e) => e.url)
    assert.deepEqual(urls, ["https://jolusecurity.com"])
  })
  it("no application route imports the draft content directly (only the gated PublishedPage path may)", () => {
    const pub = readFileSync(path.join(ROOT, "components/pages/published-page.tsx"), "utf8")
    assert.match(pub, /sectionsMatchContent\(page\.sections, content\)/)
    for (const f of ["app/page.tsx", "app/layout.tsx", "app/sitemap.ts", "app/robots.ts", "app/blog/page.tsx"]) {
      assert.ok(!/service-content|service-landing|ServiceLandingBody/.test(readFileSync(path.join(ROOT, f), "utf8")), f)
    }
  })
})

describe("gate readiness: the ONLY thing blocking each page is claim-sensitive wording that needs an approved claim", () => {
  for (const slug of SLUGS) {
    it(`${slug}: with evidence and approvals in a synthetic world, every refusal reason is a claim-wording reason`, () => {
      const w = worldFor(slug, contentFor(slug))
      const d = evaluatePublication(w.record, w.deps)
      assert.equal(d.published, false)
      assert.ok(d.reasons.length > 0)
      for (const r of d.reasons) assert.match(r, /claim-sensitive wording/, r)
    })
  }
  it("the pricing wording has no claim in the registry's scope table that can unlock it (owner decision recorded in the inventory)", async () => {
    const { CLAIM_SCOPE } = await import("@/lib/seo/claim-scope")
    assert.ok(!Object.values(CLAIM_SCOPE).some((s) => s.categories.includes("pricing")))
  })
  it("with the pricing and regulator wording scrubbed (a stand-in for reviewer approval), content and sections pass the real gate", () => {
    for (const slug of SLUGS.filter((s) => s !== "manned-guarding")) {
      const c = scrubDeep(contentFor(slug))
      const w = worldFor(slug, c)
      const d = evaluatePublication(w.record, w.deps)
      assert.deepEqual(d.reasons, [], `${slug}: ${d.reasons.join("; ")}`)
      assert.equal(d.published, true, slug)
    }
  })
})

describe("sections binding", () => {
  it("sectionsMatchContent is true only for the exact sections and false after any edit", () => {
    const c = contentFor("alarm-response")
    const secs = JSON.parse(JSON.stringify(contentToSections(c)))
    assert.equal(sectionsMatchContent(secs, c), true)
    secs[0].body[0] += " "
    assert.equal(sectionsMatchContent(secs, c), false)
    assert.equal(sectionsMatchContent([], c), false)
    assert.equal(sectionsMatchContent(null, c), false)
    assert.equal(getServiceContent("nope"), undefined)
  })
  it("sections carry every rendered sentence: ids unique, headings claim-free of pricing and licensing words, evidence cited, no claims bound", () => {
    for (const c of SERVICE_CONTENT) {
      const secs = contentToSections(c)
      assert.equal(new Set(secs.map((s) => s.id)).size, secs.length)
      for (const s of secs) {
        assert.ok(s.evidenceIds.length > 0 && s.evidenceIds.every((e) => /^SVC-[A-Z0-9]+-01$/.test(e)), s.id)
        assert.deepEqual(s.claims, [])
        assert.ok(!/\b(cost|costs|price|prices|pricing|rates?|quotes?|quotations?|fees?|licen[cs]\w*|psra|compliance|certified)\b/i.test(s.heading), `heading: ${s.heading}`)
      }
    }
  })
})

describe("crawlability: the initial HTML carries the H1, answer, table, scope and FAQ with no JavaScript", () => {
  for (const slug of SLUGS) {
    it(`${slug}`, async () => {
      const c = contentFor(slug)
      const html = await renderComponent("components/aeo/service-landing.tsx", "ServiceLandingBody", { content: c, requestHref: `/?service=${slug}#contact` })
      const text = html.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ")
      assert.equal((html.match(/<h1[ >]/g) ?? []).length, 1)
      assert.match(html, new RegExp(`<h1[^>]*>${c.h1}</h1>`))
      // the direct answer follows the H1 and comes before any other section
      const dec = html.replace(/&#x27;/g, "'")
      assert.ok(dec.indexOf(c.answer) > dec.indexOf("</h1>") && dec.indexOf(c.answer) < dec.indexOf("<h2"))
      // accessible table
      assert.equal((html.match(/<table[ >]/g) ?? []).length, 1)
      assert.match(html, /<caption[^>]*>/)
      assert.equal((html.match(/<th scope="col"/g) ?? []).length, 4)
      assert.equal((html.match(/<th scope="row"/g) ?? []).length, c.budget.rows.length)
      // FAQ as native details/summary, all answers present and collapsed
      assert.equal((html.match(/<details[ >]/g) ?? []).length, c.faqs.length)
      assert.equal((html.match(/<summary[ >]/g) ?? []).length, c.faqs.length)
      assert.ok(!/<details[^>]*\sopen/.test(html))
      for (const f of c.faqs) {
        assert.ok(text.includes(f.question) && text.includes(f.answer), f.question)
      }
      for (const h of Object.values(AEO_HEADINGS)) if (h !== AEO_HEADINGS.answer) assert.ok(text.includes(h), h)
      // purely server-rendered: no script, no client boundary markers, no JS-only placeholders
      assert.ok(!/<script/.test(html))
      assert.ok(!/\bundefined\b|\[object Object\]|NaN/.test(text))
      // every body string appears in the HTML (nothing is hidden behind JS). The matrix paragraphs are synthesised from cells, so cells are checked directly.
      for (const sec of contentToSections(c).filter((x) => x.id !== "budget-factors")) {
        for (const piece of sec.body.flatMap((b) => b.split(/(?<=[.?!])\s+/))) {
          if (piece.length > 15) assert.ok(text.includes(piece.replace(/[.]$/, "")), `${slug}: missing in HTML: ${piece.slice(0, 80)}`)
        }
      }
      for (const v of strings(c.budget)) assert.ok(text.includes(v.replace(/[.]$/, "")), `${slug}: matrix text missing: ${v.slice(0, 60)}`)
    })
  }
  it("renders in a published context: gated ServiceLanding emits JSON-LD matching the visible FAQ (synthetic approved world)", async () => {
    const { ServiceLanding } = await import("../helpers/service-landing-loader.mjs")
    const slug = "cctv-installation"
    const c = scrubDeep(contentFor(slug))
    const w = worldFor(slug, c)
    const page = publishRecord(w.record, w.deps)
    assert.ok(page, "synthetic world must publish")
    const html = await ServiceLanding({ page, content: c })
    const ld = JSON.parse(/<script type="application\/ld\+json">(.*?)<\/script>/s.exec(html)[1])
    const faq = ld["@graph"].find((n) => n["@type"] === "FAQPage")
    const text = html.replace(/<script.*?<\/script>/gs, "").replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/\s+/g, " ")
    assert.equal(faq.mainEntity.length, c.faqs.length)
    for (const q of faq.mainEntity) {
      assert.ok(text.includes(q.name), q.name)
      assert.ok(text.includes(q.acceptedAnswer.text), q.name)
    }
  })
  it("ServiceLanding refuses an unpublished page, a forged snapshot and content that differs from the reviewed sections", async () => {
    const { ServiceLanding } = await import("../helpers/service-landing-loader.mjs")
    const c = contentFor("alarm-response")
    await assert.rejects(() => ServiceLanding({ page: recordFor("alarm-response"), content: c }), /did not pass the publication gate/)
    await assert.rejects(() => ServiceLanding({ page: { ...recordFor("alarm-response") }, content: c }), /did not pass the publication gate/)
    const sc = scrubDeep(contentFor("cctv-installation"))
    const w = worldFor("cctv-installation", sc)
    const page = publishRecord(w.record, w.deps)
    await assert.rejects(() => ServiceLanding({ page, content: { ...sc, answer: sc.answer + " Extra." } }), /differs from the reviewed sections/)
  })
})
