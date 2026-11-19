import type { MetadataRoute } from "next"
import { canonicalUrl } from "@/lib/seo/metadata"
import { LIVE_PAGES } from "@/lib/seo/pages"
import { publishedPagePaths } from "@/lib/seo/publication-gate"

// Only published, indexable pages. Placeholders (noindex) and planned pages are excluded by construction.
// No lastModified: there is no reliable per-page modification date, and a fabricated one is worse than none.
export default function sitemap(): MetadataRoute.Sitemap {
  const live: MetadataRoute.Sitemap = LIVE_PAGES.filter((page) => page.indexable).map((page) => ({
    url: canonicalUrl(page.path),
    changeFrequency: "monthly",
    priority: page.path === "/" ? 1 : 0.8,
  }))
  // Service and location pages appear here only after passing the publication gate, which also requires a manifest entry
  // with an existing route file and metadata (lib/seo/publication-manifest.ts). Empty today.
  // Fail safe: whatever happens in the gate, the existing entries above are always returned.
  let gated: MetadataRoute.Sitemap = []
  try {
    gated = publishedPagePaths().map((path) => ({ url: canonicalUrl(path), changeFrequency: "monthly", priority: 0.8 }))
  } catch {
    gated = []
  }
  return [...live, ...gated]
}
