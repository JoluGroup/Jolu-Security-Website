// Questionnaire, decision log, source conflicts, snapshots and readiness configuration for the Business Verification Pack.
// DOCUMENTATION ONLY. Management answers are never invented: every response field stays blank until management fills it.
import { ITEMS_ALL, ROLES, PAGES, ALL, SVC, LOC, itemById } from "./items.mjs"

export const PREPARED = "2026-11-19"

/** What was inspected, and at which commit. Branch heads were read with read-only git (fetch into remote-tracking refs, git show, git diff). */
export const SOURCES = {
  parent: { branch: "feature/seo-implementation", sha: "a9dd82047390848d6b077b76b68c9b27dd7fee9b", pr: 4 },
  service: { branch: "feature/seo-service-preparation", sha: "925d7c8819f99c91dac644ca85d3de3b5296cc1e", pr: 5, milestone: "5B.1", dir: "docs/seo/service-pages" },
  location: { branch: "feature/seo-location-preparation", sha: "fe020d0d517089b28a1f8688d1cbfdd0ddab85ee", pr: 6, milestone: "5B.2", dir: "docs/seo/location-pages" },
  workbook: "Jolu_Security_SEO_Keyword.xlsx (sheets read: KEYWORD MASTER, CLUSTER STRATEGY, PAGE MAP & META, 90 DAY ROADMAP, LOCAL SEO, TECHNICAL AUDIT)",
  pdfs: ["public/lovable-uploads/company-profile.pdf (8 pages, read page by page)", "public/lovable-uploads/brochure.pdf (2 pages, read page by page)"],
  files: ["lib/site-config.ts", "lib/claims.ts", "lib/services.ts", "lib/protection-layers.ts", "lib/photo-library.ts", "lib/seo/*", "components/*", "next.config.ts"],
}

