# Release 04B: service-page publication requirements and their gate

Source of truth: `lib/seo/release-gates.ts` (classification), `lib/seo/publication-requirements.ts` (per-page content evidence), `lib/seo/publication-gate.ts` (enforcement). Tests: `tests/seo/release-gates.test.mjs`, `tests/seo/pricing-policy.test.mjs`, `tests/seo/page-gate.test.mjs`.

## About the "31 requirements" figure

The handover cites 31 requirements per service page. That figure cannot be reproduced from the repository (the report that produced it, `service-gate-matrix.md`, belonged to the previous environment and is not available). Counted from the code at `9907837`, the gate imposed **34** requirements on every service page: 13 evidence items from the canonical table plus 21 structural checks. All 34 are listed below with their disposition.

## Gates

- **A. Content evidence gate.** Per page, enforced by the publication gate. Facts the page states or depends on.
- **B. Production release gate.** Site-wide, before production activation and DNS cutover (`PRODUCTION_RELEASE_GATE`, items `PRG-01` to `PRG-08`). `productionReleaseBlockers()` lists what is still open; production activation is an owner-controlled action outside the repository, so the full list is a checklist, not code enforcement. CI does enforce one part: `tests/seo/release-gates.test.mjs` fails if any page enters the publication manifest while `PRG-01` (approved privacy notice) is unverified, because every page carries the enquiry form link. The gate never decides whether an individual page's facts are true.
- **C. Post-launch optimisation queue.** Marketing measurement and growth (`POST_LAUNCH_QUEUE`, items `PLQ-01` to `PLQ-08`). Never a publication condition.

## Evidence items (13 per service page at 9907837)

`xx` is the service code (MG, CC, EF, EV, K9, AR, VP); for example manned guarding requires `SVC-MG-01`, `SVC-MG-02` and `SVC-MG-07`.

| # | Id | What it is | Release 04A | Release 04B disposition |
| --- | --- | --- | --- | --- |
| E01 | COM-05 | Official phone numbers (the page shows the primary number in its call to action) | page | **A** kept: the page asserts it |
| E02 | CNT-10 | Named reviewer for content originality | page | **A** kept: content approval |
| E03 | SVC-xx-01 | What the service is, how it is delivered, what it excludes | page | **A** kept: confirmed service offering and scope (mandatory) |
| E04 | SVC-xx-02 | Where the service is delivered | page | **A** kept: the page metadata names Kenya |
| E05 | SVC-xx-07 | Named operations sign-off for the page | page | **A** kept: operational accuracy approval |
| E06 | CMP-05 | Legal confirmation that the service may be advertised and provided | page | **A** kept: regulatory basis |
| E07 | CNT-01 | Approved one-sentence service description | page | **A** kept: accurate service scope |
| E08 | CMP-07 | Privacy notice and data-protection position | page | **B** moved to `PRG-01` Approved privacy notice |
| E09 | DIG-05 | Live check of the canonical address form | page | **B** moved to `PRG-03` Functional acceptance (the apex canonical decision is already implemented) |
| E10 | DIG-08 | Live crawl of the current website | page | **B** moved to `PRG-06` DNS rollback readiness (no indexed URL broken at cutover) |
| E11 | CLM-10 | Which statements in the legacy PDFs may stay public | page | **B** moved to `PRG-08` Staff-asset privacy containment |
| E12 | DIG-02 | Google Search Console access | page | **C** moved to `PLQ-01` |
| E13 | DIG-03 | GA4 with working key events | page | **C** moved to `PLQ-03` |

Location pages had the same eight common items; they now carry `COM-05` and `CNT-10` plus their six office items (`OFF-xxx-01, -02, -05, -06, -07, -10`).

Conditional content evidence is unchanged: a page that asserts a licence, a price, availability, a statistic or a guarantee still needs an approved claim, scoped to that wording, bound to the exact statement and backed by evidence (licence evidence `CMP-01` to `CMP-04` and `CLM-01` must carry an expiry date).

## Production release gate register (all PENDING)

| Id | Item | Evidence required | Absorbed ids |
| --- | --- | --- | --- |
| PRG-01 | Approved privacy notice | Final privacy notice text approved by management and legal, published at its route, with no internal placeholders. | CMP-07 |
| PRG-02 | Security verification | Independent security review of the release candidate: headers, CSP, enquiry controls, secret and sensitive-asset scans. | - |
| PRG-03 | Functional acceptance | Owner acceptance of the deployed candidate on desktop, tablet and mobile, including navigation, forms, call and WhatsApp links, the apex canonical and the www redirect. | DIG-05 |
| PRG-04 | Commercial hosting | Vercel plan suitable for a commercial site, with billing confirmed by the owner. | - |
| PRG-05 | Working enquiry delivery | One authorised test enquiry in an approved window, with provider acceptance AND mailbox receipt evidence. | - |
| PRG-06 | DNS rollback readiness | Complete Cloudflare zone export, exact cutover and rollback records, mail records left untouched, and a live crawl of the legacy URLs so no indexed URL is broken. | DIG-08 |
| PRG-07 | Repository governance | Branch protection or an equivalent sole-owner workflow: required CI, no force-push, no branch deletion, PR-only changes to main. | - |
| PRG-08 | Staff-asset privacy containment | Withheld staff photographs and company PDFs removed from the legacy site with explicit 404s, private backups preserved, and a management decision on which legacy PDF statements may stay public. | CLM-10 |

