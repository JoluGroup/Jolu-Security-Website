// PLANNING SPECS for the three planned location pages. They are NOT rendered by the site and no route uses them.
// docs/seo/location-pages/ is generated from this file by scripts/seo/build-location-docs.mjs; a test fails if they drift.
//
// Rules this file follows:
// - Only facts that already exist in the repository are stated as facts (lib/site-config.ts offices, lib/claims.ts,
//   the SEO workbook data). Everything else is an evidence REQUIREMENT with an owner, never a value.
// - ONE LOCATION, ONE PAGE. Rongo and Migori County share /locations/rongo/. There is no Migori page.
// - No opening hours, coordinates, postcode, ratings, reviews, price range or licence number appears anywhere,
//   because nothing verified supports them.
import { keywordsForPath, WORKBOOK_KEYWORDS } from "@/lib/seo/keyword-map"
import { PLANNED_PAGES } from "@/lib/seo/planned-pages"
import { siteConfig } from "@/lib/site-config"

export type EvidenceOwner = "Owner" | "Operations" | "Local manager" | "Local SEO lead" | "Compliance reviewer" | "Developer" | "SEO lead" | "Editor"
export type EvidenceItem = {
  id: string
  requirement: string
  owner: EvidenceOwner
  /** publication: page must not go live without it. claim: a statement or markup property may not appear without it. section: only that section is held. */
  blocks: "publication" | "claim" | "section"
}
export type OutlineSection = { heading: string; purpose: string; unique: boolean; condition?: string }
export type InternalLink = {
  to: string
  anchor: string
  status: "exists" | "planned-after-publication" | "blocked-until-target-published"
  note: string
}
export type NapStatus = "on-site-unverified" | "conflict" | "missing" | "shared-not-office-specific"
export type NapField = { field: string; approvedValue: string | null; source: string; status: NapStatus; action: string }
export type KeywordConflict = { id: string; keyword: string; mappedTo: string; proposedPath: string | null; note: string }
export type LocationBrief = {
  rank: number
  wave: 1 | 2
  roadmapWindow: string
  slug: "nairobi" | "nakuru" | "rongo"
  path: "/locations/nairobi/" | "/locations/nakuru/" | "/locations/rongo/"
  /** office.name in lib/site-config.ts: the Rongo page covers the office the site calls "Migori". */
  officeName: "Nairobi" | "Nakuru" | "Migori"
  placeName: string
  h1: string
  seoTitle: string
  seoDescription: string
  intentNote: string
  outline: OutlineSection[]
  uniqueContent: { id: string; requirement: string }[]
  localEvidence: EvidenceItem[]
  keywordConflicts: KeywordConflict[]
  /** Workbook keywords proposed to move onto this page from another location page (owner decision L-D3). */
  proposedAdditions: string[]
  internalLinks: InternalLink[]
}

/** Geography words that identify a location in a keyword; used to find keywords on a location page that name another place. */
export const LOCATION_WORDS = { nairobi: /\bnairobi\b/i, nakuru: /\bnakuru\b/i, rongo: /\b(rongo|migori)\b/i } as const