// ------------------------------------------------------------------------------------------------------ Decisions
// status: DECIDED (on record), PROPOSED (awaiting final implementation, not applied), OPEN (management decision required).
// sourceRefs lists the earlier decision ids this entry consolidates (5B.1 D1-D10, 5B.2 L-D1 to L-D12).
export const DECISIONS = [
  { id: "DL-01", status: "DECIDED", role: "CEO", title: "One Rongo location page; no Migori page", detail: "Rongo and Migori County share /locations/rongo/. /locations/migori/ is not created. KW-009 and KW-010 are planned on the Rongo page.", basis: "Owner decision, Milestone 5A.1", sourceRefs: [], pages: ["L3"] },
  { id: "DL-02", status: "DECIDED", role: "CEO", title: "Planned pages stay unpublished until evidence and written approval exist", detail: "Default status of every planned page is BLOCKED — EVIDENCE PENDING. No page, route or sitemap entry is added by this pack.", basis: "Standing instruction, Milestones 5B.1, 5B.2 and 5C", sourceRefs: ["5B.2:L1"], pages: ALL },
  { id: "DL-03", status: "PROPOSED", role: "CEO", title: "Move KW-093 'security company in nakuru town' to the Nakuru page", detail: "The workbook maps it to the Nairobi page. Intent is Nakuru. Awaiting final implementation; the production SEO configuration and the workbook are NOT changed.", basis: "Milestone 5B.2 finding, restated in the Milestone 5C instruction", sourceRefs: ["L-D3"], pages: ["L1", "L2"] },
  { id: "DL-04", status: "PROPOSED", role: "CEO", title: "Move KW-094 'private security company in migori' to the Rongo page", detail: "The workbook maps it to the Nairobi page. Intent is Migori, which belongs to the single Rongo page. Awaiting final implementation; nothing is changed now.", basis: "Milestone 5B.2 finding, restated in the Milestone 5C instruction", sourceRefs: ["L-D3"], pages: ["L1", "L3"] },
  { id: "DL-05", status: "PROPOSED", role: "CEO", title: "Move KW-088 'hire security guards in nairobi' to Manned guarding, subject to an intent check", detail: "It is a transactional query that overlaps the manned-guarding page's Nairobi keywords. The move is conditional on a search-intent check. No search-intent check has been done: it needs Search Console or Keyword Planner access that is out of scope. Awaiting verification and final implementation.", basis: "Milestone 5C instruction (replaces the 'keep as secondary' option in 5B.2)", sourceRefs: ["L-D5"], pages: ["L1", "S1"] },
  { id: "DL-06", status: "DECIDED", role: "CEO", title: "No unsupported 'near me' claims; KW-086 and KW-087 stay held", detail: "They are not tied to one office. Both remain claim-sensitive (local presence or proximity) and are not written into copy.", basis: "Standing instruction, Milestone 5C", sourceRefs: [], pages: ["L1"] },
  { id: "DL-07", status: "OPEN", role: "CEO", title: "Which source is authoritative where the website and the legacy PDFs disagree, and what happens to the live PDFs", detail: "Offices, branches, phone numbers and company name differ (see source-conflicts.md). Choose the authoritative source and whether to keep, correct or withdraw the two downloadable PDFs.", basis: "5B.1 D1; 5B.2 L-D1", sourceRefs: ["D1", "L-D1"], pages: ALL },
  { id: "DL-08", status: "OPEN", role: "CEO", title: "Approve the publication order", detail: "Proposed: Wave 1 manned guarding, CCTV, electric fencing with the Nairobi and Nakuru location pages; Wave 2 events, K9, alarm response, VIP and the Rongo page.", basis: "5B.1 D2; 5B.2 L-D10", sourceRefs: ["D2", "L-D10"], pages: ALL },
  { id: "DL-09", status: "OPEN", role: "CEO", title: "May new pages reuse the existing layout, and may the homepage and footer link to them?", detail: "The design is frozen and no page layout has been approved. Linking from the homepage changes frozen components.", basis: "5B.1 D3 and C11; 5B.2 L-D10 and L15", sourceRefs: ["D3", "C11", "L15", "L-D10"], pages: ALL },
  { id: "DL-10", status: "OPEN", role: "OPS", title: "Which services each office provides", detail: "Needed before any place name appears on a service page or a service appears on a location page.", basis: "5B.1 D4; 5B.2 L-D6", sourceRefs: ["D4", "L-D6"], pages: ALL },
  { id: "DL-11", status: "OPEN", role: "LEG", title: "Who is the compliance reviewer, and is licensing wording wanted at all", detail: "Until then no page makes a licensing statement.", basis: "5B.1 D5", sourceRefs: ["D5"], pages: ALL },
  { id: "DL-12", status: "OPEN", role: "CEO", title: "Publish price or cost information?", detail: "Default is no pricing anywhere. Six cost keywords stay held.", basis: "5B.1 D6", sourceRefs: ["D6"], pages: ["S2", "S3"] },
  { id: "DL-13", status: "OPEN", role: "OPS", title: "Which legacy offerings are real: CCTV monitoring, K9 detection, bouncer services, 24/7 alarm response, fire-alert response", detail: "The website offers none of these today; the legacy PDFs do.", basis: "5B.1 D7", sourceRefs: ["D7"], pages: ["S2", "S4", "S5", "S6"] },
  { id: "DL-14", status: "OPEN", role: "CEO", title: "Keep or revise the live layer headlines such as 'Every alarm, answered.'", detail: "Existing approved copy; not changed here.", basis: "5B.1 D8", sourceRefs: ["D8"], pages: ["S1", "S2", "S3", "S4", "S6", "S7"] },
  { id: "DL-15", status: "OPEN", role: "CEO", title: "Do the legacy 'other services' (labour, cleaning and similar) stay out of scope?", detail: "They are not on the website or in the workbook.", basis: "5B.1 D9", sourceRefs: ["D9"], pages: ALL },
  { id: "DL-16", status: "OPEN", role: "LEG", title: "Rights-cleared photos, and what to do about uncleared image files that remain publicly reachable", detail: "Every registered photo has clearance pending; files under public/ stay reachable by URL.", basis: "5B.1 D10", sourceRefs: ["D10"], pages: ALL },
  { id: "DL-17", status: "OPEN", role: "CEO", title: "The single public name for the Rongo / Migori County branch", detail: "The site says 'Migori', the page says 'Rongo'.", basis: "5B.2 L-D2", sourceRefs: ["L-D2"], pages: ["L3"] },
  { id: "DL-18", status: "OPEN", role: "CEO", title: "Which office is head office", detail: "Nairobi in three sources; one brochure caption says 'HQ - Nakuru'.", basis: "5B.2 L-D8", sourceRefs: ["L-D8"], pages: ["L1", "L2"] },
  { id: "DL-19", status: "OPEN", role: "MKT", title: "Map treatment: link out, or embed a third-party map", detail: "An embed needs a privacy review and a deliberate change to the security headers.", basis: "5B.2 L-D9", sourceRefs: ["L-D9"], pages: LOC },
  { id: "DL-20", status: "OPEN", role: "CEO", title: "Name the person at each office who confirms its facts", detail: "The workbook assigns local pages to a copywriter with a local manager.", basis: "5B.2 L-D7", sourceRefs: ["L-D7"], pages: LOC },
  { id: "DL-21", status: "OPEN", role: "CEO", title: "Confirm Eldoret and Kisumu are not current offices and need no pages", detail: "Only the PDFs list them.", basis: "5B.2 L-D11", sourceRefs: ["L-D11"], pages: LOC },
  { id: "DL-22", status: "OPEN", role: "MKT", title: "Approve the unique-content rule for location pages", detail: "Proposal: no more than 30 per cent of sentences shared with a sibling location page.", basis: "5B.2 L-D12", sourceRefs: ["L-D12"], pages: LOC },
  { id: "DL-23", status: "OPEN", role: "MKT", title: "Where, if anywhere, do 'near me' keywords eventually go?", detail: "Only after a verified Google Business Profile and service area exist. Until then DL-06 applies.", basis: "5B.2 L-D4", sourceRefs: ["L-D4"], pages: ["L1"] },
  { id: "DL-24", status: "OPEN", role: "CEO", title: "Authorise implementing the keyword-mapping corrections (DL-03 to DL-05) in the production SEO data", detail: "A later, separately approved milestone. Needs the generated keyword data and its tests updated together.", basis: "Milestone 5C", sourceRefs: [], pages: ["L1", "L2", "L3", "S1"] },
  { id: "DL-25", status: "OPEN", role: "CEO", title: "Final written approval to publish, recorded per page", detail: "One signed approval per page, naming the approver and date, after every blocker in publication-readiness.md is closed.", basis: "5B.2 L1", sourceRefs: ["L1"], pages: ALL },
]

