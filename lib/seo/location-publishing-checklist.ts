// Acceptance checklist and structured-data rules for location pages. Planning data only: not rendered by the site.
// Areas cover every row of the workbook's TECHNICAL AUDIT sheet, plus Governance and NAP and local (LOCAL SEO sheet).

export type ChecklistItem = { area: string; check: string; source: string; proof: string }

export const LOCATION_CHECKLIST: ChecklistItem[] = [
  { area: "Governance", check: "Written owner approval to publish this office page (L1), and the approved layout (L15), are on record.", source: "Evidence L1, L15", proof: "Approval note with approver and date" },
  { area: "Governance", check: "Every evidence item the brief marks 'publication' is closed with a recorded source and approver.", source: "Brief: Missing evidence", proof: "Evidence log" },
  { area: "NAP and local", check: "Name, address and phone on the page equal lib/site-config.ts, the Google Business Profile, directories and signage, character for character.", source: "LOCAL SEO: Verify exact office NAP", proof: "NAP verification checklist signed off" },
  { area: "NAP and local", check: "Opening hours appear only if confirmed (L3); otherwise no hours on the page and no hours markup.", source: "Evidence L3", proof: "Local manager confirmation" },
  { area: "NAP and local", check: "Google Business Profile for the office is verified and consistent with the page (L6).", source: "LOCAL SEO: Google Business Profile", proof: "Profile screenshot and ownership record" },
  { area: "NAP and local", check: "Service area text equals the verified list (L4); no radius, travel-time or response-time statement.", source: "Evidence L4", proof: "Local manager list" },
  { area: "Indexation", check: "Page is indexable, self-canonical on the slash-less URL, in the sitemap and not blocked by robots; no /locations/migori URL exists or redirects to /locations/rongo.", source: "TECHNICAL AUDIT: Indexation; owner decision 5A.1", proof: "Crawler export and Search Console URL inspection" },
  { area: "Information architecture", check: "One page per distinct intent: no keyword is targeted by this page and another; the 'near me' and cross-location keywords are placed per the owner decision.", source: "TECHNICAL AUDIT: Information architecture", proof: "Keyword map diff" },
  { area: "Information architecture", check: "Internal links: other published office pages, the confirmed services, and the homepage; every link resolves to a published page.", source: "Brief: Internal links", proof: "Link check output" },
  { area: "On-page", check: "Unique title (60 characters or fewer), description (70 to 160), one H1, none containing a held keyword's claim.", source: "TECHNICAL AUDIT: On-page", proof: "Crawl report" },
  { area: "Content quality", check: "Unique-content gate passed (L14): sections marked unique are written from owner-supplied local facts; no sentence pattern is the same with only the town name swapped; proposed limit of 30 per cent of sentences shared with a sibling page (SEO lead to confirm).", source: "TECHNICAL AUDIT: Content quality", proof: "Editor sign-off and similarity check" },
  { area: "Content quality", check: "No service-plus-city doorway pages and no page per suburb are created from this template.", source: "Cluster Strategy; owner decision 5A.1", proof: "Sitemap review" },
  { area: "Trust signals", check: "No licensing, 'top', 'best', 24-hour, response-time or client-count statement unless its registry claim is approved.", source: "TECHNICAL AUDIT: Trust signals; lib/claims.ts", proof: "Claim scan and registry status" },
  { area: "Trust signals", check: "Testimonials, client names and case studies appear only with written consent (L10).", source: "Evidence L10", proof: "Consent record" },
  { area: "Structured data", check: "Markup follows the structured-data requirements: only verified properties, one LocalBusiness per page, every value visible on the page.", source: "TECHNICAL AUDIT: Structured data", proof: "Rich Results Test and Schema validator output" },
  { area: "Images", check: "Any photo is rights-cleared through lib/photo-library.ts with descriptive alt text; none is used otherwise.", source: "TECHNICAL AUDIT: Images; evidence L9", proof: "Clearance record and image audit" },
  { area: "Conversion tracking", check: "Call, WhatsApp and quote-request events are attributed to this page; test leads recorded (L12).", source: "TECHNICAL AUDIT: Conversion tracking", proof: "GA4 / Tag Manager test log" },
  { area: "Core Web Vitals", check: "Mobile LCP, INP and CLS measured; issues logged and fixed. A map embed, if used, is measured separately.", source: "TECHNICAL AUDIT: Core Web Vitals", proof: "PageSpeed Insights report" },
  { area: "Security", check: "HTTPS, form protection and privacy disclosures unchanged; a map embed (if any) passes privacy review and the security headers are updated deliberately (L11).", source: "TECHNICAL AUDIT: Security", proof: "Header check and privacy review" },
  { area: "Regression", check: "Homepage, Blog noindex, existing sitemap entries, robots.txt and the enquiry flow are unchanged.", source: "Existing SEO tests", proof: "Test run and build output comparison" },
]

