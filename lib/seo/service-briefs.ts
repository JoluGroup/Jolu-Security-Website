import type { LayerId } from "@/lib/protection-layers"
import { WORKBOOK_KEYWORDS } from "@/lib/seo/workbook-keywords"
import type { ServiceId } from "@/lib/services"

/**
 * Content specifications for the seven service pages the workbook plans. NOTHING here is rendered by the
 * website: no service route exists, none is in the sitemap, and these specs publish nothing. They exist so
 * that keyword mapping, proposed metadata, evidence gaps and internal links can be checked by tests before
 * any page is built (see docs/seo/service-pages/ and tests/seo/service-pages.test.mjs).
 *
 * Rules: "existing wording" means text already live on the site (lib/services.ts, lib/protection-layers.ts);
 * it is approved site copy, not independently verified operational fact. No pricing, licensing,
 * availability, response-time, certification, review or statistic claim appears in any proposed text.
 */

export type EvidenceItem = {
  id: string
  requirement: string
  owner: "Owner" | "Operations" | "Compliance reviewer" | "Developer" | "SEO lead" | "Editor"
  /** publication = the page must not go live without it; claim = only the statements that rely on it are blocked; section = only that page section */
  blocks: "publication" | "claim" | "section"
}

export type OutlineSection = {
  heading: string
  purpose: string
  source: "existing-wording" | "template" | "evidence-gated"
}

export type InternalLink = {
  to: string
  anchor: string
  status: "exists" | "planned-after-publication" | "blocked-until-target-published"
  note: string
}

export type LegacyWording = {
  wording: string
  where: string
}

export type ServiceBrief = {
  rank: number
  wave: 1 | 2
  /** Workbook 90 DAY ROADMAP window for this page. */
  roadmapWindow: string
  serviceId: ServiceId
  path: string
  layerId: LayerId
  h1: string
  seoTitle: string
  seoDescription: string
  /** Search-intent summary from the workbook: every keyword on these pages is Transactional. */
  intentNote: string
  outline: readonly OutlineSection[]
  serviceEvidence: readonly EvidenceItem[]
  /** Claims-registry (lib/claims.ts) ids this page would be tempted to use. All are "needs-evidence". */
  registryClaimIds: readonly string[]
  /** Wording in legacy documents or existing headlines that must not be reused without evidence. */
  legacyWording: readonly LegacyWording[]
  relatedServiceIds: readonly ServiceId[]
  /** Editorial keyword IDs (workbook /insights/ rows) worth linking once those guides exist. */
  guideKeywordIds: readonly string[]
  internalLinks: readonly InternalLink[]
}

/** Evidence every service page needs, from the workbook ROADMAP dependencies and TECHNICAL AUDIT gates. */
export const COMMON_EVIDENCE: readonly EvidenceItem[] = [
  { id: "C1", requirement: "Operational sign-off of the page's service description (ROADMAP: service proof + operational approval).", owner: "Operations", blocks: "publication" },
  { id: "C2", requirement: "Written scope: what the service includes and excludes, how it is delivered, and which of the three offices serve which counties. Gates all geography wording.", owner: "Operations", blocks: "publication" },
  { id: "C3", requirement: "PSRA position for this service: which registration or licence applies, the evidence, and owner-approved wording. Until then the page makes no licensing statement.", owner: "Compliance reviewer", blocks: "claim" },
  { id: "C4", requirement: "Authentic photos of the service with recorded rights clearance. Every entry in lib/photo-library.ts is currently pending, so none may be shown.", owner: "Owner", blocks: "section" },
  { id: "C5", requirement: "Customer evidence (case study or testimonial) with written consent. None exists; none is invented, so the Proof section is omitted until it does.", owner: "Owner", blocks: "section" },
  { id: "C6", requirement: "Verified name, address and phone for any office the page mentions (workbook LOCAL SEO: verified NAP).", owner: "Owner", blocks: "section" },
  { id: "C7", requirement: "Conversion tracking live and tested: GA4 key events, Search Console, call and WhatsApp attribution (TECHNICAL AUDIT: Critical).", owner: "Developer", blocks: "publication" },
  { id: "C8", requirement: "Live-site crawl confirming the slug, status codes and canonicals before publishing (EXECUTIVE DASHBOARD: slugs are proposals).", owner: "SEO lead", blocks: "publication" },
  { id: "C9", requirement: "Reconcile the downloadable company-profile.pdf and brochure.pdf with the website: they use a different brand line, list other offices and branches, and make claims the registry marks needs-evidence.", owner: "Owner", blocks: "publication" },
  { id: "C10", requirement: "Content-quality review: original service specifics, no text duplicated across service pages, no doorway wording (TECHNICAL AUDIT: content quality).", owner: "Editor", blocks: "publication" },
  { id: "C11", requirement: "Owner approval of the page layout. The design is frozen and no new page design has been approved.", owner: "Owner", blocks: "publication" },
]

