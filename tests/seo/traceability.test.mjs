// Release 04B lane H: the published traceability figures are the computed ones, and drafts never count as coverage.
import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"

const ROOT = path.resolve(import.meta.dirname, "../..")
const T = await import("@/lib/seo/traceability")
const doc = readFileSync(path.join(ROOT, "docs/seo/release04b-traceability-update.md"), "utf8")

test("totals are internally consistent and drafts are not published coverage", () => {
  const t = T.traceabilityTotals()
  assert.equal(t.keywords, 311)
  assert.equal(t.contentPublished, t.contentIndexable)
  assert.equal(t.draftedNotPublished, t.contentImplemented - t.contentPublished)
  assert.ok(t.draftedNotPublished >= 250, "the seven service drafts are counted as drafted, not published")
  assert.ok(T.keywordStages().filter((s) => s.published).every((s) => s.path === "/"), "only the homepage is published today")
})

test("the document states exactly the computed figures", () => {
  const t = T.traceabilityTotals()
  const row = (label, n) => assert.ok(doc.includes(`| ${label} | ${n} |`), `${label} = ${n}`)
  row("Total", t.keywords)
  row('Deliberately unassigned ("near me" intents, KW-086, KW-087)', t.unassigned)
  row("Architecture implemented (live page, or gate + canonical route template + tests)", t.architectureImplemented)
  row("Content implemented (live copy or a tested draft)", t.contentImplemented)
  row("Content published", t.contentPublished)
  row("Content indexable", t.contentIndexable)
  row("Drafted but NOT published (the seven service drafts)", t.draftedNotPublished)
  row("No gate-backed architecture yet (industries and insights)", t.noArchitectureYet)
  assert.ok(doc.includes(`Pricing-intent keywords: ${t.pricingIntent}.`))
  assert.ok(doc.includes(`with no figures: ${t.pricingEducational} (`))
})