export type SdTreatment = "include-when-verified" | "omit-by-default" | "never-until-evidenced"
export type SdRule = { property: string; treatment: SdTreatment; requirement: string; evidence: string[] }

// Google's current guidance was NOT re-checked in this milestone (web access was not available). Re-verify the
// property lists and rich-result eligibility against Google's documentation before implementing.
export const STRUCTURED_DATA_RULES: SdRule[] = [
  { property: "@type LocalBusiness", treatment: "include-when-verified", requirement: "Use the generic LocalBusiness type. A more specific subtype only if the owner and SEO lead confirm it describes the office accurately.", evidence: ["L1", "L2"] },
  { property: "@id", treatment: "include-when-verified", requirement: "<canonical URL>#localbusiness, one per page. Never three offices on one page.", evidence: ["L1"] },
  { property: "name", treatment: "include-when-verified", requirement: "Equal to the verified business name, and to the Organization.location name already on the homepage.", evidence: ["L2"] },
  { property: "parentOrganization", treatment: "include-when-verified", requirement: "Reference to the existing Organization @id (https://www.jolusecurity.com/#organization).", evidence: ["L1"] },
  { property: "url", treatment: "include-when-verified", requirement: "The slash-less canonical URL of the page.", evidence: ["L13"] },
  { property: "address (PostalAddress)", treatment: "include-when-verified", requirement: "streetAddress, addressLocality and addressCountry from the verified NAP, identical to the visible address. addressRegion and postalCode only if verified; never inferred.", evidence: ["L2"] },
  { property: "telephone", treatment: "include-when-verified", requirement: "The verified office number in E.164 form, visible on the page.", evidence: ["L7"] },
  { property: "email", treatment: "include-when-verified", requirement: "The existing company address, only if shown on the page.", evidence: ["L2"] },
  { property: "areaServed", treatment: "include-when-verified", requirement: "Only the verified service area list.", evidence: ["L4"] },
  { property: "openingHoursSpecification", treatment: "omit-by-default", requirement: "Only days and hours confirmed by the local manager and shown on the page. No 24-hour value as a stand-in for service availability.", evidence: ["L3"] },
  { property: "geo", treatment: "omit-by-default", requirement: "Only coordinates taken from the verified address.", evidence: ["L2"] },
  { property: "hasMap", treatment: "omit-by-default", requirement: "Only when a map link exists on the page (L11).", evidence: ["L11"] },
  { property: "sameAs", treatment: "omit-by-default", requirement: "Only the verified Google Business Profile or other profile URL the business owns.", evidence: ["L6"] },
  { property: "image", treatment: "omit-by-default", requirement: "Only a rights-cleared photo shown on the page.", evidence: ["L9"] },
  { property: "makesOffer / hasOfferCatalog", treatment: "omit-by-default", requirement: "Only services confirmed for the office (L5), with name and existing description, and no price.", evidence: ["L5"] },
  { property: "priceRange", treatment: "never-until-evidenced", requirement: "A price statement; pricing content is not approved.", evidence: ["L1"] },
  { property: "aggregateRating / review", treatment: "never-until-evidenced", requirement: "No reviews exist on the site; self-published review markup is not allowed. Only genuine, displayed, compliant reviews, via a separate approved process.", evidence: ["L10"] },
  { property: "hasCredential / license / award", treatment: "never-until-evidenced", requirement: "Requires the PSRA evidence (L8) and the registry claim to be approved.", evidence: ["L8"] },
  { property: "FAQPage", treatment: "omit-by-default", requirement: "Only for questions and answers that are visible on the page and owner-approved. Rich-result eligibility for FAQ is restricted by Google (to be re-verified), so it is not a reason to add FAQs.", evidence: ["L14"] },
  { property: "BreadcrumbList", treatment: "omit-by-default", requirement: "Omitted: there is no /locations index page and no visible breadcrumb. Adding either changes the frozen design.", evidence: ["L15"] },
]
