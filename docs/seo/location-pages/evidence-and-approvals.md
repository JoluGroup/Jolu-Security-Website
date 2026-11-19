# Evidence and approvals needed before publication

## Common evidence (every location page)

| ID | Requirement | Owner | Blocks |
| --- | --- | --- | --- |
| L1 | Written owner approval to publish a page for this office, naming the approver and date. The workbook gates every location page on unique content and a verified service area. | Owner | publication |
| L2 | Verified NAP: exact business name, full address (street or building, not only an estate or landmark), and phone number for this office, matching website, Google Business Profile, directories and signage (LOCAL SEO: 'Verify exact office NAP'). Evidence log entry per field. | Local manager | publication |
| L3 | Opening hours confirmed by the local manager, including days, holidays and whether visits are by appointment. Office hours are not the same as service availability, which stays a held claim (registry 'availability-24-7'). Until confirmed, no hours are shown or marked up. | Local manager | claim |
| L4 | Real service area: the towns, estates or areas this office actually serves and any it does not, written by the local manager. No radius, travel-time or response-time statement without separate evidence. | Operations | publication |
| L5 | Which of the seven approved services (manned guarding, events security, K9 unit, CCTV installation, electric fencing, alarm response, VIP close protection) this office provides or arranges. Nothing in the repository states this per office. | Operations | publication |
| L6 | Google Business Profile for this office: ownership verified, category and name matching the NAP, and confirmation the office is an eligible location (LOCAL SEO: 'Only use actual eligible office locations'). The profile URL is used in markup only after verification. | Local SEO lead | claim |
| L7 | Phone number(s) to show for this office. The site shows two company-wide numbers; the legacy company-profile PDF shows a different second number. Decide whether the office has its own line or shares the company numbers. | Owner | publication |
| L8 | PSRA registration position (registry claim 'licensed-compliant'). Required only if the page is to mention licensing; until evidenced the page makes no licensing statement and no licence markup. | Compliance reviewer | claim |
| L9 | Rights-cleared office or team photos. Every entry in lib/photo-library.ts has clearance pending, so no photo may appear and no image property may be marked up. | Owner | section |
| L10 | Local proof (testimonials, named clients, case studies) only with written consent from the client. None exists in the repository. Reviews are a separate workstream and are never incentivised or gated (LOCAL SEO: 'Reputation'). | Owner | section |
| L11 | Map decision: link out to a map (no third-party code) or embed one (third-party frame; needs a privacy review and a change to the security headers in next.config.ts). Either needs the verified address first. | Developer | section |
| L12 | Conversion tracking that attributes calls, WhatsApp and quote requests to this page (TECHNICAL AUDIT: 'Conversion tracking'). Test leads attributed correctly before launch. | SEO lead | publication |
| L13 | Live crawl and redirect check for any existing /locations URL, including /locations/migori, before the new URL goes live (PAGE MAP caution: 'Audit existing URL'). No Migori page is created. | SEO lead | publication |
| L14 | Editor sign-off that the page passes the unique-content gate and is not a doorway page: the body differs from the sibling location pages and carries facts only this office can supply (TECHNICAL AUDIT: 'No duplicated doorway content'). | Editor | publication |
| L15 | Owner approval of the page layout. The visual design is frozen; the page may only reuse existing primitives until a layout is approved. | Owner | publication |

## Office-specific evidence

| Page | ID | Requirement | Owner | Blocks |
| --- | --- | --- | --- | --- |
| Nairobi | NBO1 | The site's address, 'Thome, Nairobi, Kenya', names an area, not a street or building. Obtain the full address the office uses on signage and with Google Business Profile. | Local manager | publication |
| Nairobi | NBO2 | Confirm 'Head Office' is the correct current label. The company-profile PDF says 'Head Offices, Located at Thome Estate'; a brochure caption beside a K9 training photo names Nakuru as 'HQ'. Resolve which office is head office before the page uses the word. | Owner | claim |
| Nairobi | NBO3 | Decide whether 'near me' keywords (KW-086, KW-087) are tied to Nairobi. They cannot be tied to one office until the Google Business Profile exists and the service area is verified. | SEO lead | claim |
| Nairobi | NBO4 | Evidence for any 'top' or 'best' wording before KW-082 is used; until then the keyword is held. | Owner | claim |
| Nakuru | NAK1 | ADDRESS CONFLICT. The site says 'Along West Road, Opposite Nakuru Athletics, Next to Evans Hospital'. The legacy company-profile PDF says 'KFA Building, Along Geoffrey Kamau Avenue'. Establish which is the current address (or whether the office moved) before either is repeated on a page. | Local manager | publication |
| Nakuru | NAK2 | What the 'Showroom' in the approved label 'Regional Office & Showroom' contains and whether it is open to visitors and at what hours. Nothing in the repository describes it. | Local manager | section |
| Nakuru | NAK3 | Whether the Nakuru office provides K9 services or training. The brochure shows K9 handler training captioned 'HQ - Nakuru'; this is not a statement about service availability and must not be repeated unconfirmed. | Operations | claim |
| Rongo, Migori County | RON1 | NAME MISMATCH. lib/site-config.ts calls this office 'Migori' (address 'Near KENGAS Rongo, Migori, Kenya') while the page, URL and workbook say Rongo. NAP must match everywhere, so the owner must decide the single public name (for example 'Rongo, Migori County') and use it on the site, Google Business Profile and signage. | Owner | publication |
| Rongo, Migori County | RON2 | 'Near KENGAS Rongo' is a landmark, not a street address. Obtain the full address the branch uses on signage and with Google Business Profile. | Local manager | publication |
| Rongo, Migori County | RON3 | Whether the branch serves Migori town itself or only Rongo and its surroundings. KW-009, KW-010 and KW-094 target Migori; the page may use them only if Migori is genuinely served. | Operations | claim |
| Rongo, Migori County | RON4 | The legacy company-profile PDF lists branches in Eldoret and Kisumu that appear nowhere on the site or in the workbook's LOCAL SEO sheet. Confirm they are not current offices; no page is planned for them. | Owner | section |

