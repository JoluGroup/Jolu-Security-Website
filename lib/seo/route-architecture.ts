// Route architecture reconciliation (Release 04). ONE INTENT = ONE CANONICAL URL.
//
// This module adds NO new source of truth. It reads the live routes (pages.ts), the planned pages and keyword registry
// (planned-pages.ts, workbook-keywords.ts), the page records and the publication manifest, and adds exactly two things:
//   1. KEYWORD_OVERRIDES: the workbook rows whose suggested URL contradicts their own intent (listed with reasons);
//   2. BRIEF_ROUTES: where each AEO workbook brief (C01-C15) lands, so a brief never creates a second URL for an intent.
// Canonical public paths have NO trailing slash: next.config.ts does not set trailingSlash, so a path with a trailing
// slash answers with a 308 redirect (verified on the built candidate). The workbook's trailing slashes are normalised.
import { EDITORIAL_KEYWORDS, WORKBOOK_KEYWORDS } from "@/lib/seo/keyword-map"
import { LIVE_PAGES } from "@/lib/seo/pages"
import { PLANNED_PAGES } from "@/lib/seo/planned-pages"
import { PUBLICATION_MANIFEST } from "@/lib/seo/publication-manifest"
import { publishedPagePaths } from "@/lib/seo/publication-gate"
import { SERVICE_CONTENT } from "@/lib/seo/service-content"
import type { WorkbookKeyword } from "@/lib/seo/types"

export const stripSlash = (p: string) => (p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p)

export type RouteStatus =
  | "live"
  | "live-noindex"
  /** Page and content are built and tested but refused by the publication gate: no route, not in the sitemap. */
  | "built-unpublished"
  | "planned-gated"
  /** The publication gate has no record type for it yet (industries, about). */
  | "planned-no-gate-support"
  | "editorial-planned"

export type RouteEntry = {
  path: string
  kind: "home" | "service" | "location" | "industry" | "insight" | "blog" | "about"
  status: RouteStatus
  primaryKeyword: string | null
  keywordCount: number
  briefs: readonly string[]
}

/** Workbook rows whose suggested target contradicts their own intent. Reasons are shown in docs/seo/release04-evidence-gated-inventory.md. */
export const KEYWORD_OVERRIDES: Readonly<Record<string, { to: string | null; reason: string }>> = Object.freeze({
  "KW-093": { to: "/locations/nakuru", reason: "'security company in nakuru town' is a Nakuru intent; the workbook suggests the Nairobi page." },
  "KW-094": { to: "/locations/rongo", reason: "'private security company in migori' is a Migori intent; Migori is consolidated on the single Rongo page (owner decision 5A.1), not the Nairobi page." },
  "KW-086": { to: null, reason: "'security company near me' has no single location. Mapping it to Nairobi would assert proximity for every searcher; it stays unassigned until verified offices exist." },
  "KW-087": { to: null, reason: "'security guard company near me' has no single location. Unassigned for the same reason as KW-086." },
})

/** Reconciled canonical path (no trailing slash) for a workbook keyword, or null when the keyword is deliberately unassigned. */
export function reconciledPath(k: WorkbookKeyword): string | null {
  const o = KEYWORD_OVERRIDES[k.id]
  if (o) return o.to
  return stripSlash(k.plannedPath)
}

/** AEO workbook briefs: the single canonical route each lands on. `proposed` is the brief's own suggestion, kept only for traceability. */
export const BRIEF_ROUTES = Object.freeze([
  { id: "C01", canonical: "/services/manned-guarding", proposed: "/services/manned-guarding" },
  { id: "C02", canonical: "/services/cctv-installation", proposed: "Confirm existing CCTV URL" },
  { id: "C03", canonical: "/services/electric-fencing", proposed: "Confirm existing fencing URL" },
  { id: "C04", canonical: "/services/alarm-response", proposed: "Confirm existing alarm URL" },
  { id: "C05", canonical: "/services/events-security", proposed: "Confirm existing events URL" },
  { id: "C06", canonical: "/services/k9-unit-services", proposed: "Confirm existing K9 URL" },
  { id: "C07", canonical: "/services/vip-close-protection", proposed: "/services/vip-close-protection" },
  { id: "C08", canonical: "/locations/nairobi", proposed: "/security-services-nairobi" },
  { id: "C09", canonical: "/locations/nakuru", proposed: "/security-services-nakuru" },
  { id: "C10", canonical: "/locations/rongo", proposed: "/security-services-rongo" },
  { id: "C11", canonical: "/insights/how-to-verify-a-security-company-psra-licence", proposed: "/insights/verify-security-company" },
  // No keyword in the registry covers a tender checklist: a NEW intent with no planned URL. Not routed until approved.
  { id: "C12", canonical: null, proposed: "/insights/security-procurement" },
  { id: "C13", canonical: "/industries/hospitality", proposed: "/industries/hospitality" },
  { id: "C14", canonical: "/industries/construction", proposed: "/industries/construction" },
  // The gate has no "about" record type: an About page needs an approved entity facts sheet first.
  { id: "C15", canonical: "/about", proposed: "/about" },
] as const)