const outline = (service: string, specifics: string): readonly OutlineSection[] => [
  { heading: "Hero: H1, one-line service description, quote button", purpose: `Uses the existing approved description of ${service}. Quote button reuses the existing enquiry link.`, source: "existing-wording" },
  { heading: "What the service includes", purpose: `Scope in plain language. ${specifics}`, source: "evidence-gated" },
  { heading: "How it works", purpose: "Delivery steps as operations actually run them. Omit until C1 and C2 are signed off.", source: "evidence-gated" },
  { heading: "Where we provide it", purpose: "Only offices and counties confirmed in C2 and C6. No city or branch is named without confirmation.", source: "evidence-gated" },
  { heading: "Proof", purpose: "Photos and consented customer evidence (C4, C5). The section is left out if neither exists.", source: "evidence-gated" },
  { heading: "Questions about this service", purpose: "Visible questions with owner-approved answers only. FAQ markup is added only for questions that are visible on the page.", source: "evidence-gated" },
  { heading: "Related services", purpose: "Links to the related service pages listed in this brief, with no wording about packages or combined delivery.", source: "template" },
  { heading: "Request a quote", purpose: "Existing enquiry form and contact details; no response-time wording.", source: "template" },
]

const link = (to: string, anchor: string, status: InternalLink["status"], note: string): InternalLink => ({ to, anchor, status, note })

const relatedLinks = (ids: readonly string[], paths: Record<string, string>, names: Record<string, string>): readonly InternalLink[] =>
  ids.map((id) => link(paths[id], names[id], "planned-after-publication", "Related service, linked only after both pages are published."))

const PATHS: Record<string, string> = {
  "manned-guarding": "/services/manned-guarding/",
  "events-security": "/services/events-security/",
  "k9-unit": "/services/k9-unit-services/",
  "cctv-installation": "/services/cctv-installation/",
  "electric-fencing": "/services/electric-fencing/",
  "alarm-response": "/services/alarm-response/",
  "vip-close-protection": "/services/vip-close-protection/",
}
const NAMES: Record<string, string> = {
  "manned-guarding": "Manned Guarding",
  "events-security": "Events Security",
  "k9-unit": "K9 Unit Services",
  "cctv-installation": "CCTV Installation",
  "electric-fencing": "Electric Fencing",
  "alarm-response": "Alarm Response",
  "vip-close-protection": "VIP Close Protection",
}

const LOCATION_PATHS = [
  ["/locations/nairobi/", "Nairobi office"],
  ["/locations/nakuru/", "Nakuru office"],
  ["/locations/rongo/", "Rongo office (Migori County)"],
] as const