## Discrepancies between the website and the legacy PDFs

The PDFs are linked from the live site (`/lovable-uploads/company-profile.pdf`, `/lovable-uploads/brochure.pdf`).

| Item | Website (lib/site-config.ts) | Legacy PDF |
| --- | --- | --- |
| Nakuru address | Along West Road, Opposite Nakuru Athletics, Next to Evans Hospital, Nakuru, Kenya | Company profile: KFA Building, Along Geoffrey Kamau Avenue |
| Second phone number | 0705 038 679 | Company profile: +254 769 281 518 |
| Other branches | Nairobi, Nakuru, Migori only | Company profile: Eldoret, Migori and Kisumu |
| Company name | JOLU SECURITY | Company profile: JOLU GROUP SECURITY LIMITED (header), JOLU GROUP LTD SECURITY (cover) |
| Head office | Nairobi: Head Office | Company profile: Nairobi, Thome Estate. A brochure caption beside K9 training photos names Nakuru as 'HQ' (verify on the page itself) |

## Owner decisions

| ID | Decision | Why it matters |
| --- | --- | --- |
| L-D1 | Which source is authoritative for office addresses, phone numbers and the company name: the website (lib/site-config.ts) or the legacy company-profile and brochure PDFs? | They disagree on the Nakuru address, the second phone number and the company name, and the PDFs list Eldoret and Kisumu branches the site does not. |
| L-D2 | The single public name for the Rongo / Migori County branch (the site says 'Migori', the page says 'Rongo'). | NAP must match on the website, Google Business Profile and signage. The page is /locations/rongo/ and there is no Migori page. |
| L-D3 | Approve moving KW-093 (security company in nakuru town) to the Nakuru page and KW-094 (private security company in migori) to the Rongo page. | The workbook maps both to the Nairobi page. Targeting them there would be a mismatch and cannibalise the real location pages. |
| L-D4 | Where 'near me' keywords (KW-086, KW-087) go, if anywhere, until a verified Google Business Profile and service area exist. | They are held as claim-sensitive, and a 'near me' query is not about one office. |
| L-D5 | Whether KW-088 (hire security guards in nairobi) stays as a secondary keyword on the Nairobi page or moves to manned guarding. | It overlaps the manned-guarding page's Nairobi keywords. |
| L-D6 | Which of the seven services each office provides or arranges. | Nothing in the repository says. The pages list only confirmed services. |
| L-D7 | Who is the local manager for each office and will confirm hours, service area, showroom and signage evidence. | The workbook assigns local pages to 'Copywriter + local manager'. |
| L-D8 | Which office is head office: Nairobi (site, company profile) or Nakuru (a brochure caption says 'HQ - Nakuru'). | The page may use 'Head Office' only once resolved. |
| L-D9 | Map treatment: link out, or embed a third-party map. | An embed needs a privacy review and a deliberate change to the security headers. |
| L-D10 | Approve the order (Nairobi and Nakuru first, Rongo after), the layout reuse, and any homepage change that links to the new pages. | The design is frozen; the homepage offices block currently has no links. |
| L-D11 | Confirm Eldoret and Kisumu are not current offices and need no pages. | The workbook's LOCAL SEO sheet lists only Nairobi, Nakuru and Rongo / Migori. |
| L-D12 | Approve the proposed unique-content gate (no more than 30 per cent of sentences shared with a sibling page). | The threshold is a proposal for the SEO lead to confirm or change. |
