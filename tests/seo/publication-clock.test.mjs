// The gate has no clock (Cache Components forbids reading the time while prerendering). These tests keep the
// committed PUBLICATION_AS_OF date honest once a page is published.
import test from "node:test"
import assert from "node:assert/strict"

const { PUBLICATION_AS_OF, MAX_AS_OF_AGE_DAYS, defaultDeps } = await import("@/lib/seo/publication-deps")
const { calendarDay } = await import("@/lib/seo/publication-gate")
const gate = await import("@/lib/seo/publication-gate")
const today = Math.floor(Date.now() / 86_400_000)

test("PUBLICATION_AS_OF is a real date and never in the future", () => {
  const d = calendarDay(PUBLICATION_AS_OF)
  assert.notEqual(d, null)
  assert.ok(d <= today + 1, "as-of date is in the future")
  assert.equal(defaultDeps().asOf, PUBLICATION_AS_OF)
})

test("while any page is published: the as-of date is fresh and no evidence it relies on has expired", () => {
  const published = gate.getPublishedPages()
  if (published.length === 0) return // nothing published: no maintenance burden
  assert.ok(today - calendarDay(PUBLICATION_AS_OF) <= MAX_AS_OF_AGE_DAYS, "PUBLICATION_AS_OF is stale: renew it in a reviewed change")
  const deps = defaultDeps()
  for (const e of deps.ledger) if (e.expiresOn) assert.ok(calendarDay(e.expiresOn) > today, `evidence ${e.id} has expired`)
})

test("calendarDay accepts only real dates", () => {
  for (const ok of ["2026-02-28", "2028-02-29", "2026-12-31"]) assert.notEqual(calendarDay(ok), null, ok)
  for (const bad of ["2026-02-30", "2027-02-29", "2026-04-31", "2026-13-01", "2026-00-10", "2026-01-00", "1999-12-31", "2101-01-01", "2026-1-9", "26-01-01", "", null, undefined, 20261119, "2026-11-19T00:00:00Z"]) assert.equal(calendarDay(bad), null, String(bad))
})
