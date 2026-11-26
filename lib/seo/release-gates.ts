// Release 04B evidence-gate architecture. Every requirement that used to sit on each service page is classified into
// exactly ONE of three gates, so that business evidence, deployment readiness and marketing optimisation are not mixed:
//
//   A. CONTENT EVIDENCE GATE (per page, enforced by lib/seo/publication-gate.ts through REQUIRED_EVIDENCE).
//      Facts the page itself states or depends on: that the service is offered, its scope, where it is delivered, legal
//      confirmation that it may be advertised, the contact number it shows, and named content and operations approval.
//      Claim wording (licensing, pricing, availability, statistics, ...) stays separately gated by the claim scan: a page
//      that asserts such a claim also needs an approved, scoped, evidenced claim bound to the exact statement.
//   B. PRODUCTION RELEASE GATE (site-wide, before production activation and DNS cutover). Readiness of the deployment,
//      not of any page's facts: privacy notice, security verification, functional acceptance, hosting, enquiry delivery,
//      DNS rollback, repository governance and staff-asset containment. Checked by productionReleaseBlockers().
//   C. POST-LAUNCH OPTIMISATION QUEUE. Marketing measurement and growth work. Search Console does not prove that a
//      company offers a service, GA4 does not establish compliance and AI visibility does not establish capability, so
//      none of these may ever be required to publish a page (tests/seo/release-gates.test.mjs enforces this).
//
// This module approves nothing. Every production item is PENDING until a named person records independent evidence in
// a reviewed change. It holds no secrets and no personal data.
import { deepFreeze } from "@/lib/seo/freeze"

export type GateClass = "content-evidence" | "production-release" | "post-launch"

/** Evidence ids the content gate requires on EVERY service and location page (the page's own ids are added per page). */
export const CONTENT_COMMON = deepFreeze(["COM-05", "CNT-10"] as const)

/** Service-scoped content evidence, in order: offering and scope, delivery area, operations sign-off. */
export const SERVICE_CONTENT_SUFFIXES = deepFreeze(["01", "02", "07"] as const)
/** Company-scoped content evidence every service page also needs: legal confirmation per service; approved description. */
export const SERVICE_CONTENT_COMPANY = deepFreeze(["CMP-05", "CNT-01"] as const)

export type ProductionItem = {
  id: string
  title: string
  /** What counts as evidence for this item. Never a website setting or a marketing account. */
  evidence: string
  /** Evidence-register ids (docs/seo/business-verification on PR #7) this item absorbed from the old per-page table. */
  absorbs: readonly string[]
  status: "PENDING" | "VERIFIED"
  verifiedBy: string | null
  verifiedOn: string | null
  reference: string | null
}

const pending = (id: string, title: string, evidence: string, absorbs: readonly string[] = []): ProductionItem => ({ id, title, evidence, absorbs, status: "PENDING", verifiedBy: null, verifiedOn: null, reference: null })

/** B. Production release gate. All PENDING: nothing here has been verified in this repository. */
export const PRODUCTION_RELEASE_GATE: readonly ProductionItem[] = deepFreeze([
  pending("PRG-01", "Approved privacy notice", "Final privacy notice text approved by management and legal, published at its route, with no internal placeholders.", ["CMP-07"]),
  pending("PRG-02", "Security verification", "Independent security review of the release candidate: headers, CSP, enquiry controls, secret and sensitive-asset scans."),
  pending("PRG-03", "Functional acceptance", "Owner acceptance of the deployed candidate on desktop, tablet and mobile, including navigation, forms, call and WhatsApp links, the apex canonical and the www redirect.", ["DIG-05"]),
  pending("PRG-04", "Commercial hosting", "Vercel plan suitable for a commercial site, with billing confirmed by the owner."),
  pending("PRG-05", "Working enquiry delivery", "One authorised test enquiry in an approved window, with provider acceptance AND mailbox receipt evidence."),
  pending("PRG-06", "DNS rollback readiness", "Complete Cloudflare zone export, exact cutover and rollback records, mail records left untouched, and a live crawl of the legacy URLs so no indexed URL is broken.", ["DIG-08"]),
  pending("PRG-07", "Repository governance", "Branch protection or an equivalent sole-owner workflow: required CI, no force-push, no branch deletion, PR-only changes to main."),
  pending("PRG-08", "Staff-asset privacy containment", "Withheld staff photographs and company PDFs removed from the legacy site with explicit 404s, private backups preserved, and a management decision on which legacy PDF statements may stay public.", ["CLM-10"]),
])

export type PostLaunchItem = { id: string; title: string; absorbs: readonly string[] }

/** C. Post-launch optimisation queue. Never a publication requirement. */
export const POST_LAUNCH_QUEUE: readonly PostLaunchItem[] = deepFreeze([
  { id: "PLQ-01", title: "Google Search Console property and sitemap submission", absorbs: ["DIG-02"] },
  { id: "PLQ-02", title: "Bing Webmaster Tools", absorbs: [] },
  { id: "PLQ-03", title: "GA4 activation with consent architecture and key events (generate_lead, phone_click, whatsapp_click)", absorbs: ["DIG-03"] },
  { id: "PLQ-04", title: "AI visibility baseline and day-90 reassessment (160 prompt-test slots)", absorbs: [] },
  { id: "PLQ-05", title: "Directory listings", absorbs: [] },
  { id: "PLQ-06", title: "Editorial publishing (insights)", absorbs: [] },
  { id: "PLQ-07", title: "Legitimate backlink development", absorbs: [] },
  { id: "PLQ-08", title: "Ongoing ranking and indexation measurement", absorbs: [] },
])

/** Evidence ids removed from the per-page table in Release 04B, and where each one went. */
export const RECLASSIFIED_EVIDENCE: Readonly<Record<string, { to: GateClass; item: string }>> = deepFreeze(
  Object.fromEntries([
    ...PRODUCTION_RELEASE_GATE.flatMap((p) => p.absorbs.map((id) => [id, { to: "production-release" as const, item: p.id }])),
    ...POST_LAUNCH_QUEUE.flatMap((p) => p.absorbs.map((id) => [id, { to: "post-launch" as const, item: p.id }])),
  ]),
)

/** Production items that still block activation. Empty only when every item is VERIFIED with a verifier, date and reference. */
export function productionReleaseBlockers(items: readonly ProductionItem[] = PRODUCTION_RELEASE_GATE): readonly string[] {
  if (!Array.isArray(items) || items.length === 0) return ["production release gate is missing"]
  const ok = (x: ProductionItem) =>
    x.status === "VERIFIED" && typeof x.verifiedBy === "string" && x.verifiedBy.trim() !== "" && typeof x.reference === "string" && x.reference.trim() !== "" && typeof x.verifiedOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x.verifiedOn)
  return items.filter((x) => !ok(x)).map((x) => `${x.id} ${x.title}`)
}
