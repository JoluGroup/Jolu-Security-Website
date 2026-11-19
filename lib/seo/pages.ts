import { BRAND } from "@/lib/seo/brand"
import type { LivePage } from "@/lib/seo/types"

// Workbook primary keyword for the homepage (PAGE MAP & META, cluster "Security Companies"): "security companies in Kenya".
// The workbook's draft brand suffix "Jolu Group Security" is replaced by the approved public brand.
export const HOME_TITLE = `Security Companies in Kenya | ${BRAND}`

// Written for this site: it lists only the services the site already offers, and makes no licensing,
// availability, response-time, ranking or pricing claim (see lib/claims.ts).
export const HOME_DESCRIPTION = `${BRAND}: manned guarding, events security, K9 units, CCTV, electric fencing, alarm response and VIP close protection across Kenya. Request a quote.`

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
