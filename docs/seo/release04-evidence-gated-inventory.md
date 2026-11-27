# Release 04 evidence-gated content inventory

Everything below is **withheld** because the evidence that would allow it does not exist in the repository. Nothing was published and no evidence-ledger entry was added: `lib/seo/evidence-ledger.ts` is empty, `lib/seo/publication-manifest.ts` is empty, every claim in `lib/claims.ts` is `needs-evidence` and every office in `lib/offices.ts` is `needs-evidence`.

Evidence ids (`SVC-*`, `COM-*`, `OFF-*`, `CMP-*`, `CNT-*`, `CLM-*`, `DIG-*`) are the Business Verification register ids already used by `lib/seo/publication-requirements.ts`. A ledger entry needs: status `VERIFIED`, a named verifier, an independent document (never website configuration or a legacy PDF), a verification date, an expiry for licence evidence, and the right scope.

## A. Seven service pages (built, tested, unpublished)

Content: `lib/seo/service-content.ts` (drafts from AEO briefs C01-C07). Sections: `lib/seo/service-sections.ts`. Components: `components/aeo/*`. Rendered through `PublishedPage` only when the gate has published the record and its sections equal the content's sections.

| Page | Brief | Required evidence (canonical table) | Brief's own "proof needed" |
| --- | --- | --- | --- |
| `/services/manned-guarding` | C01 | COM-05, CNT-10, SVC-MG-01, SVC-MG-02, SVC-MG-07, CMP-05, CNT-01 | pricing disclosure decision; verified supervision and training claims |
| `/services/cctv-installation` | C02 | same common set + SVC-CC-01, SVC-CC-02, SVC-CC-07 | approved equipment brands and warranty terms; compliance review of the privacy section |
| `/services/electric-fencing` | C03 | common + SVC-EF-01, -02, -07 | pricing disclosure decision; approved equipment specifications |
| `/services/events-security` | C05 | common + SVC-EV-01, -02, -07 | approved examples; client permission for any named event |
| `/services/k9-unit-services` | C06 | common + SVC-K9-01, -02, -07 | verified handler training and welfare standards |
| `/services/alarm-response` | C04 | common + SVC-AR-01, -02, -07 | operations confirmation of any response commitment |
| `/services/vip-close-protection` | C07 | common + SVC-VP-01, -02, -07 | approved credentials only |

Release 04B: the canonical table now holds content evidence only (`docs/seo/release04b-gate-dispositions.md`); CMP-07, CLM-10, DIG-05 and DIG-08 moved to the production release gate and DIG-02, DIG-03 to the post-launch queue. Every item in the common set must be VERIFIED and unexpired, plus the owner's written authorisation, editorial and compliance reviews carrying the content digest, and a manifest entry with a real route file (`app/services/<slug>/page.tsx` from the canonical template in `tests/helpers/manifest-routes.mjs`).

### Wording the gate refuses until a reviewer approves a scoped claim

Release 04A result, kept for the record. Release 04B corrected the page pricing rule (plain commercial words are allowed; pricing claims stay blocked), and in the same synthetic world six drafts now pass unchanged and manned guarding is refused only for the regulator sentence (`tests/seo/service-pages.test.mjs`, "gate readiness"). At Release 04A the ONLY refusal reasons were claim-sensitive wording:

| Page | Categories flagged |
| --- | --- |
| manned guarding | pricing; licensing (the sentence about the Private Security Regulation Act and PSRA) |
| CCTV installation | pricing |
| electric fencing | pricing |
| events security | pricing |
| K9 unit services | pricing |
| alarm response | pricing |
| VIP close protection | pricing |

What unlocks it:

1. **Pricing words** (resolved in Release 04B: the bare words are no longer treated as a pricing claim; a real price still needs a pricing decision and a scoped claim) ("cost", "price", "quotation", "how much"). These describe what drives a budget and promise no figure. `lib/seo/claim-scope.ts` has no claim whose scope covers the pricing category, so the gate cannot accept this wording at all. Decision needed from the owner and compliance: register a scoped claim such as "pricing explainer, no figures" in `lib/claims.ts` with its evidence (this is the "pricing disclosure decision" the briefs ask for), add its scope in `claim-scope.ts`, then bind it to the statements in each page's sections. If management would rather avoid the claim entirely, reword to "budget" and "written proposal" (the tests include a scrubbed-wording control that proves the pages then pass).
2. **Regulator reference** (manned guarding). The only licensing claim today, `licensed-compliant`, would assert that JOLU SECURITY is licensed. It must NOT be used for a sentence that merely names the regulator. A separate reference-only claim, or removal of the sentence, is needed.
3. **Process statements** ("a written quotation after a site assessment", the assessment steps). The page labels them as the process JOLU SECURITY proposes. Operations must confirm the process before publication; until then they are proposals and the label stays.

### Statements deliberately not made (and what would allow them)