## Post-launch optimisation queue

| Id | Item | Absorbed ids |
| --- | --- | --- |
| PLQ-01 | Google Search Console property and sitemap submission | DIG-02 |
| PLQ-02 | Bing Webmaster Tools | - |
| PLQ-03 | GA4 activation with consent architecture and key events (generate_lead, phone_click, whatsapp_click) | DIG-03 |
| PLQ-04 | AI visibility baseline and day-90 reassessment (160 prompt-test slots) | - |
| PLQ-05 | Directory listings | - |
| PLQ-06 | Editorial publishing (insights) | - |
| PLQ-07 | Legitimate backlink development | - |
| PLQ-08 | Ongoing ranking and indexation measurement | - |

## Structural checks (21, all kept in gate A)

| # | Check | Disposition |
| --- | --- | --- |
| S01 | Identity matches the planned page and service (kind, path, slug, planned path, service id) | A kept |
| S02 | Page has a publication manifest entry | A kept |
| S03 | Manifest route file is the canonical static file `app/services/<slug>/page.tsx` | A kept |
| S04 | Manifest title and description present, plain text, no claim wording | A kept |
| S05 | Record status is `approved` | A kept |
| S06 | Owner authorisation | A kept |
| S07 | Named approver | A kept |
| S08 | Written reference for the approval | A kept |
| S09 | Approval is for this path | A kept |
| S10 | Layout approved | A kept |
| S11 | Approval date is real and not in the future | A kept |
| S12 | Approval cites every needed evidence item, including current replacements | A kept |
| S13 | Editorial review carrying the content digest | A kept |
| S14 | Compliance review carrying the content digest (required when any claim is bound) | A kept |
| S15 | Content sections present, well formed, each citing evidence | A kept |
| S16 | Rendered text passes the plain-text policy | A kept |
| S17 | Paragraphs of at least 12 words | A kept |
| S18 | No repeated paragraphs and no text copied from sibling pages or service descriptions | A kept |
| S19 | Every claim-sensitive span covered by a bound, approved, scoped claim | A kept, **pricing rule corrected** (below) |
| S20 | Per-statement claim approvals with editorial and compliance approvers | A kept |
| S21 | Every evidence item usable: VERIFIED, named verifier, independent document, valid dates, unexpired, unrevoked, correct scope, consistent supersession chain | A kept |

## S19 pricing rule (lane B)

Before: any page sentence containing cost, price, rate, fee, quote or quotation was a pricing claim, and no claim could unlock it. That refused educational cost-driver guidance and ordinary requests for a quotation.

Now: the keyword classifier keeps its broad rule for keyword research, but on pages the scanner looks for pricing **claims**. It refuses currency words and money amounts (including Sh, /=, 15k, "bob", thousands-separated figures and amounts tied to a period or unit), a price word near a figure, percentages, rate cards and price lists, positioning before or after the price word ("lowest prices", "rates are the lowest", "price is negotiable", "quotes are free"), comparisons ("cheaper", "costs less than", "pay less"), amounts spelled out or stated as fractions near a price word ("twenty five thousand", "half of what others ask", "for the price of one"), "prices start from", no-hidden-fees, discounts, offers, complimentary or uncharged services, tiered packages and promotional value wording. No claim scope permits the pricing category, so a real price needs a reviewed pricing decision and a registered, scoped claim before it can appear.

Limits, stated plainly: the scanner is a heuristic backstop for known wording, not proof that a page makes no pricing claim. Novel phrasings can still pass and remain the editorial and compliance reviewers' responsibility. It also fails closed on some harmless text: a price word within a short clause of any number is refused ("check the quotation within 7 days"), so editors should move such a number into a separate sentence (never spell an amount out in words: spelled-out amounts near a price word are refused too). "Free to", "free from" and "feel free" are allowed; any other "free <thing>" is refused.

Coverage: 13 accepted and 50 refused cases (including every reproduction from the independent review of `00212ee` and the delta review of `9c39102`) and 10 mutants, each killed by a case no other rule catches (`tests/helpers/gate-world.mjs`, `tests/helpers/gate-mutants.mjs`).

## Effect on the seven drafts (synthetic approved world, test-only)

Six pages (CCTV installation, electric fencing, events security, K9 unit services, alarm response, VIP close protection) pass the gate with their real draft content unchanged. Manned guarding is refused only for the regulator sentence (licensing wording naming the Private Security Regulatory Authority). That sentence is accurate and does not say JOLU SECURITY is licensed, but under the existing policy it needs compliance approval through a reference-only claim (it must never use `licensed-compliant`). No page is published: the evidence ledger and the manifest are still empty.