export const COMMON_EVIDENCE: EvidenceItem[] = [
  { id: "L1", requirement: "Written owner approval to publish a page for this office, naming the approver and date. The workbook gates every location page on unique content and a verified service area.", owner: "Owner", blocks: "publication" },
  { id: "L2", requirement: "Verified NAP: exact business name, full address (street or building, not only an estate or landmark), and phone number for this office, matching website, Google Business Profile, directories and signage (LOCAL SEO: 'Verify exact office NAP'). Evidence log entry per field.", owner: "Local manager", blocks: "publication" },
  { id: "L3", requirement: "Opening hours confirmed by the local manager, including days, holidays and whether visits are by appointment. Office hours are not the same as service availability, which stays a held claim (registry 'availability-24-7'). Until confirmed, no hours are shown or marked up.", owner: "Local manager", blocks: "claim" },
  { id: "L4", requirement: "Real service area: the towns, estates or areas this office actually serves and any it does not, written by the local manager. No radius, travel-time or response-time statement without separate evidence.", owner: "Operations", blocks: "publication" },
  { id: "L5", requirement: "Which of the seven approved services (manned guarding, events security, K9 unit, CCTV installation, electric fencing, alarm response, VIP close protection) this office provides or arranges. Nothing in the repository states this per office.", owner: "Operations", blocks: "publication" },
  { id: "L6", requirement: "Google Business Profile for this office: ownership verified, category and name matching the NAP, and confirmation the office is an eligible location (LOCAL SEO: 'Only use actual eligible office locations'). The profile URL is used in markup only after verification.", owner: "Local SEO lead", blocks: "claim" },
  { id: "L7", requirement: "Phone number(s) to show for this office. The site shows two company-wide numbers; the legacy company-profile PDF shows a different second number. Decide whether the office has its own line or shares the company numbers.", owner: "Owner", blocks: "publication" },
  { id: "L8", requirement: "PSRA registration position (registry claim 'licensed-compliant'). Required only if the page is to mention licensing; until evidenced the page makes no licensing statement and no licence markup.", owner: "Compliance reviewer", blocks: "claim" },
  { id: "L9", requirement: "Rights-cleared office or team photos. Every entry in lib/photo-library.ts has clearance pending, so no photo may appear and no image property may be marked up.", owner: "Owner", blocks: "section" },
  { id: "L10", requirement: "Local proof (testimonials, named clients, case studies) only with written consent from the client. None exists in the repository. Reviews are a separate workstream and are never incentivised or gated (LOCAL SEO: 'Reputation').", owner: "Owner", blocks: "section" },
  { id: "L11", requirement: "Map decision: link out to a map (no third-party code) or embed one (third-party frame; needs a privacy review and a change to the security headers in next.config.ts). Either needs the verified address first.", owner: "Developer", blocks: "section" },
  { id: "L12", requirement: "Conversion tracking that attributes calls, WhatsApp and quote requests to this page (TECHNICAL AUDIT: 'Conversion tracking'). Test leads attributed correctly before launch.", owner: "SEO lead", blocks: "publication" },
  { id: "L13", requirement: "Live crawl and redirect check for any existing /locations URL, including /locations/migori, before the new URL goes live (PAGE MAP caution: 'Audit existing URL'). No Migori page is created.", owner: "SEO lead", blocks: "publication" },
  { id: "L14", requirement: "Editor sign-off that the page passes the unique-content gate and is not a doorway page: the body differs from the sibling location pages and carries facts only this office can supply (TECHNICAL AUDIT: 'No duplicated doorway content').", owner: "Editor", blocks: "publication" },
  { id: "L15", requirement: "Owner approval of the page layout. The visual design is frozen; the page may only reuse existing primitives until a layout is approved.", owner: "Owner", blocks: "publication" },
]

const SERVICE_PATHS = PLANNED_PAGES.filter((p) => p.kind === "service")
function links(selfPath: string, others: { path: string; anchor: string }[]): InternalLink[] {
  const all: InternalLink[] = [
    { to: siteConfig.quoteHref, anchor: "Request a quote", status: "exists", note: "Existing homepage enquiry section." },
    { to: siteConfig.servicesHref, anchor: "Our services", status: "exists", note: "Existing homepage services section." },
    { to: "/", anchor: "JOLU SECURITY", status: "planned-after-publication", note: "Return link to the homepage; the homepage offices block is not changed in this milestone." },
    ...others.map((o): InternalLink => ({ to: o.path, anchor: o.anchor, status: "planned-after-publication", note: "Other office page; add only once that page is published." })),
    ...SERVICE_PATHS.map((s): InternalLink => ({ to: s.path, anchor: s.name, status: "blocked-until-target-published", note: "Service page is planned, not published. Link only the services confirmed for this office (L5)." })),
  ]
  return all.filter((l) => l.to !== selfPath)
}