const RAW_BRIEFS: readonly Omit<ServiceBrief, "internalLinks">[] = [
  {
    rank: 1, wave: 1, roadmapWindow: "Week 3", serviceId: "manned-guarding", path: "/services/manned-guarding/", layerId: "access",
    h1: "Security guard services in Kenya",
    seoTitle: "Security Guard Services in Kenya | JOLU SECURITY",
    seoDescription: "Security guard services in Kenya from JOLU SECURITY. Security guards stationed at the sites and entrances you choose. Request a quote.",
    intentNote: "All keywords on this page are Transactional: the visitor is ready to ask for guards.",
    outline: outline("manned guarding", "Explain which sites and entrances guards are stationed at, using only what Operations confirms."),
    serviceEvidence: [
      { id: "MG1", requirement: "Deployment model actually offered (static posts, patrols, shift patterns) and who supervises guards.", owner: "Operations", blocks: "section" },
      { id: "MG2", requirement: "Evidence behind any statement about guard training or vetting (registry claim: trained-personnel).", owner: "Operations", blocks: "claim" },
      { id: "MG3", requirement: "Whether 24-hour posts are offered and on what basis, before any 24-hour wording (registry claim: availability-24-7). 3 workbook keywords are held for this.", owner: "Operations", blocks: "claim" },
      { id: "MG4", requirement: "Premises types served, confirmed against the existing site list (estates, events, residential communities, churches, schools, businesses).", owner: "Owner", blocks: "section" },
      { id: "MG5", requirement: "Basis for any guard-count statement (registry claim: guards-deployed). None is used.", owner: "Owner", blocks: "claim" },
      { id: "MG6", requirement: "Evidence for any best, top or professional-quality wording. 3 workbook keywords are held for this; the registry has no approved claim behind them.", owner: "Owner", blocks: "claim" },
    ],
    registryClaimIds: ["licensed-compliant", "availability-24-7", "trained-personnel", "trusted-by-clients", "years-operating", "guards-deployed", "reply-time"],
    legacyWording: [
      { wording: "Guarding described as reliable and comprehensive, tailored to apartments, fuel stations, estates and churches", where: "company-profile.pdf, Our Services" },
      { wording: "Headline 'Every entrance, controlled.'", where: "lib/protection-layers.ts (Access layer; visual framing, not a procedure claim)" },
    ],
    relatedServiceIds: ["cctv-installation", "electric-fencing", "alarm-response"],
    guideKeywordIds: ["KW-297", "KW-310"],
  },
  {
    rank: 2, wave: 1, roadmapWindow: "Week 3", serviceId: "cctv-installation", path: "/services/cctv-installation/", layerId: "eyes",
    h1: "CCTV installation in Kenya",
    seoTitle: "CCTV Installation in Kenya | JOLU SECURITY",
    seoDescription: "CCTV installation in Kenya from JOLU SECURITY. Supply and installation of CCTV camera systems. Request a quote.",
    intentNote: "All keywords on this page are Transactional: the visitor is ready to buy an installation.",
    outline: outline("CCTV installation", "Describe supply and installation only; do not describe monitoring unless Operations confirms it is offered."),
    serviceEvidence: [
      { id: "CC1", requirement: "Installation scope: site survey, equipment supplied, cabling, setup, handover.", owner: "Operations", blocks: "section" },
      { id: "CC2", requirement: "Whether live monitoring is offered. The site says supply and installation only; legacy documents mention continuous monitoring.", owner: "Operations", blocks: "claim" },
      { id: "CC3", requirement: "Equipment brands or types the company actually installs (registry claim: technology-driven).", owner: "Operations", blocks: "claim" },
      { id: "CC4", requirement: "Maintenance, support and any warranty offered. No warranty wording is drafted.", owner: "Operations", blocks: "claim" },
      { id: "CC5", requirement: "Validated pricing ranges, only if the owner wants cost content. 3 workbook keywords are held for pricing.", owner: "Owner", blocks: "claim" },
    ],
    registryClaimIds: ["licensed-compliant", "technology-driven", "trusted-by-clients", "years-operating", "reply-time"],
    legacyWording: [
      { wording: "Advanced CCTV using state-of-the-art technology with continuous monitoring", where: "company-profile.pdf, Our Services" },
      { wording: "Headline 'Every angle, watched.'", where: "lib/protection-layers.ts (Eyes layer; visual framing, not a monitoring claim)" },
    ],
    relatedServiceIds: ["manned-guarding", "alarm-response", "electric-fencing"],
    guideKeywordIds: ["KW-300", "KW-301", "KW-299"],
  },
  {
    rank: 3, wave: 1, roadmapWindow: "Week 3", serviceId: "electric-fencing", path: "/services/electric-fencing/", layerId: "perimeter",
    h1: "Electric fence installation in Kenya",
    seoTitle: "Electric Fence Installation in Kenya | JOLU SECURITY",
    seoDescription: "Electric fence installation in Kenya from JOLU SECURITY. Installation of electric fencing along property boundaries. Request a quote.",
    intentNote: "All keywords on this page are Transactional: the visitor is ready to buy an installation.",
    outline: outline("electric fencing", "Describe boundary installation only, as Operations confirms it."),
    serviceEvidence: [
      { id: "EF1", requirement: "Installation scope: survey, materials, energiser, earthing, signage, handover.", owner: "Operations", blocks: "section" },
      { id: "EF2", requirement: "Safety and regulatory requirements that apply to electric fencing in Kenya, and how installs meet them. No compliance wording is drafted.", owner: "Compliance reviewer", blocks: "claim" },
      { id: "EF3", requirement: "Maintenance and support offered after installation, and any warranty. No warranty wording is drafted.", owner: "Operations", blocks: "claim" },
      { id: "EF4", requirement: "Property types the company installs on, confirmed by Operations.", owner: "Operations", blocks: "section" },
      { id: "EF5", requirement: "Validated pricing ranges, only if the owner wants cost content. 3 workbook keywords are held for pricing.", owner: "Owner", blocks: "claim" },
    ],
    registryClaimIds: ["licensed-compliant", "technology-driven", "trusted-by-clients", "years-operating", "reply-time"],
    legacyWording: [
      { wording: "A powerful deterrent using durable, low-maintenance, cutting-edge materials", where: "company-profile.pdf, Our Services" },
      { wording: "Headline 'Every perimeter, defended.'", where: "lib/protection-layers.ts (Perimeter layer; visual framing, not an outcome claim)" },
    ],
    relatedServiceIds: ["cctv-installation", "manned-guarding", "alarm-response"],
    guideKeywordIds: ["KW-303", "KW-302"],
  },
  {
    rank: 4, wave: 2, roadmapWindow: "Weeks 6-7", serviceId: "events-security", path: "/services/events-security/", layerId: "people",
    h1: "Event security services in Kenya",
    seoTitle: "Event Security Services in Kenya | JOLU SECURITY",
    seoDescription: "Event security services in Kenya from JOLU SECURITY. Security personnel for public and private events. Request a quote.",
    intentNote: "All keywords on this page are Transactional: the visitor is ready to book event security.",
    outline: outline("events security", "Cover public and private events only, with event types confirmed by Operations."),
    serviceEvidence: [
      { id: "EV1", requirement: "Event types and sizes the company has capacity for, as confirmed by Operations.", owner: "Operations", blocks: "section" },
      { id: "EV2", requirement: "Roles offered (security officers, crowd management, access control). Legacy documents mention bouncer services; the site does not.", owner: "Operations", blocks: "claim" },
      { id: "EV3", requirement: "Evidence behind any statement about crowd-management training (registry claim: trained-personnel).", owner: "Operations", blocks: "claim" },
      { id: "EV4", requirement: "Planning process and lead time a client should expect, as Operations states it. No lead-time wording is drafted.", owner: "Operations", blocks: "section" },
    ],
    registryClaimIds: ["licensed-compliant", "trained-personnel", "trusted-by-clients", "years-operating", "reply-time"],
    legacyWording: [
      { wording: "Exceptional event security with professional bouncer services and officers trained to manage crowds", where: "company-profile.pdf, Our Services" },
      { wording: "Headline 'Every person, protected.'", where: "lib/protection-layers.ts (People layer; visual framing, not an outcome claim)" },
    ],
    relatedServiceIds: ["manned-guarding", "vip-close-protection", "k9-unit"],
    guideKeywordIds: ["KW-304", "KW-305"],
  },
  {
    rank: 5, wave: 2, roadmapWindow: "Weeks 6-7", serviceId: "k9-unit", path: "/services/k9-unit-services/", layerId: "response",
    h1: "Security dog services in Kenya",
    seoTitle: "Security Dog Services in Kenya | JOLU SECURITY",
    seoDescription: "Security dog services in Kenya from JOLU SECURITY. Dog and handler teams as part of a site's security arrangements. Request a quote.",
    intentNote: "All keywords on this page are Transactional: the visitor is ready to hire dog and handler teams.",
    outline: outline("the K9 unit", "Describe dog and handler teams as part of a site's arrangements, and nothing about detection roles unless confirmed."),
    serviceEvidence: [
      { id: "K1", requirement: "What dog and handler teams are used for at client sites (patrol, deterrence, access) as Operations confirms.", owner: "Operations", blocks: "section" },
      { id: "K2", requirement: "Evidence for any statement about dog or handler training (registry claim: trained-personnel). Legacy documents claim detection of explosives or narcotics; none of that is drafted.", owner: "Operations", blocks: "claim" },
      { id: "K3", requirement: "Animal-welfare and handling standards the company follows, as the owner states them.", owner: "Owner", blocks: "claim" },
      { id: "K4", requirement: "Whether K9 is offered on its own or only as part of a wider arrangement. The page must not imply a combined package unless true.", owner: "Operations", blocks: "section" },
    ],
    registryClaimIds: ["licensed-compliant", "trained-personnel", "trusted-by-clients", "years-operating", "reply-time"],
    legacyWording: [
      { wording: "Highly trained dogs and experienced handlers, including explosives or narcotics detection and high-risk scenarios", where: "company-profile.pdf, Our Services" },
      { wording: "Headline 'Every alarm, answered.' (shared with Alarm Response)", where: "lib/protection-layers.ts (Response layer; visual framing, not a response claim)" },
    ],
    relatedServiceIds: ["manned-guarding", "alarm-response", "events-security"],
    guideKeywordIds: ["KW-306"],
  },
  {
    rank: 6, wave: 2, roadmapWindow: "Weeks 6-7", serviceId: "alarm-response", path: "/services/alarm-response/", layerId: "response",
    h1: "Alarm response services in Kenya",
    seoTitle: "Alarm Response Services in Kenya | JOLU SECURITY",
    seoDescription: "Alarm response services in Kenya from JOLU SECURITY. Response to alarm activations. Request a quote.",
    intentNote: "All keywords on this page are Transactional. 6 of 31 are held back because they promise speed or 24-hour availability.",
    outline: outline("alarm response", "State only what a response consists of and who responds, as Operations confirms. No timing."),
    serviceEvidence: [
      { id: "AR1", requirement: "Response model: who responds, from where, what they do on arrival, and how the alarm reaches them (company monitoring, client panel, third party).", owner: "Operations", blocks: "publication" },
      { id: "AR2", requirement: "Hours of operation and the basis for any availability statement (registry claim: availability-24-7). 6 workbook keywords are held for this.", owner: "Operations", blocks: "claim" },
      { id: "AR3", requirement: "Any response-time commitment and how it is measured. Until one exists the page states none (registry claim: reply-time).", owner: "Operations", blocks: "claim" },
      { id: "AR4", requirement: "Coverage area for response, by office, as Operations confirms. Distance limits decide which counties can be named.", owner: "Operations", blocks: "section" },
      { id: "AR5", requirement: "Compatibility with client alarm systems, if offered.", owner: "Operations", blocks: "section" },
    ],
    registryClaimIds: ["licensed-compliant", "availability-24-7", "trained-personnel", "trusted-by-clients", "years-operating", "reply-time"],
    legacyWording: [
      { wording: "Swift and reliable response, a team on standby 24/7, responding immediately to triggered alarms", where: "company-profile.pdf, Our Services" },
      { wording: "Headline 'Every alarm, answered.' implies every alarm is answered; no evidence backs that", where: "lib/protection-layers.ts (Response layer; the file calls it visual framing)" },
    ],
    relatedServiceIds: ["cctv-installation", "manned-guarding", "k9-unit"],
    guideKeywordIds: ["KW-298"],
  },
  {
    rank: 7, wave: 2, roadmapWindow: "Weeks 6-7", serviceId: "vip-close-protection", path: "/services/vip-close-protection/", layerId: "people",
    h1: "VIP close protection in Kenya",
    seoTitle: "VIP Close Protection in Kenya | JOLU SECURITY",
    seoDescription: "VIP close protection in Kenya from JOLU SECURITY. Personal protection for individuals and their movements. Request a quote.",
    intentNote: "All keywords on this page are Transactional: the visitor is ready to arrange personal protection.",
    outline: outline("VIP close protection", "Describe personal protection for individuals and their movements, without client names or case details."),
    serviceEvidence: [
      { id: "VP1", requirement: "Who the service is for and what it covers (movements, venues, travel) as Operations confirms.", owner: "Operations", blocks: "section" },
      { id: "VP2", requirement: "Personnel selection and training evidence for any statement about them (registry claim: trained-personnel). Legacy documents say elite and highly trained.", owner: "Operations", blocks: "claim" },
      { id: "VP3", requirement: "Legal position on any armed or unarmed protection, with owner-approved wording. None is drafted.", owner: "Compliance reviewer", blocks: "claim" },
      { id: "VP4", requirement: "Confidentiality approach, stated only as the owner defines it. No client or case is named.", owner: "Owner", blocks: "section" },
    ],
    registryClaimIds: ["licensed-compliant", "trained-personnel", "trusted-by-clients", "years-operating", "reply-time"],
    legacyWording: [
      { wording: "Elite VIP and close protection for high-profile individuals, executives and dignitaries, by highly trained personnel", where: "company-profile.pdf, Our Services" },
      { wording: "Headline 'Every person, protected.'", where: "lib/protection-layers.ts (People layer; visual framing, not an outcome claim)" },
    ],
    relatedServiceIds: ["events-security", "manned-guarding"],
    guideKeywordIds: ["KW-307"],
  },
]