| Not stated | Evidence that unlocks it |
| --- | --- |
| any price, rate, indicative range, rate card | written pricing-disclosure decision by management; then a pricing evidence entry |
| licensed, registered, certified, PSRA number, "compliant" | VERIFIED CMP-01..CMP-04 / CLM-01 (licence evidence with expiry), a PSRA directory check logged, approved claim `licensed-compliant` and per-statement approvals |
| years in operation, guard numbers, client counts | approved `years-operating` / `guards-deployed` / `trusted-by-clients` claims with documents |
| 24-hour operations, response times, supervision arrangements | operations confirmation in writing, approved `availability-24-7` / `reply-time` claims; for alarm response a documented, tested procedure |
| staff, handler or officer qualifications; dog welfare standards | training records and welfare policy reviewed by a named verifier (SVC-K9-*, SVC-VP-*, CMP-05) |
| warranty or guarantee terms, equipment brands | approved equipment and warranty schedule (SVC-CC-*, SVC-EF-*) |
| coverage areas, branches, offices, named clients or events | OFF-* evidence (below), client written permission |
| operational photography | photo clearance record in `lib/photo-library.ts` plus subject and client consent |
| K9 and VIP tactics, routes, schedules, protected persons | never published |

## B. Location pages (Nairobi, Nakuru, Rongo / Migori): keyword opportunities only

Typed support: `lib/seo/location-support.ts` (`getLocationOpportunities`, `eligibleLocalBusinessLocations`). Records stay unpublished with no NAP and no coverage.

| Page | Required evidence | Also required |
| --- | --- | --- |
| `/locations/nairobi` | common set + OFF-NBO-01 (name), -02 (address), -05 (phone), -06 (services), -07, -10 (areas) | NAP values equal to the attested values; COM-03 only if "Head Office" wording is used |
| `/locations/nakuru` | common set + OFF-NAK-01, -02, -05, -06, -07, -10 | OFF-NAK-11 only for "Regional Office & Showroom" |
| `/locations/rongo` | common set + OFF-RON-01, -02, -05, -06, -07, -10 | the office record is named Migori; Migori is covered by this page only if OFF-RON-10 verifies it |

- A town is **not** coverage. Do not publish "we serve ..." text without the areas evidence (OFF-*-10) for that office.
- No address, hours, branch information or showroom wording may be copied from the JOLU Machineries site.
- Google Business Profile eligibility (staffed address) is a precondition for LocalBusiness markup. LocalBusiness is emitted only for a gate-published location with attested NAP; today none exists.
- Reconciled keyword counts (after the overlay): Nairobi 5, Nakuru 3, Rongo 5. KW-086 and KW-087 ("near me") are unassigned until verified offices exist.

## C. Industry pages (residential, commercial, educational, retail, hospitality, construction)

The publication gate has no record type for industries, so they cannot be published at all today. Unlock: (1) an owner decision to extend the gate with an `industry` kind and its identity table; (2) service-capability evidence per industry; (3) anonymised, consented case material for hospitality and construction (briefs C13 and C14: "approved example, anonymised"); (4) the same claim controls as services. Until then the six keyword groups stay planned (3 keywords each).

## D. About / entity page (brief C15, task T28)

Not scaffolded: it does not fit the gate (no record kind) and every fact it would state is unverified. Unlock: approved entity facts sheet (T05) with one approved legal name and one trading name (T25; the public trading identity stays `JOLU SECURITY`); verified PSRA licence (T02) if licence status is to be mentioned; written decision on whether and how the parent company relationship is stated; verified branches and hours. Then add an `about` record kind to the gate in a reviewed change.

## E. Editorial / insights (19 planned slugs plus briefs C11, C12)

All stay planned (`editorial-planned`). The Blog placeholder remains `noindex`. Unlock per article: expert and compliance review, citation of the regulator directly (C11), verified figures for any cost guide (ED-01, ED-07, ED-10 need a pricing decision), anonymised case study approvals (T15). Brief C12 (tender checklist) is a new intent with no keyword in the registry; no URL is reserved.

## F. Site-wide structured data and identity

| Item | Status | Unlock |
| --- | --- | --- |
| Organization `sameAs` (social or directory profiles) | absent | verified, owner-controlled profile URLs |
| Organization `address`, `location`, `areaServed` | absent | OFF-* evidence for an eligible office |
| `parentOrganization` / group affiliation | absent | written approval of the accurate group relationship (A08, T28) |
| `LocalBusiness` | absent | gate-published location with attested NAP and a staffed address |
| Service `areaServed` | absent | verified coverage evidence |
| Ratings, reviews, testimonials | absent | consented, verifiable client evidence (T14) |
| Opening hours, `priceRange`, geo | absent | verified hours and a pricing decision |
| Legal name vs trading name | decision open | written decision (T25) |
| PSRA licence number | never shown | CMP-01 verified with expiry |

## G. Operational dependencies outside this lane

Search Console and Bing Webmaster Tools verification and sitemap submission (T03, T26); GA4 and lead tracking (T04, T27; other lane); the 160 AEO prompt-test rows (all blank: baseline not run); directory listing corrections (T06). None is claimed done here.