export const LOCATION_BRIEFS: LocationBrief[] = [
  {
    rank: 1,
    wave: 1,
    roadmapWindow: "Weeks 5-6",
    slug: "nairobi",
    path: "/locations/nairobi/",
    officeName: "Nairobi",
    placeName: "Nairobi",
    h1: "Security company in Nairobi",
    seoTitle: "Security Company in Nairobi | JOLU SECURITY",
    seoDescription: "Security company in Nairobi: contact the JOLU SECURITY Head Office to discuss your security requirements. Request a quote.",
    intentNote: "Commercial intent: a person choosing a security company in Nairobi who wants to know where the company is, what it does locally and how to reach it. Service-plus-city searches ('cctv installation in nairobi') stay on the service pages.",
    outline: [
      { heading: "JOLU SECURITY in Nairobi", purpose: "Who the page is for and what this office is, using only the approved label 'Head Office'.", unique: true },
      { heading: "Office details", purpose: "Name, address and phone from lib/site-config.ts, identical to the footer, Google Business Profile and structured data.", unique: true, condition: "L2, L7" },
      { heading: "Opening hours", purpose: "Days and hours as confirmed by the local manager.", unique: true, condition: "L3; omit the section if not confirmed" },
      { heading: "Areas we serve from Nairobi", purpose: "The verified list of areas this office serves.", unique: true, condition: "L4" },
      { heading: "Services available in Nairobi", purpose: "Only services confirmed for this office, each linking to its service page once published.", unique: true, condition: "L5" },
      { heading: "Questions from Nairobi clients", purpose: "Answers to questions actually asked in Nairobi enquiries, owner-approved.", unique: true, condition: "L14" },
      { heading: "Directions and map", purpose: "How to find the office, matching the verified address.", unique: true, condition: "L2, L11" },
      { heading: "Request a quote", purpose: "Link to the existing enquiry section; no new form.", unique: false },
    ],
    uniqueContent: [
      { id: "U1", requirement: "A description of what this office does, written by the local manager in their own words (staffing, who answers calls). No claim about numbers of guards, years or response times." },
      { id: "U2", requirement: "The verified list of Nairobi areas served, and any areas not served." },
      { id: "U3", requirement: "Which of the approved client categories (estates, events, residential communities, churches, schools, businesses) the Nairobi office actually serves." },
      { id: "U4", requirement: "At least three real questions from Nairobi enquiries, with owner-approved answers." },
      { id: "U5", requirement: "How to find the office: a landmark and access description that matches the verified address." },
    ],
    localEvidence: [
      { id: "NBO1", requirement: "The site's address, 'Thome, Nairobi, Kenya', names an area, not a street or building. Obtain the full address the office uses on signage and with Google Business Profile.", owner: "Local manager", blocks: "publication" },
      { id: "NBO2", requirement: "Confirm 'Head Office' is the correct current label. The company-profile PDF says 'Head Offices, Located at Thome Estate'; a brochure caption beside a K9 training photo names Nakuru as 'HQ'. Resolve which office is head office before the page uses the word.", owner: "Owner", blocks: "claim" },
      { id: "NBO3", requirement: "Decide whether 'near me' keywords (KW-086, KW-087) are tied to Nairobi. They cannot be tied to one office until the Google Business Profile exists and the service area is verified.", owner: "SEO lead", blocks: "claim" },
      { id: "NBO4", requirement: "Evidence for any 'top' or 'best' wording before KW-082 is used; until then the keyword is held.", owner: "Owner", blocks: "claim" },
    ],
    keywordConflicts: [
      { id: "KW-093", keyword: "security company in nakuru town", mappedTo: "/locations/nairobi/", proposedPath: "/locations/nakuru/", note: "The workbook points a Nakuru keyword at the Nairobi page. A Nairobi page cannot satisfy this intent." },
      { id: "KW-094", keyword: "private security company in migori", mappedTo: "/locations/nairobi/", proposedPath: "/locations/rongo/", note: "The workbook points a Migori keyword at the Nairobi page. It belongs with the Rongo (Migori County) page." },
      { id: "KW-086", keyword: "security company near me", mappedTo: "/locations/nairobi/", proposedPath: null, note: "A 'near me' query is not about Nairobi. Held as claim-sensitive (proximity); stays where it is until the owner decides (L-D4)." },
      { id: "KW-087", keyword: "security guard company near me", mappedTo: "/locations/nairobi/", proposedPath: null, note: "As KW-086." },
      { id: "KW-088", keyword: "hire security guards in nairobi", mappedTo: "/locations/nairobi/", proposedPath: null, note: "Transactional intent that overlaps the manned-guarding service page (KW-013 'security guard services in nairobi'). Keep as a secondary keyword only; the quote path should lead to the service page (L-D5)." },
    ],
    proposedAdditions: [],
    internalLinks: links("/locations/nairobi/", [
      { path: "/locations/nakuru/", anchor: "Nakuru office" },
      { path: "/locations/rongo/", anchor: "Rongo office (Migori County)" },
    ]),
  },
  {
    rank: 2,
    wave: 1,
    roadmapWindow: "Weeks 5-6",
    slug: "nakuru",
    path: "/locations/nakuru/",
    officeName: "Nakuru",
    placeName: "Nakuru",
    h1: "Security company in Nakuru",
    seoTitle: "Security Company in Nakuru | JOLU SECURITY",
    seoDescription: "Security company in Nakuru: contact the JOLU SECURITY Regional Office to discuss your security requirements. Request a quote.",
    intentNote: "Commercial intent: a person choosing a security company in Nakuru. Service-plus-city searches stay on the service pages. The workbook maps only two keywords to this page, so its value rests on unique local content, not keyword volume.",
    outline: [
      { heading: "JOLU SECURITY in Nakuru", purpose: "What the Regional Office is, using only the approved label 'Regional Office & Showroom'.", unique: true },
      { heading: "Office details", purpose: "Name, address and phone from lib/site-config.ts, identical everywhere.", unique: true, condition: "L2, L7, NAK1" },
      { heading: "Opening hours", purpose: "Days and hours as confirmed by the local manager.", unique: true, condition: "L3; omit the section if not confirmed" },
      { heading: "The Nakuru showroom", purpose: "What a visitor can see or do at the showroom.", unique: true, condition: "NAK2; omit the section if not confirmed" },
      { heading: "Areas we serve from Nakuru", purpose: "The verified list of areas this office serves.", unique: true, condition: "L4" },
      { heading: "Services available in Nakuru", purpose: "Only services confirmed for this office, each linking to its service page once published.", unique: true, condition: "L5" },
      { heading: "Questions from Nakuru clients", purpose: "Answers to questions actually asked in Nakuru enquiries, owner-approved.", unique: true, condition: "L14" },
      { heading: "Directions and map", purpose: "How to find the office, matching the verified address.", unique: true, condition: "L2, L11" },
      { heading: "Request a quote", purpose: "Link to the existing enquiry section; no new form.", unique: false },
    ],
    uniqueContent: [
      { id: "U1", requirement: "A description of what the Regional Office does, written by the local manager. No claim about numbers of guards, years or response times." },
      { id: "U2", requirement: "The verified list of Nakuru-area locations served, and any not served." },
      { id: "U3", requirement: "What the showroom is: what is displayed, whether visits are welcome, and any appointment rule." },
      { id: "U4", requirement: "At least three real questions from Nakuru enquiries, with owner-approved answers." },
      { id: "U5", requirement: "How to find the office, written from the verified address and the landmarks the office itself uses." },
    ],
    localEvidence: [
      { id: "NAK1", requirement: "ADDRESS CONFLICT. The site says 'Along West Road, Opposite Nakuru Athletics, Next to Evans Hospital'. The legacy company-profile PDF says 'KFA Building, Along Geoffrey Kamau Avenue'. Establish which is the current address (or whether the office moved) before either is repeated on a page.", owner: "Local manager", blocks: "publication" },
      { id: "NAK2", requirement: "What the 'Showroom' in the approved label 'Regional Office & Showroom' contains and whether it is open to visitors and at what hours. Nothing in the repository describes it.", owner: "Local manager", blocks: "section" },
      { id: "NAK3", requirement: "Whether the Nakuru office provides K9 services or training. The brochure shows K9 handler training captioned 'HQ - Nakuru'; this is not a statement about service availability and must not be repeated unconfirmed.", owner: "Operations", blocks: "claim" },
    ],
    keywordConflicts: [],
    proposedAdditions: ["KW-093"],
    internalLinks: links("/locations/nakuru/", [
      { path: "/locations/nairobi/", anchor: "Nairobi head office" },
      { path: "/locations/rongo/", anchor: "Rongo office (Migori County)" },
    ]),
  },
  {
    rank: 3,
    wave: 2,
    roadmapWindow: "None in the roadmap (LOCAL SEO lists the Rongo / Migori landing page as P2)",
    slug: "rongo",
    path: "/locations/rongo/",
    officeName: "Migori",
    placeName: "Rongo, Migori County",
    h1: "Security company in Rongo, Migori County",
    seoTitle: "Security Company in Rongo, Migori County | JOLU SECURITY",
    seoDescription: "Security company in Rongo, Migori County: contact the JOLU SECURITY Branch Office to discuss your security requirements. Request a quote.",
    intentNote: "Commercial intent from Rongo and Migori searches, served by ONE page (owner decision, Milestone 5A.1). The page covers the Rongo branch in Migori County; it must not read as a second page for Migori town. No /locations/migori/ page is created.",
    outline: [
      { heading: "JOLU SECURITY in Rongo, Migori County", purpose: "What the Branch Office is and which county it is in, using only the approved label 'Branch Office'.", unique: true },
      { heading: "Office details", purpose: "Name, address and phone from lib/site-config.ts, identical everywhere.", unique: true, condition: "L2, L7, RON1, RON2" },
      { heading: "Opening hours", purpose: "Days and hours as confirmed by the local manager.", unique: true, condition: "L3; omit the section if not confirmed" },
      { heading: "Areas we serve in Migori County", purpose: "The verified list of places served, stating whether Migori town itself is included.", unique: true, condition: "L4, RON3" },
      { heading: "Services available in Rongo", purpose: "Only services confirmed for this office, each linking to its service page once published.", unique: true, condition: "L5" },
      { heading: "Questions from Rongo and Migori clients", purpose: "Answers to questions actually asked in enquiries from the area, owner-approved.", unique: true, condition: "L14" },
      { heading: "Directions", purpose: "How to find the office from the landmark the office uses.", unique: true, condition: "L2, L11" },
      { heading: "Request a quote", purpose: "Link to the existing enquiry section; no new form.", unique: false },
    ],
    uniqueContent: [
      { id: "U1", requirement: "A description of what the Branch Office does, written by the local manager. No claim about numbers of guards, years or response times." },
      { id: "U2", requirement: "The verified list of Rongo and Migori County places served, and whether Migori town is served from this office." },
      { id: "U3", requirement: "Which approved client categories the Rongo office actually serves." },
      { id: "U4", requirement: "At least three real questions from enquiries in the area, with owner-approved answers." },
      { id: "U5", requirement: "How to find the office from 'Near KENGAS Rongo' and any other landmark the office itself uses." },
    ],
    localEvidence: [
      { id: "RON1", requirement: "NAME MISMATCH. lib/site-config.ts calls this office 'Migori' (address 'Near KENGAS Rongo, Migori, Kenya') while the page, URL and workbook say Rongo. NAP must match everywhere, so the owner must decide the single public name (for example 'Rongo, Migori County') and use it on the site, Google Business Profile and signage.", owner: "Owner", blocks: "publication" },
      { id: "RON2", requirement: "'Near KENGAS Rongo' is a landmark, not a street address. Obtain the full address the branch uses on signage and with Google Business Profile.", owner: "Local manager", blocks: "publication" },
      { id: "RON3", requirement: "Whether the branch serves Migori town itself or only Rongo and its surroundings. KW-009, KW-010 and KW-094 target Migori; the page may use them only if Migori is genuinely served.", owner: "Operations", blocks: "claim" },
      { id: "RON4", requirement: "The legacy company-profile PDF lists branches in Eldoret and Kisumu that appear nowhere on the site or in the workbook's LOCAL SEO sheet. Confirm they are not current offices; no page is planned for them.", owner: "Owner", blocks: "section" },
    ],
    keywordConflicts: [],
    proposedAdditions: ["KW-094"],
    internalLinks: links("/locations/rongo/", [
      { path: "/locations/nairobi/", anchor: "Nairobi head office" },
      { path: "/locations/nakuru/", anchor: "Nakuru office" },
    ]),
  },
]

