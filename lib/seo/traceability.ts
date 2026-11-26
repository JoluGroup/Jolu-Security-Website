// Release 04B lane H: keyword-level traceability recomputed from the repository (no workbook needed). It separates the
// stages the owner asked to keep apart: architecture implemented, content implemented, content published, content
// indexable, and external optimisation pending. Scaffolded or drafted pages never count as public SEO coverage.
import { buildRouteTable, reconciledPath } from "@/lib/seo/route-architecture"
import { WORKBOOK_KEYWORDS } from "@/lib/seo/keyword-map"
import { LIVE_PAGES } from "@/lib/seo/pages"
import { publishedPagePaths } from "@/lib/seo/publication-gate"
import { SERVICE_CONTENT } from "@/lib/seo/service-content"

export type KeywordStage = {
  id: string
  path: string | null
  architecture: boolean
  content: boolean
  published: boolean
  indexable: boolean
  /** Pricing-intent keyword now addressable by educational cost-driver content (no figures), Release 04B claims policy. */
  educationalPricing: boolean
}

export function keywordStages(): readonly KeywordStage[] {
  const table = new Map(buildRouteTable().map((r) => [r.path, r]))
  const published = new Set(publishedPagePaths())
  const drafted = new Set(SERVICE_CONTENT.map((c) => `/services/${c.slug}`))
  const indexableLive = new Set<string>(LIVE_PAGES.filter((p) => p.indexable).map((p) => p.path))
  return WORKBOOK_KEYWORDS.map((k) => {
    const path = reconciledPath(k)
    const row = path ? table.get(path) : undefined
    const live = row?.status === "live"
    // Gate-backed architecture exists for live pages, the seven services and the three locations (template + gate + tests).
    const architecture = !!row && (live || row.status === "built-unpublished" || row.status === "planned-gated")
    const content = !!path && (live || drafted.has(path))
    const isPublished = !!path && (live || published.has(path))
    return {
      id: k.id,
      path,
      architecture,
      content,
      published: isPublished,
      indexable: isPublished && !!path && (indexableLive.has(path) || published.has(path)),
      educationalPricing: k.claimSensitive.includes("pricing") && !!path && (drafted.has(path) || path.startsWith("/insights/")),
    }
  })
}

export function traceabilityTotals() {
  const s = keywordStages()
  const n = (f: (x: KeywordStage) => boolean) => s.filter(f).length
  return {
    keywords: s.length,
    unassigned: n((x) => x.path === null),
    architectureImplemented: n((x) => x.architecture),
    contentImplemented: n((x) => x.content),
    contentPublished: n((x) => x.published),
    contentIndexable: n((x) => x.indexable),
    draftedNotPublished: n((x) => x.content && !x.published),
    noArchitectureYet: n((x) => x.path !== null && !x.architecture),
    pricingIntent: n((x) => WORKBOOK_KEYWORDS.find((k) => k.id === x.id)!.claimSensitive.includes("pricing")),
    pricingEducational: n((x) => x.educationalPricing),
  }
}