// ------------------------------------------------------------------------------------------------------ Questionnaire
const A = (n, prefix) => ["NBO", "NAK", "RON"].map((c) => `OFF-${c}-${String(n).padStart(2, "0")}`)
const S = (n) => ["MG", "CC", "EF", "EV", "K9", "AR", "VP"].map((c) => `SVC-${c}-${String(n).padStart(2, "0")}`)
export const QUESTIONS = [
  // CEO / management
  { id: "Q-CEO-01", role: "CEO", question: "Which offices and branches are open and active today? The company profile and brochure also list Eldoret and Kisumu; the website lists only Nairobi, Nakuru and the Rongo (Migori) branch.", items: ["COM-04"], decisions: ["DL-21"] },
  { id: "Q-CEO-02", role: "CEO", question: "Which office is the head office? The website, company profile and brochure footer say Nairobi; one brochure caption says 'HQ - Nakuru'.", items: ["COM-03"], decisions: ["DL-18"] },
  { id: "Q-CEO-03", role: "CEO", question: "What exact public name and label should each office use: Nairobi, Nakuru, and the Rongo / Migori County branch (the website says 'Migori', the page would say 'Rongo')?", items: ["OFF-NBO-01", "OFF-NAK-01", "OFF-RON-01"], decisions: ["DL-17"] },
  { id: "Q-CEO-04", role: "CEO", question: "Which phone numbers are official, what is each used for, and does each office have its own public number? (+254 705 038 679 is on the website; +254 769 281 518 is in the company profile.)", items: ["COM-05", "OFF-NBO-05", "OFF-NAK-05", "OFF-RON-05"], decisions: [] },
  { id: "Q-CEO-05", role: "CEO", question: "Is P.O. Box 7161-00200, Nairobi (company profile) current, and may it be shown publicly?", items: ["COM-08"], decisions: [] },
  { id: "Q-CEO-06", role: "CEO", question: "Confirm JOLU SECURITY, in capitals, as the public brand. Should 'Jolu Group' ever appear publicly?", items: ["COM-02"], decisions: [] },
  { id: "Q-CEO-07", role: "CEO", question: "Who at each office (Nairobi, Nakuru, Rongo) can confirm the office's address, hours, services and signage?", items: A(7), decisions: ["DL-20"] },
  { id: "Q-CEO-08", role: "CEO", question: "Which clients agree to be named, quoted or described in a case study? Give written permission for each.", items: ["CNT-04", "CNT-05", "CNT-06", "CLM-05"], decisions: [] },
  { id: "Q-CEO-09", role: "CEO", question: "When did the company start operating? (Registration date or first contract.)", items: ["CLM-06"], decisions: [] },
  { id: "Q-CEO-10", role: "CEO", question: "Is there independent proof (an award, ranking or published review) for any 'best', 'top' or 'professional' wording? If not, drop it.", items: ["CLM-12"], decisions: [] },
  { id: "Q-CEO-11", role: "CEO", question: "Do you want prices or cost guides published? If yes, who validates the ranges?", items: ["CNT-07"], decisions: ["DL-12"] },
  { id: "Q-CEO-12", role: "CEO", question: "Keep, soften or replace the live headlines such as 'Every alarm, answered.' and 'Every perimeter, defended.'?", items: ["CLM-09"], decisions: ["DL-14"] },
  { id: "Q-CEO-13", role: "CEO", question: "Who may approve a public claim, and where is the approval recorded?", items: ["CMP-06"], decisions: ["DL-25"] },
  { id: "Q-CEO-14", role: "CEO", question: "For each of the seven services: which claims (24/7, trained, licensed, and so on) may be published? Until evidence is supplied the answer is 'none'. Confirm or approve with evidence.", items: S(5), decisions: [] },
  { id: "Q-CEO-15", role: "CEO", question: "Where the website and the company profile or brochure disagree, which is correct? Keep, correct or withdraw the two downloadable PDFs?", items: [], decisions: ["DL-07", "DL-15"] },
  { id: "Q-CEO-16", role: "CEO", question: "Approve the publication order (manned guarding, CCTV and electric fencing, with Nairobi and Nakuru; then the rest, with Rongo), and say whether new pages may reuse the existing layout and be linked from the homepage and footer.", items: [], decisions: ["DL-08", "DL-09"] },
  { id: "Q-CEO-17", role: "CEO", question: "Approve three keyword corrections for a later implementation: KW-093 to Nakuru, KW-094 to Rongo, and KW-088 to Manned guarding once its search intent is checked.", items: [], decisions: ["DL-03", "DL-04", "DL-05", "DL-24"] },
  // Security operations
  { id: "Q-OPS-01", role: "OPS", question: "Complete the coverage table: for each of the seven services, which office delivers it and in which counties and towns? For each office, which areas does it serve and not serve (does Rongo serve Migori town? does Nakuru provide K9 or training?). Is 'across Kenya' accurate?", items: [...S(2), ...A(6), ...A(10), "CLM-11"], decisions: ["DL-10"] },
  { id: "Q-OPS-02", role: "OPS", question: "Complete a one-page scope sheet for each service: what is included, how it is delivered, what is excluded. Manned guarding: posts, patrols, shifts, supervision, premises types. CCTV: survey to handover, monitoring, maintenance, warranty. Electric fencing: survey to handover, property types, maintenance. Events: event types and sizes, roles (including door staff), lead time. K9: what teams do, alone or with guarding. Alarm response: who responds, from where, how alarms reach them, compatible systems. VIP: who it serves, what it covers, confidentiality.", items: S(1), decisions: ["DL-13"] },
  { id: "Q-OPS-03", role: "OPS", question: "What training, vetting and qualifications do guards, dog handlers, installers, responders and close-protection staff hold? Provide the records.", items: [...S(3), "CLM-03"], decisions: [] },
  { id: "Q-OPS-04", role: "OPS", question: "Do you offer 24-hour guarding or alarm response? On which services, and what response times do you actually achieve and how are they measured?", items: ["CLM-02"], decisions: [] },
  { id: "Q-OPS-05", role: "OPS", question: "Which CCTV and electric-fence equipment brands or types do you install?", items: ["CLM-04"], decisions: [] },
  { id: "Q-OPS-06", role: "OPS", question: "How many guards are currently deployed? (A dated headcount from payroll or rosters.)", items: ["CLM-07"], decisions: [] },
  { id: "Q-OPS-07", role: "OPS", question: "Name the operations person who signs off each of the seven service pages.", items: S(7), decisions: [] },
  { id: "Q-OPS-08", role: "OPS", question: "Confirm each of the seven one-sentence service descriptions on the website is accurate.", items: ["CNT-01"], decisions: [] },
  // Branch representatives
  { id: "Q-BR-01", role: "BR", question: "For your office: the full physical address as on your signage (with a photo of the signage), and the landmark or directions you give customers. Nakuru: the website says West Road, opposite Nakuru Athletics, next to Evans Hospital; the company profile says KFA Building, Geoffrey Kamau Avenue. Which is current?", items: [...A(2), ...A(3)], decisions: [] },
  { id: "Q-BR-02", role: "BR", question: "What are your office's opening days and hours, including holidays and whether visits are by appointment?", items: A(4), decisions: [] },
  { id: "Q-BR-03", role: "BR", question: "Which map link or pin do customers use to find your office?", items: A(8), decisions: ["DL-19"] },
  { id: "Q-BR-04", role: "BR", question: "Nakuru only: what is the 'showroom', what can visitors see, and when is it open?", items: ["OFF-NAK-11"], decisions: [] },
  // Compliance / legal
  { id: "Q-LEG-01", role: "LEG", question: "What is the company's exact registered name and registration number? (The PDFs show five different forms.)", items: ["COM-01"], decisions: [] },
  { id: "Q-LEG-02", role: "LEG", question: "Provide the PSRA registration or licence: holder, number, issue and expiry dates, which services it covers, and whether it applies per branch. If none applies, say so.", items: ["CMP-01", "CMP-02", "CMP-03", "CMP-04", "CLM-01"], decisions: ["DL-11"] },
  { id: "Q-LEG-03", role: "LEG", question: "For each of the seven services, is any other licence, permit or regulation specific to it? Consider electric fences, guard dogs and detection work, CCTV recording, door staff, and armed or unarmed protection.", items: S(4), decisions: [] },
  { id: "Q-LEG-04", role: "LEG", question: "Does legal confirm the company may lawfully advertise and provide each of the seven services, and on what conditions?", items: ["CMP-05"], decisions: [] },
  { id: "Q-LEG-05", role: "LEG", question: "Is there an approved privacy notice and data-protection position for the enquiry form and for any analytics?", items: ["CMP-07"], decisions: [] },
  { id: "Q-LEG-06", role: "LEG", question: "Do we hold written consent from every person photographed, the photographers' permission and venue permission? What should happen to uncleared image files that are still publicly reachable?", items: ["CNT-03"], decisions: ["DL-16"] },
  { id: "Q-LEG-07", role: "LEG", question: "Which statements in the two PDFs are true and may stay public, and which must be corrected or withdrawn? Key ones: 24/7 and immediate response; explosives and narcotics detection; bouncer services; regulatory compliance; defence, energy, financial, diplomatic and international clients; operations in several countries.", items: ["CLM-10"], decisions: [] },
  // Marketing / IT
  { id: "Q-MKT-01", role: "MKT", question: "Does each office have a Google Business Profile? Who owns each, and what name, category and address does it show? (Never share passwords.)", items: [...A(9), "DIG-01"], decisions: [] },
  { id: "Q-MKT-02", role: "MKT", question: "Is there a Search Console property for www.jolusecurity.com, and who administers it?", items: ["DIG-02"], decisions: [] },
  { id: "Q-MKT-03", role: "MKT", question: "Is analytics (GA4) set up, and do quote-form, call and WhatsApp events work? Can a test lead be traced?", items: ["DIG-03"], decisions: [] },
  { id: "Q-MKT-04", role: "MKT", question: "Who is the registrant and DNS administrator for jolusecurity.com?", items: ["COM-07"], decisions: [] },
  { id: "Q-MKT-05", role: "MKT", question: "Share a crawl or redirect check of the live site: does the bare domain redirect to www, is HTTPS enforced, and which URLs exist today (including any /locations or /services pages)?", items: ["DIG-05", "DIG-08"], decisions: [] },
  { id: "Q-MKT-06", role: "MKT", question: "Is info@jolusecurity.com monitored, who answers enquiries, and how fast? Do offices have their own addresses?", items: ["COM-06", "CLM-08"], decisions: [] },
  { id: "Q-MKT-07", role: "MKT", question: "List existing map links, directories and listings with the name, address and phone each shows.", items: ["DIG-04"], decisions: [] },
  { id: "Q-MKT-08", role: "MKT", question: "Which social profiles are official, and who manages them?", items: ["DIG-07"], decisions: [] },
  { id: "Q-MKT-09", role: "MKT", question: "Who will run the Keyword Planner and Search Console exports the workbook marks 'Not validated'?", items: ["DIG-06"], decisions: [] },
  { id: "Q-MKT-10", role: "MKT", question: "Which real photos exist of each service and each office exterior, who took them, and where are the consents?", items: [...S(6), "CNT-02"], decisions: [] },
  { id: "Q-MKT-11", role: "MKT", question: "Who reviews each page for original text, and do you accept the proposed rule that no more than 30 per cent of sentences may be shared between location pages?", items: ["CNT-10"], decisions: ["DL-22", "DL-23"] },
]

