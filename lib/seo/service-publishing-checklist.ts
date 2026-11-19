/**
 * Acceptance checklist for publishing ONE service page. Areas follow the workbook's TECHNICAL AUDIT sheet,
 * plus Governance for this repository's own rules. Rendered to docs/seo/service-pages/publishing-checklist.md.
 */
export type ChecklistItem = {
  area: string
  check: string
  source: string
  /** How a reviewer proves it. */
  proof: string
}

export const PUBLISHING_CHECKLIST: readonly ChecklistItem[] = [
  { area: "Governance", check: "Every blocking evidence item for the page (C1, C2, C7-C11 and the page's own publication-level items) is closed with a recorded source.", source: "ROADMAP dependencies", proof: "Evidence table filled in, reviewed by the named owner." },
  { area: "Governance", check: "Every statement on the page traces to existing approved wording or to owner-supplied evidence. Nothing comes from the legacy PDFs without evidence.", source: "lib/claims.ts policy", proof: "Line-by-line source note in the pull request." },
  { area: "Governance", check: "No claim in lib/claims.ts is rendered unless its status is approved with evidence recorded.", source: "lib/claims.ts", proof: "Claims registry diff; claims tests pass." },
  { area: "Governance", check: "The owner approved the page layout and any change to the homepage service cards or footer links.", source: "Design freeze", proof: "Written owner approval." },
  { area: "Indexation", check: "The route is added to LIVE_PAGES with indexable true only in the publishing change, and appears in the sitemap exactly once at its canonical URL.", source: "TECHNICAL AUDIT: Indexation", proof: "Sitemap test and built sitemap.xml." },
  { area: "Indexation", check: "Canonical is absolute, self-referencing and slash-consistent with the site's routing (no trailing slash), and robots meta is not noindex.", source: "TECHNICAL AUDIT: Indexation", proof: "Built HTML head." },
  { area: "Indexation", check: "A live-site crawl confirms the slug and that no redirect or duplicate URL exists for the page.", source: "EXECUTIVE DASHBOARD: slugs are proposals", proof: "Crawl export saved with date." },
  { area: "Information architecture", check: "One page per intent: the page's keywords are not targeted by any other page, and related-service links add no duplicate content.", source: "TECHNICAL AUDIT: Information architecture", proof: "Keyword mapping test." },
  { area: "Information architecture", check: "The homepage links to the page (service card and footer) and the page links back to the homepage and its enquiry form.", source: "TECHNICAL AUDIT: internal linking from homepage", proof: "Built HTML link check." },
  { area: "Information architecture", check: "Internal links to unpublished pages (offices, guides, related services) are absent.", source: "No broken links", proof: "Link-resolution test." },
  { area: "On-page", check: "Unique title (60 characters or fewer, brand suffix), unique description (70-160 characters), one H1 containing the primary keyword.", source: "TECHNICAL AUDIT: On-page", proof: "Metadata test." },
  { area: "On-page", check: "Held keywords (pricing, licensing, availability, superlatives, proximity) are absent from copy, title and description unless their claim is approved.", source: "Claim classifier", proof: "Claims tests." },
  { area: "Content quality", check: "Original service specifics from Operations; no wording duplicated across service pages; no city-swap or doorway text.", source: "TECHNICAL AUDIT: Content quality", proof: "Editor review plus duplicate-text check." },
  { area: "Trust signals", check: "No licence, registration, certification, award, client or testimonial statement without recorded evidence; no fabricated reviews.", source: "TECHNICAL AUDIT: Trust signals", proof: "Evidence record per statement." },
  { area: "Structured data", check: "Service markup refers to the existing Organization by @id, names only offices and areas that are confirmed, and contains no price, rating, review, hours or licence.", source: "TECHNICAL AUDIT: Structured data", proof: "JSON-LD test plus Rich Results Test run by the owner or SEO lead." },
  { area: "Structured data", check: "FAQ markup appears only for questions that are visible on the page with approved answers.", source: "TECHNICAL AUDIT: Structured data", proof: "Page source review." },
  { area: "Images", check: "Only photos with recorded rights clearance appear; alt text describes the image; files are compressed.", source: "TECHNICAL AUDIT: Images; lib/photo-library.ts", proof: "Clearance records." },
  { area: "Conversion tracking", check: "Quote-button clicks, form submissions, call and WhatsApp taps are attributed to the page in GA4 and tested.", source: "TECHNICAL AUDIT: Conversion tracking", proof: "Test conversions recorded." },
  { area: "Core Web Vitals", check: "Mobile LCP, INP and CLS are measured for the page and issues are logged and fixed.", source: "TECHNICAL AUDIT: Core Web Vitals", proof: "PageSpeed Insights report." },
  { area: "Security", check: "The page adds no new form or API route; enquiries go through the existing hardened endpoint unchanged.", source: "TECHNICAL AUDIT: Security", proof: "Diff shows no change under app/api or lib/enquiry." },
  { area: "Regression", check: "Homepage output, sitemap entries for other pages, robots.txt and the Blog noindex are unchanged; all tests, typecheck, lint and build pass in CI.", source: "Repository policy", proof: "CI result and built-output comparison." },
]
