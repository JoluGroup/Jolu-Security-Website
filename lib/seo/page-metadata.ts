// Metadata for a published page, built from the publication manifest entry the gate registered with it.
// Returns null for anything that did not pass the gate.
import type { Metadata } from "next"
import { BRAND } from "@/lib/seo/brand"
import { getManifestEntry } from "@/lib/seo/publication-gate"
import { siteConfig } from "@/lib/site-config"

export function gatedPageMetadata(page: unknown): Metadata | null {
  const entry = getManifestEntry(page)
  if (!entry) return null
  const fullTitle = `${entry.title} | ${BRAND}`
  const image = { url: siteConfig.logo.src, width: 501, height: 501, alt: siteConfig.logo.alt }
  return {
    title: entry.title,
    description: entry.description,
    alternates: { canonical: entry.publicPath },
    openGraph: { type: "website", title: fullTitle, description: entry.description, url: entry.publicPath, siteName: BRAND, locale: "en_KE", images: [image] },
    twitter: { card: "summary", title: fullTitle, description: entry.description, images: [{ url: image.url, alt: image.alt }] },
  }
}