/** Pages a question can unblock: pages where a linked item blocks publication, or a linked decision applies. */
export function questionPages(q) {
  const pages = new Set()
  for (const id of q.items) {
    const item = itemById(id)
    if (item.impact === "BLOCKS PUBLICATION") for (const p of item.pages) pages.add(p)
  }
  for (const id of q.decisions) {
    const d = DECISIONS.find((x) => x.id === id)
    if (q.items.length === 0 && d) for (const p of d.pages) pages.add(p)
  }
  return [...pages].sort()
}

// ------------------------------------------------------------------------------------------------------ Source conflicts
// Never resolved here: `status` stays OPEN and no source is chosen.
export const CONFLICTS = [
  { id: "SC-01", topic: "Nakuru office address", a: "Website (lib/site-config.ts): 'Along West Road, Opposite Nakuru Athletics, Next to Evans Hospital, Nakuru, Kenya'", b: "company-profile.pdf cover: 'Regional Office: Nakuru (KFA Building, Along Geoffrey Kamau Avenue)'", pages: ["L2"], items: ["OFF-NAK-02", "OFF-NAK-03"], resolver: "Branch representatives (Nakuru), confirmed by CEO / management" },
  { id: "SC-02", topic: "Second phone number", a: "Website: 0705 038 679 (+254 705 038 679)", b: "company-profile.pdf back cover: +254 769 281 518. The brochure shows only 0790 298 003.", pages: ALL, items: ["COM-05", "OFF-NBO-05", "OFF-NAK-05", "OFF-RON-05"], resolver: "CEO / management" },
  { id: "SC-03", topic: "Company name", a: "Website: 'Jolu Security' (display), 'JOLU SECURITY' (approved brand). Workbook: 'Jolu Group Security'.", b: "PDFs: 'JOLU GROUP LTD SECURITY', 'Jolu Group Security Limited', 'Jolu Group Ltd.', 'JOLU GROUP SECURITY LTD', 'Jolu Group Security Ltd.'", pages: ALL, items: ["COM-01", "COM-02"], resolver: "Compliance / legal (registered name); CEO / management (public brand)" },
  { id: "SC-04", topic: "Active branches", a: "Website and workbook LOCAL SEO: Nairobi, Nakuru, Migori (Rongo)", b: "Both PDFs: Nairobi, Nakuru, Eldoret, Kisumu, Migori", pages: LOC, items: ["COM-04", "CNT-09"], resolver: "CEO / management" },
  { id: "SC-05", topic: "Head office / HQ", a: "Website, company profile and brochure footer: Nairobi is the head office / HQ", b: "Brochure photo caption: 'training sessions at the HQ - Nakuru'. The K9 training photo is captioned 'Nairobi'.", pages: ["L1", "L2"], items: ["COM-03", "OFF-NBO-01"], resolver: "CEO / management" },
  { id: "SC-06", topic: "Rongo / Migori name", a: "Website office record: 'Migori', address 'Near KENGAS Rongo, Migori, Kenya'", b: "Page, URL and workbook: 'Rongo'. PDFs: 'Migori' branch. Owner decision 5A.1: one page, /locations/rongo/.", pages: ["L3"], items: ["OFF-RON-01"], resolver: "CEO / management" },
  { id: "SC-07", topic: "CCTV scope", a: "Website: 'Supply and installation of CCTV camera systems.'", b: "PDFs: 'continuous monitoring', 'state-of-the-art technology'", pages: ["S2"], items: ["SVC-CC-01"], resolver: "Security operations" },
  { id: "SC-08", topic: "K9 scope", a: "Website: 'Dog and handler teams as part of a site's security arrangements.'", b: "PDFs: 'highly trained dogs', 'detecting explosives or narcotics'", pages: ["S5"], items: ["SVC-K9-01"], resolver: "Security operations, with Compliance / legal" },
  { id: "SC-09", topic: "Events security scope", a: "Website: 'Security personnel for public and private events.'", b: "PDFs: 'professional bouncer services', 'gatherings of all sizes', 'exceptional'", pages: ["S4"], items: ["SVC-EV-01"], resolver: "Security operations" },
  { id: "SC-10", topic: "Alarm response scope", a: "Website: 'Response to alarm activations.' and the live headline 'Every alarm, answered.'", b: "PDFs: 'on standby 24/7', 'respond immediately', 'fire alerts', 'swift and reliable'", pages: ["S6"], items: ["SVC-AR-01", "CLM-09", "CLM-02"], resolver: "Security operations" },
  { id: "SC-11", topic: "VIP close protection scope and clients", a: "Website: 'Personal protection for individuals and their movements.'", b: "PDFs: 'elite', 'highly trained', 'executives, and dignitaries'; company profile: high-net-worth clients, diplomatic missions, international organisations", pages: ["S7"], items: ["SVC-VP-01", "CLM-10"], resolver: "Security operations, with Compliance / legal" },
  { id: "SC-12", topic: "Manned guarding premises", a: "Website client categories: Estates, Events, Residential communities, Churches, Schools, Businesses", b: "PDFs: apartments, gas stations, residential estates, churches 'and other facilities'", pages: ["S1"], items: ["SVC-MG-01"], resolver: "Security operations" },
  { id: "SC-13", topic: "Company scope", a: "Website: seven security services; no other offering", b: "Company profile: logistics, procurement and training; defence, energy and financial sectors; 'operations, offices and operational rooms in several countries'; cleaning, gardening, labour and other services", pages: ALL, items: ["CLM-10"], resolver: "CEO / management, with Compliance / legal" },
  { id: "SC-14", topic: "Claims in the PDFs against the claims registry", a: "lib/claims.ts: all eight claims needs-evidence; none renders on the site", b: "PDFs make claims the registry marks needs-evidence: 24/7, trusted, trained, state-of-the-art, regulatory compliance, 'top-quality service at a competitive price'", pages: ALL, items: ["CLM-01", "CLM-02", "CLM-03", "CLM-05", "CLM-10", "CLM-12"], resolver: "Compliance / legal and CEO / management" },
  { id: "SC-15", topic: "Coverage wording", a: "Website: 'Security services across Kenya.'; homepage title 'Security Companies in Kenya'; planned service titles end 'in Kenya'", b: "No coverage record exists. PDFs say operations in 'several countries'; brochure photo captions place work in Kamulu (Machakos County) and Naivasha.", pages: ALL, items: ["CLM-11", ...S(2)], resolver: "Security operations" },
  { id: "SC-16", topic: "Keyword mapping: KW-093 and KW-094", a: "Workbook maps both to /locations/nairobi/", b: "KW-093 is about Nakuru; KW-094 is about Migori. Proposed: Nakuru and Rongo (DL-03, DL-04).", pages: ["L1", "L2", "L3"], items: [], resolver: "CEO / management (approve), SEO implementation (later milestone)" },
  { id: "SC-17", topic: "Keyword mapping: KW-088", a: "Workbook maps 'hire security guards in nairobi' to /locations/nairobi/", b: "It overlaps the manned-guarding page's Nairobi keywords. Proposed: Manned guarding, subject to an intent check (DL-05).", pages: ["L1", "S1"], items: [], resolver: "CEO / management and Marketing / IT" },
  { id: "SC-18", topic: "'Near me' keywords", a: "Workbook maps KW-086 and KW-087 to /locations/nairobi/", b: "A 'near me' query is not about one office, and it implies a verified local office. Held; not written into copy (DL-06).", pages: ["L1"], items: ["OFF-NBO-09"], resolver: "Marketing / IT" },
  { id: "SC-19", topic: "Web address form and brand in the workbook", a: "Workbook: URLs end with '/'; draft titles end 'Jolu Group Security'", b: "Live site: no trailing slash; approved brand 'JOLU SECURITY'. The planned documents already use the live form.", pages: ALL, items: ["DIG-05", "COM-02"], resolver: "Marketing / IT" },
  { id: "SC-20", topic: "Provenance of the office data", a: "lib/site-config.ts: 'Office locations follow the Jolu Machineries production footer, per the CEO's direction.'", b: "The office text on the website therefore comes from a sister company's website, not from the offices themselves. It cannot count as independent verification.", pages: LOC, items: ["OFF-NBO-02", "OFF-NAK-02", "OFF-RON-02"], resolver: "Branch representatives" },
  { id: "SC-21", topic: "Document dates", a: "brochure.pdf metadata: created 21 July 2025; shows one phone number", b: "company-profile.pdf metadata: created 21 April 2026; shows two phone numbers and five branches. Creation dates do not prove which document is current.", pages: ALL, items: ["COM-05", "COM-04"], resolver: "CEO / management" },
]