/** The facts the repository already holds for an office, and what is missing. Derived from lib/site-config.ts, never typed here. */
export function napFor(brief: LocationBrief): NapField[] {
  const office = siteConfig.offices.find((o) => o.name === brief.officeName)
  if (!office) throw new Error(`No office ${brief.officeName}`)
  const { contact } = siteConfig
  const shared = (note: string) => `Company-wide, not office-specific. ${note}`
  const addressConflict = brief.slug === "nakuru"
  return [
    { field: "Business name", approvedValue: `JOLU SECURITY ${office.name} ${office.label}`, source: "lib/seo/json-ld.ts (Organization.location name, built from site-config)", status: "on-site-unverified", action: "Confirm the same name is used on the Google Business Profile, directories and signage. The legacy PDFs use 'JOLU GROUP SECURITY LIMITED' and 'JOLU GROUP LTD'." },
    { field: "Office name on the site", approvedValue: office.name, source: "lib/site-config.ts offices", status: brief.slug === "rongo" ? "conflict" : "on-site-unverified", action: brief.slug === "rongo" ? "The site says 'Migori', the page says 'Rongo'. Owner decides one public name (RON1)." : "Confirm." },
    { field: "Office label", approvedValue: office.label, source: "lib/site-config.ts offices", status: "on-site-unverified", action: brief.slug === "nairobi" ? "Confirm head-office status (NBO2)." : "Confirm." },
    { field: "Address line", approvedValue: office.address, source: "lib/site-config.ts offices (shown in the live footer and contact section)", status: addressConflict ? "conflict" : "on-site-unverified", action: addressConflict ? "Conflicts with the company-profile PDF ('KFA Building, Along Geoffrey Kamau Avenue'). Resolve (NAK1)." : brief.slug === "nairobi" ? "An area name only. Obtain street or building address (NBO1)." : "A landmark only. Obtain street or building address (RON2)." },
    { field: "Town / locality", approvedValue: office.name === "Migori" ? "Rongo (branch is in Migori County)" : office.name, source: "lib/site-config.ts, owner decision 5A.1", status: "on-site-unverified", action: "Confirm the locality used on the Google Business Profile." },
    { field: "County / region", approvedValue: brief.slug === "rongo" ? "Migori County (owner decision 5A.1)" : null, source: brief.slug === "rongo" ? "Milestone 5A.1 owner decision" : "Not held in the repository", status: brief.slug === "rongo" ? "on-site-unverified" : "missing", action: "Supply the county for markup only if verified." },
    { field: "Postal code / P.O. box", approvedValue: null, source: "Not held in the repository", status: "missing", action: "Supply only if the office uses one; never invented." },
    { field: "Country", approvedValue: "Kenya", source: "lib/site-config.ts offices", status: "on-site-unverified", action: "None." },
    { field: "Phone", approvedValue: `${contact.primaryPhone.displayIntl}; ${contact.secondaryPhone.displayIntl}`, source: "lib/site-config.ts contact", status: "shared-not-office-specific", action: shared("The company-profile PDF shows +254 769 281 518 as the second number. Decide the numbers for this office (L7).") },
    { field: "Email", approvedValue: contact.email, source: "lib/site-config.ts contact", status: "shared-not-office-specific", action: shared("Confirm whether the office has its own address.") },
    { field: "WhatsApp", approvedValue: contact.whatsappNumber, source: "lib/site-config.ts contact", status: "shared-not-office-specific", action: shared("Confirm if it is monitored by this office.") },
    { field: "Opening hours", approvedValue: null, source: "Not held anywhere in the repository, claims registry or legacy PDFs", status: "missing", action: "Local manager supplies days and hours (L3). Until then none is shown or marked up." },
    { field: "Coordinates", approvedValue: null, source: "Not held in the repository", status: "missing", action: "Take from the verified address only if geo markup is wanted; omit by default." },
    { field: "Google Business Profile URL", approvedValue: null, source: "LOCAL SEO status: Not started", status: "missing", action: "Verify ownership first (L6); then record the URL." },
    { field: "Signage / on-site evidence", approvedValue: null, source: "None recorded", status: "missing", action: "Local manager supplies a signage photo or equivalent evidence for the evidence log (workbook: 'match ... signage')." },
  ]
}

/** Keywords currently mapped to the page and the proposed re-map, for the brief. */
export function keywordsOnPage(brief: LocationBrief) {
  return keywordsForPath(brief.path)
}
export function proposedAdditionRows(brief: LocationBrief) {
  return brief.proposedAdditions.map((id) => {
    const k = WORKBOOK_KEYWORDS.find((x) => x.id === id)
    if (!k) throw new Error(`Unknown keyword ${id}`)
    return k
  })
}

/** Workbook keywords that name a location but are planned on a service or industry page (they stay there). */
export function serviceCityKeywords(brief: LocationBrief) {
  const rx = LOCATION_WORDS[brief.slug]
  return WORKBOOK_KEYWORDS.filter((k) => rx.test(k.keyword) && !k.plannedPath.startsWith("/locations/") && k.plannedPath !== "/")
}
