// Verifies that publication-manifest entries correspond to REAL route files that render exactly the page they name
// and expose its gated metadata. Used on the production manifest (empty today) and, so the checks can never pass
// vacuously, on fixture trees written to a temporary directory by tests/seo/manifest-routes.test.mjs.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import path from "node:path"

const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1")

/** The route file a future page must use: static folder, one fixed slug. */
export const routeFileFor = (publicPath) => `app/${publicPath.slice(1)}/page.tsx`

/** Returns { checked, problems } for every manifest entry. */
export function verifyManifestRoutes(entries, root) {
  const problems = []
  let checked = 0
  for (const e of entries) {
    checked++
    const m = /^\/(services|locations)\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(e.publicPath ?? "")
    if (!m) { problems.push(`${e.publicPath}: not a service or location path`); continue }
    const kind = m[1] === "services" ? "service" : "location"
    const slug = m[2]
    if (e.routeFile !== routeFileFor(e.publicPath)) { problems.push(`${e.publicPath}: routeFile must be ${routeFileFor(e.publicPath)}`); continue }
    if (/\[|\]/.test(e.routeFile)) { problems.push(`${e.publicPath}: dynamic route folders are not allowed`); continue }
    const file = path.join(root, e.routeFile)
    if (!existsSync(file) || !statSync(file).isFile()) { problems.push(`${e.publicPath}: route file ${e.routeFile} does not exist`); continue }
    const src = stripComments(readFileSync(file, "utf8"))
    const elements = [...src.matchAll(/<PublishedPage\s+kind=["']([a-z]+)["']\s+slug=["']([a-z0-9-]+)["']\s*\/>/g)]
    if (elements.length !== 1) problems.push(`${e.publicPath}: must render exactly one <PublishedPage kind slug />, found ${elements.length}`)
    else if (elements[0][1] !== kind || elements[0][2] !== slug) problems.push(`${e.publicPath}: renders ${elements[0][1]}/${elements[0][2]} instead of ${kind}/${slug}`)
    if (!/export\s+(async\s+)?function\s+generateMetadata\s*\(/.test(src)) problems.push(`${e.publicPath}: no exported generateMetadata`)
    if (!/gatedPageMetadata\s*\(/.test(src)) problems.push(`${e.publicPath}: metadata is not built with gatedPageMetadata`)
    const lookups = [...src.matchAll(/getPublishedPage\(\s*["']([a-z]+)["']\s*,\s*["']([a-z0-9-]+)["']\s*\)/g)]
    if (lookups.length === 0) problems.push(`${e.publicPath}: metadata does not look the page up through getPublishedPage`)
    for (const l of lookups) if (l[1] !== kind || l[2] !== slug) problems.push(`${e.publicPath}: metadata looks up ${l[1]}/${l[2]}`)
    if (!/notFound\s*\(/.test(src)) problems.push(`${e.publicPath}: does not call notFound() for an unpublished page`)
    if (/dynamicParams|generateStaticParams|export\s+const\s+dynamic\b/.test(src)) problems.push(`${e.publicPath}: uses a segment option that Cache Components does not allow`)
  }
  return { checked, problems }
}

/** Route files under app/services and app/locations that have no manifest entry (a page that could be reached unpublished). */
export function findUnmanifestedRoutes(entries, root) {
  const listed = new Set(entries.map((e) => e.routeFile))
  const found = []
  const walk = (dir) => {
    if (!existsSync(dir)) return
    for (const n of readdirSync(dir)) {
      const p = path.join(dir, n)
      if (statSync(p).isDirectory()) walk(p)
      else found.push(path.relative(root, p).split(path.sep).join("/"))
    }
  }
  walk(path.join(root, "app/services"))
  walk(path.join(root, "app/locations"))
  return found.filter((f) => !listed.has(f))
}

/** The canonical route template (also documented in docs/seo/page-architecture.md). */
export const goodRoute = (kind, slug) => `import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { PublishedPage } from "@/components/pages/published-page"
import { gatedPageMetadata } from "@/lib/seo/page-metadata"
import { getPublishedPage } from "@/lib/seo/publication-gate"

export function generateMetadata(): Metadata {
  const page = getPublishedPage("${kind}", "${slug}")
  if (!page) notFound()
  return gatedPageMetadata(page) ?? notFound()
}

export default function Page() {
  return <PublishedPage kind="${kind}" slug="${slug}" />
}
`