/** Single-source details: not conflicts, not verified. */
export const SINGLE_SOURCE = [
  { topic: "Postal address 'P.O Box 7161-00200, Nairobi'", source: "company-profile.pdf back cover only", items: ["COM-08"] },
  { topic: "Social handle '@jolugroupsecurity' and Facebook, Instagram and TikTok icons", source: "brochure.pdf footer only", items: ["DIG-07"] },
  { topic: "Photo captions placing work at Kamulu (Machakos County), Naivasha, and K9 training in Nairobi", source: "brochure.pdf only", items: ["SVC-CC-02", "SVC-EV-02"] },
  { topic: "'Showroom' at the Nakuru office", source: "lib/site-config.ts label only", items: ["OFF-NAK-11"] },
]

/** Earlier statements in the preparation documents that this review found to be incomplete or wrong. PR #5 and PR #6 are NOT modified by this milestone. */
export const CORRECTIONS = [
  { where: "5B.2 (PR #6): nap-verification-checklist.md and briefs; page-architecture.md; priority-plan.md", said: "No postal code or P.O. box is held in the repository.", found: "company-profile.pdf, which is in the repository, prints 'P.O Box 7161-00200, NAIROBI' (back cover). It is not on the website or in site-config.", effect: "Recorded as COM-08 (PROVISIONAL, single source)." },
  { where: "5B.2 (PR #6): evidence item NBO2 and decision L-D8; NAK3", said: "A brochure caption beside a K9 training photo names Nakuru as 'HQ'.", found: "On the brochure page the caption 'sessions at the HQ - Nakuru' belongs to the guard-training photo; the K9 handler training photo is captioned 'Nairobi'. The brochure footer says 'Nairobi (HQ)'.", effect: "SC-05 uses the corrected reading. The conflict remains but is milder: one caption against three sources." },
  { where: "5B.1 and 5B.2: both PDF comparisons", said: "The PDFs were compared for office, name and phone differences.", found: "They also hold claims about international operations, diplomatic and defence clients, logistics and procurement, and a competitive-price claim, and name photo locations in Kamulu and Naivasha.", effect: "Added as SC-13, SC-14, SC-15 and CLM-10." },
]

// ------------------------------------------------------------------------------------------------------ Snapshots of the preparation documents' ids
// Verified against the two branches by verify-sources.mjs (read-only git). The tests use the committed JSON.
export const READINESS_STATUS = "BLOCKED — EVIDENCE PENDING"
export const APPROVERS = {
  service: "Security operations (scope, coverage, limits), Compliance / legal (licensing and claims), CEO / management (final approval)",
  location: "Branch representatives (office facts), Security operations (services and coverage), CEO / management (final approval)",
}
export const LOCATION_CLAIM_RISKS = {
  nairobi: "KW-082 'top security companies' (superlative); KW-086 and KW-087 'near me' (proximity); 'Head Office' wording (COM-03); 'across Kenya' coverage wording; any 'Nairobi-wide' area claim.",
  nakuru: "'Showroom' wording; the 'HQ - Nakuru' caption; any statement that Nakuru provides K9 or training; 'across Kenya' coverage wording.",
  rongo: "Whether Migori town is served; KW-009, KW-010 and KW-094 target Migori; branch naming; 'across Kenya' coverage wording.",
}
export { ROLES, PAGES, ALL, SVC, LOC, ITEMS_ALL }