export const SERVICE_BRIEFS: readonly ServiceBrief[] = RAW_BRIEFS.map((b) => ({
  ...b,
  internalLinks: [
    link(`/?service=${b.serviceId}#contact`, "Request a quote", "exists", "Existing enquiry link; the form preselects this service."),
    link("/#services", "Services", "exists", "Existing navigation anchor back to the services list."),
    link("/", NAMES[b.serviceId], "planned-after-publication", "Homepage service card and footer link point here once the page is approved. That needs changes to components/services-index.tsx and components/site-footer.tsx (frozen design), so it is not made in this milestone."),
    ...relatedLinks(b.relatedServiceIds, PATHS, NAMES),
    ...LOCATION_PATHS.map(([to, anchor]) =>
      link(to, anchor, "blocked-until-target-published", "Link only if this office is confirmed to provide the service (C2, C6) and its page is published."),
    ),
    ...b.guideKeywordIds.map((id) => {
      const k = WORKBOOK_KEYWORDS.find((x) => x.id === id)
      if (!k) throw new Error(`Unknown guide keyword ${id}`)
      return link(k.workbookUrl, k.keyword, "blocked-until-target-published", `Workbook ${id}. Link only after the guide is published and expert-reviewed; the Blog stays a noindex placeholder until then.`)
    }),
  ],
}))
