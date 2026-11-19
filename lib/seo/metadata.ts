import type { Metadata } from "next"
import { BRAND } from "@/lib/seo/brand"
import { getLivePage, HOME_DESCRIPTION, HOME_TITLE } from "@/lib/seo/pages"
import type { LivePage } from "@/lib/seo/types"
import { siteConfig } from "@/lib/site-config"

/** Square logo, the only approved brand image. Replace with a dedicated social image when one is approved. */
const SOCIAL_IMAGE = { url: siteConfig.logo.src, width: 501, height: 501, alt: siteConfig.logo.alt } as const

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
      card: "summary",
      title: fullTitle,
      description: page.description,
      images: [{ url: SOCIAL_IMAGE.url, alt: SOCIAL_IMAGE.alt }],
    },
  }
}
