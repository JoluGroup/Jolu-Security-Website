import type { Metadata } from "next"
import { BRAND } from "@/lib/seo/brand"
import { getLivePage, HOME_DESCRIPTION, HOME_TITLE } from "@/lib/seo/pages"
import type { LivePage } from "@/lib/seo/types"
import { siteConfig } from "@/lib/site-config"

/** Social share card (1200x630), derived from the approved logo and brand typography: scripts/brand/build-brand-assets.py. */
const SOCIAL_IMAGE = {
  url: "/brand/jolu-preview.png",
  width: 1200,
  height: 630,
  alt: "JOLU SECURITY: Confidence in every layer of protection",
} as const

/**
 * Absolute canonical URL for a live path. The root has no trailing slash ("https://www.jolusecurity.com"),
 * which is exactly what Next.js renders into <link rel="canonical">, so sitemap and canonical match character for character.
 */
export function canonicalUrl(path: string): string {
  const url = new URL(path, siteConfig.url).toString()
  return path === "/" ? url.replace(/\/$/, "") : url
}

/** Site-wide defaults. Pages set their own canonical, openGraph and twitter via pageMetadata(). */
export const rootMetadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: HOME_TITLE, template: `%s | ${BRAND}` },
  description: HOME_DESCRIPTION,
  applicationName: BRAND,
  manifest: "/manifest.webmanifest",
  // All derived from the approved logo (scripts/brand/build-brand-assets.py). app/favicon.ico is served automatically.
  icons: {
    icon: [
      { url: "/brand/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
}

/**
 * Complete metadata for a live page. Open Graph and Twitter are written out in full here because Next.js
 * replaces (does not merge) these objects between layout and page.
 */
export function pageMetadata(path: LivePage["path"]): Metadata {
  const page = getLivePage(path)
  const fullTitle = page.title.kind === "absolute" ? page.title.text : `${page.title.text} | ${BRAND}`
  return {
    title: page.title.kind === "absolute" ? { absolute: page.title.text } : page.title.text,
    description: page.description,
    alternates: { canonical: path },
    // Indexable pages rely on the default (index, follow). Placeholders are explicitly kept out of results
    // but stay crawlable (no robots.txt block) so the noindex is actually seen.
    ...(page.indexable ? {} : { robots: { index: false, follow: true } }),
    openGraph: {
      type: "website",
      title: fullTitle,
      description: page.description,
      url: path,
      siteName: BRAND,
      locale: "en_KE",
      images: [SOCIAL_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: page.description,
      images: [{ url: SOCIAL_IMAGE.url, alt: SOCIAL_IMAGE.alt }],
    },
  }
}
