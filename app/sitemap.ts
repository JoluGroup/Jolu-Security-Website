import type { MetadataRoute } from "next"
import { siteConfig } from "@/lib/site-config"

export default function sitemap(): MetadataRoute.Sitemap {
  // Add `${siteConfig.url}/blog` here (and drop its noindex) once real articles are published.
  return [{ url: siteConfig.url, changeFrequency: "monthly", priority: 1 }]
}
