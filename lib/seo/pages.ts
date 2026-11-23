import { BRAND } from "@/lib/seo/brand"
import type { LivePage } from "@/lib/seo/types"

// Owner-approved homepage title (Patch 2). It deliberately replaces the workbook primary keyword
// "security companies in Kenya", which stays recorded in lib/seo/workbook-keywords.ts / planned-pages.ts as research data only.
// No location, ranking or licensing wording. Brand is the approved public brand (lib/seo/brand.ts).
export const HOME_TITLE = `${BRAND} | Professional Security Services`

// Written for this site: it lists only the services the site already offers, and makes no licensing,
// availability, response-time, ranking or pricing claim (see lib/claims.ts).
export const HOME_DESCRIPTION = `${BRAND}: manned guarding, events security, K9 units, CCTV, electric fencing, alarm response and VIP close protection. Request a quote.`

/**
 * Every published route. Add a route here ONLY when its page exists and has been approved for indexing.
 * Planned pages live in lib/seo/planned-pages.ts and are deliberately not listed.
 */
export const LIVE_PAGES: readonly LivePage[] = [
  {
    path: "/",
    indexable: true,
    title: { kind: "absolute", text: HOME_TITLE },
    description: HOME_DESCRIPTION,
  },
  {
    path: "/blog",
    // Placeholder with no articles yet: keep out of search results (and the sitemap) until real articles exist.
    indexable: false,
    title: { kind: "segment", text: "Blog" },
    description: `Articles from ${BRAND} about security for homes, estates, businesses and events.`,
  },
]

export function getLivePage(path: LivePage["path"]): LivePage {
  const page = LIVE_PAGES.find((p) => p.path === path)
  if (!page) throw new Error(`Unknown live page: ${path}`)
  return page
}
