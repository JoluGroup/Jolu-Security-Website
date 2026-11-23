// F5D5-07: an approved publication entry must correspond to a real route that renders the right page with gated
// metadata. Fixture trees are written to a temp directory so these checks run against real files even though the
// production manifest is empty. No production route is created.
import test from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"

const ROOT = path.resolve(import.meta.dirname, "../..")
const { PUBLICATION_MANIFEST } = await import("@/lib/seo/publication-manifest")
const { getPublishedPages, publishRecord } = await import("@/lib/seo/publication-gate")
const { gatedPageMetadata } = await import("@/lib/seo/page-metadata")
const { default: sitemap } = await import("../../app/sitemap.ts")
const R = await import("../helpers/manifest-routes.mjs")
const W = await import("../helpers/gate-world.mjs")

const entry = (publicPath) => ({ publicPath, routeFile: R.routeFileFor(publicPath), title: "Test page", description: "A neutral description of the page." })
function tree(files) {
  const dir = mkdtempSync(path.join(tmpdir(), "route-fixture-"))
  for (const [f, content] of Object.entries(files)) { mkdirSync(path.dirname(path.join(dir, f)), { recursive: true }); writeFileSync(path.join(dir, f), content) }
  return dir
}
const withTree = (files, fn) => { const d = tree(files); try { return fn(d) } finally { rmSync(d, { recursive: true, force: true }) } }
const E = entry("/services/manned-guarding")
const GOOD = R.goodRoute("service", "manned-guarding")

test("production: the manifest is empty, no route exists, and the verifier would still have caught a mismatch", () => {
  assert.equal(PUBLICATION_MANIFEST.length, 0)
  const { checked, problems } = R.verifyManifestRoutes(PUBLICATION_MANIFEST, ROOT)
  assert.equal(checked, 0); assert.deepEqual(problems, [])
  assert.deepEqual(R.findUnmanifestedRoutes(PUBLICATION_MANIFEST, ROOT), [])
  // non-vacuity: the same verifier against a fixture demonstrably checks something
  const r = withTree({ [E.routeFile]: GOOD }, (d) => R.verifyManifestRoutes([E], d))
  assert.equal(r.checked, 1)
})

test("a correct route for an approved entry passes", () => {
  const r = withTree({ [E.routeFile]: GOOD }, (d) => R.verifyManifestRoutes([E], d))
  assert.deepEqual(r, { checked: 1, problems: [] })
  const loc = entry("/locations/nairobi")
  assert.deepEqual(withTree({ [loc.routeFile]: R.goodRoute("location", "nairobi") }, (d) => R.verifyManifestRoutes([loc], d)).problems, [])
})

const BAD = {
  "route file missing": [{}, /does not exist/],
  "route renders another slug": [{ [E.routeFile]: GOOD.replace('slug="manned-guarding"', 'slug="cctv-installation"') }, /renders service\/cctv-installation/],
  "route renders another kind": [{ [E.routeFile]: GOOD.replace('kind="service"', 'kind="location"') }, /renders location\/manned-guarding/],
  "route renders two pages": [{ [E.routeFile]: GOOD.replace("<PublishedPage kind=\"service\" slug=\"manned-guarding\" />", "<><PublishedPage kind=\"service\" slug=\"manned-guarding\" /><PublishedPage kind=\"service\" slug=\"alarm-response\" /></>") }, /exactly one/],
  "route renders nothing from the gate": [{ [E.routeFile]: "export default function Page() { return <p>hello</p> }\n" }, /exactly one/],
  "only a commented-out element": [{ [E.routeFile]: GOOD.replace("return <PublishedPage kind=\"service\" slug=\"manned-guarding\" />", "// <PublishedPage kind=\"service\" slug=\"manned-guarding\" />\n  return null") }, /exactly one/],
  "no generateMetadata": [{ [E.routeFile]: GOOD.replace(/export function generateMetadata[\s\S]*?\n}\n\n/, "") }, /no exported generateMetadata/],
  "metadata not gated": [{ [E.routeFile]: GOOD.replace("gatedPageMetadata(page) ?? notFound()", "({ title: \"x\" })") }, /gatedPageMetadata/],
  "metadata looks up another page": [{ [E.routeFile]: GOOD.replace('getPublishedPage("service", "manned-guarding")', 'getPublishedPage("service", "alarm-response")') }, /metadata looks up service\/alarm-response/],
  "no lookup in metadata": [{ [E.routeFile]: GOOD.replace('const page = getPublishedPage("service", "manned-guarding")\n  if (!page) notFound()\n  return gatedPageMetadata(page) ?? notFound()', "return gatedPageMetadata(null as never) ?? notFound()") }, /getPublishedPage/],
  "no notFound": [{ [E.routeFile]: GOOD.replaceAll("notFound()", "null") }, /notFound/],
  "dynamicParams exported": [{ [E.routeFile]: GOOD + "\nexport const dynamicParams = false\n" }, /segment option/],
  "generateStaticParams exported": [{ [E.routeFile]: GOOD + "\nexport function generateStaticParams() { return [] }\n" }, /segment option/],
}
for (const [name, [files, re]] of Object.entries(BAD)) {
  test(`verifier rejects: ${name}`, () => {
    const r = withTree(files, (d) => R.verifyManifestRoutes([E], d))
    assert.equal(r.checked, 1)
    assert.ok(r.problems.some((p) => re.test(p)), JSON.stringify(r.problems))
  })
}

test("verifier rejects a dynamic route folder, a wrong route file name and a non-page path", () => {
  const dyn = { ...E, routeFile: "app/services/[slug]/page.tsx" }
  assert.ok(R.verifyManifestRoutes([dyn], ROOT).problems.some((p) => /routeFile must be/.test(p)))
  assert.ok(R.verifyManifestRoutes([{ ...E, routeFile: "app/services/other/page.tsx" }], ROOT).problems.some((p) => /routeFile must be/.test(p)))
  assert.ok(R.verifyManifestRoutes([entry("/blog/x")], ROOT).problems.some((p) => /not a service or location path/.test(p)))
})

test("a route file with no manifest entry is detected (a reachable page that was never approved)", () => {
  const found = withTree({ [E.routeFile]: GOOD, "app/locations/nairobi/page.tsx": R.goodRoute("location", "nairobi") }, (d) => R.findUnmanifestedRoutes([E], d))
  assert.deepEqual(found, ["app/locations/nairobi/page.tsx"])
})

test("end to end with the real gate: a published synthetic page reaches the sitemap list and metadata only through its manifest entry", () => {
  const w = W.world()
  const page = publishRecord(w.record, w.deps)
  assert.ok(page)
  const md = gatedPageMetadata(page)
  assert.equal(md.alternates.canonical, w.deps.manifest[0].publicPath)
  assert.equal(md.title, w.deps.manifest[0].title)
  // the same record without its manifest entry is not publishable, so it could never be listed
  assert.equal(publishRecord(w.record, { ...w.deps, manifest: [] }), null)
  // and the production sitemap (empty manifest) lists only the homepage, whatever records exist
  assert.deepEqual(sitemap().map((e) => e.url), ["https://www.jolusecurity.com"])
  assert.deepEqual(getPublishedPages(), [])
  // route verification of that manifest entry fails unless a real route exists
  assert.equal(withTree({}, (d) => R.verifyManifestRoutes(w.deps.manifest, d)).problems.length > 0, true)
  assert.deepEqual(withTree({ [w.deps.manifest[0].routeFile]: R.goodRoute("service", "manned-guarding") }, (d) => R.verifyManifestRoutes(w.deps.manifest, d)).problems, [])
})