const kindOf = (p: string): RouteEntry["kind"] =>
  p === "/" ? "home" : p === "/blog" ? "blog" : p.startsWith("/services/") ? "service" : p.startsWith("/locations/") ? "location" : p.startsWith("/industries/") ? "industry" : p === "/about" ? "about" : "insight"

/** Every route the project knows about, with one entry per canonical path. */
export function buildRouteTable(): readonly RouteEntry[] {
  const published = new Set(publishedPagePaths())
  const manifest = new Set(PUBLICATION_MANIFEST.map((e) => e.publicPath))
  const builtServices = new Set(SERVICE_CONTENT.map((c) => `/services/${c.slug}`))
  const rows = new Map<string, RouteEntry>()
  const counts = new Map<string, number>()
  for (const k of WORKBOOK_KEYWORDS) {
    const p = reconciledPath(k)
    if (p) counts.set(p, (counts.get(p) ?? 0) + 1)
  }
  const briefsFor = (p: string) => BRIEF_ROUTES.filter((b) => b.canonical === p).map((b) => b.id)
  for (const l of LIVE_PAGES) {
    rows.set(l.path, { path: l.path, kind: kindOf(l.path), status: l.indexable ? "live" : "live-noindex", primaryKeyword: null, keywordCount: counts.get(l.path) ?? 0, briefs: briefsFor(l.path) })
  }
  for (const p of PLANNED_PAGES) {
    const path = stripSlash(p.path)
    const kind = kindOf(path)
    const status: RouteStatus = published.has(path) && manifest.has(path) ? "live" : builtServices.has(path) ? "built-unpublished" : kind === "industry" ? "planned-no-gate-support" : "planned-gated"
    rows.set(path, { path, kind, status, primaryKeyword: p.primaryKeyword, keywordCount: counts.get(path) ?? 0, briefs: briefsFor(path) })
  }
  for (const k of EDITORIAL_KEYWORDS) {
    const path = stripSlash(k.plannedPath)
    rows.set(path, { path, kind: "insight", status: "editorial-planned", primaryKeyword: k.keyword, keywordCount: counts.get(path) ?? 0, briefs: briefsFor(path) })
  }
  rows.set("/about", { path: "/about", kind: "about", status: "planned-no-gate-support", primaryKeyword: null, keywordCount: 0, briefs: briefsFor("/about") })
  return [...rows.values()]
}

/**
 * Release 04B: the three layers of a service or location destination, kept separate on purpose.
 *  A. routeSupported    a static route file exists for the planned slug. It is ALWAYS the canonical gated template
 *                       (tests/helpers/manifest-routes.mjs goodRoute, enforced byte for byte by tests), which looks the
 *                       page up through the publication gate and calls notFound() when the gate refuses it.
 *  B. manifested        the page has an entry in the approved publication manifest (lib/seo/publication-manifest.ts).
 *  C. publiclyAvailable the publication gate publishes the page: approved record, verified evidence, reviews, manifest.
 * Only C makes content reachable. A without C answers 404, with no metadata, JSON-LD, sitemap or navigation entry.
 */
export type RouteLayers = { path: string; routeSupported: boolean; manifested: boolean; publiclyAvailable: boolean }
export const SUPPORTED_SERVICE_ROUTES = Object.freeze(SERVICE_CONTENT.map((c) => `/services/${c.slug}`))
export function routeLayers(path: string): RouteLayers {
  return {
    path,
    routeSupported: SUPPORTED_SERVICE_ROUTES.includes(path),
    manifested: PUBLICATION_MANIFEST.some((e) => e.publicPath === path),
    publiclyAvailable: publishedPagePaths().includes(path),
  }
}
