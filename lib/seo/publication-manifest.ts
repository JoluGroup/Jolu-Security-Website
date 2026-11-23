// THE authoritative publication manifest. A page is publishable only if it has an entry here. Each entry names the
// route file and the page metadata, so a page cannot reach the sitemap without its route and metadata configuration.
//
// EMPTY: nothing is published. Adding an entry is the deliberate, reviewable change that (together with the page
// record, verified evidence and approvals) publishes a page. tests/seo/page-manifest.test.mjs checks that every
// entry's route file exists, renders the matching page, and that its metadata is complete.
import { deepFreeze } from "@/lib/seo/freeze"

export type ManifestEntry = {
  /** Public path without trailing slash, for example "/services/manned-guarding". */
  publicPath: string
  /** Static route file, for example "app/services/manned-guarding/page.tsx". */
  routeFile: string
  /** Title segment (the root template adds the brand) and meta description. Both are scanned for claims. */
  title: string
  description: string
}

export const PUBLICATION_MANIFEST: readonly ManifestEntry[] = deepFreeze([])
