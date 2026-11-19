import type { MetadataRoute } from "next"
import { canonicalUrl } from "@/lib/seo/metadata"
import { LIVE_PAGES } from "@/lib/seo/pages"

// Only published, indexable pages. Placeholders (noindex) and planned pages are excluded by construction.
// No lastModified: there is no reliable per-page modification date, and a fabricated one is worse than none.
export default function sitemap(): MetadataRoute.Sitemap {
  return LIVE_PAGES.filter((page) => page.indexable).map((page) => ({
    url: canonicalUrl(page.path),
    changeFrequency: "monthly",
    priority: page.path === "/" ? 1 : 0.8,
  }))
}
