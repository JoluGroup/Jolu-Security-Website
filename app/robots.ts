import type { MetadataRoute } from "next"
import { siteConfig } from "@/lib/site-config"

// Replaces public/robots.txt (Next.js rejects having both). Crawling stays open to everything except the
// enquiry API. /blog is intentionally NOT disallowed: it is a noindex placeholder, and a crawler can only
// honour a noindex it is allowed to fetch.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  }
}
