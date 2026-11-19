# Location-page publishing acceptance checklist

Every box must be ticked, with proof recorded, before a location page is added to `LIVE_PAGES`. Use one copy per page.

| Done | Area | Check | Source | Proof |
| --- | --- | --- | --- | --- |
| [ ] | Governance | Written owner approval to publish this office page (L1), and the approved layout (L15), are on record. | Evidence L1, L15 | Approval note with approver and date |
| [ ] | Governance | Every evidence item the brief marks 'publication' is closed with a recorded source and approver. | Brief: Missing evidence | Evidence log |
| [ ] | NAP and local | Name, address and phone on the page equal lib/site-config.ts, the Google Business Profile, directories and signage, character for character. | LOCAL SEO: Verify exact office NAP | NAP verification checklist signed off |
| [ ] | NAP and local | Opening hours appear only if confirmed (L3); otherwise no hours on the page and no hours markup. | Evidence L3 | Local manager confirmation |
| [ ] | NAP and local | Google Business Profile for the office is verified and consistent with the page (L6). | LOCAL SEO: Google Business Profile | Profile screenshot and ownership record |
| [ ] | NAP and local | Service area text equals the verified list (L4); no radius, travel-time or response-time statement. | Evidence L4 | Local manager list |
| [ ] | Indexation | Page is indexable, self-canonical on the slash-less URL, in the sitemap and not blocked by robots; no /locations/migori URL exists or redirects to /locations/rongo. | TECHNICAL AUDIT: Indexation; owner decision 5A.1 | Crawler export and Search Console URL inspection |
| [ ] | Information architecture | One page per distinct intent: no keyword is targeted by this page and another; the 'near me' and cross-location keywords are placed per the owner decision. | TECHNICAL AUDIT: Information architecture | Keyword map diff |
| [ ] | Information architecture | Internal links: other published office pages, the confirmed services, and the homepage; every link resolves to a published page. | Brief: Internal links | Link check output |
| [ ] | On-page | Unique title (60 characters or fewer), description (70 to 160), one H1, none containing a held keyword's claim. | TECHNICAL AUDIT: On-page | Crawl report |
| [ ] | Content quality | Unique-content gate passed (L14): sections marked unique are written from owner-supplied local facts; no sentence pattern is the same with only the town name swapped; proposed limit of 30 per cent of sentences shared with a sibling page (SEO lead to confirm). | TECHNICAL AUDIT: Content quality | Editor sign-off and similarity check |
| [ ] | Content quality | No service-plus-city doorway pages and no page per suburb are created from this template. | Cluster Strategy; owner decision 5A.1 | Sitemap review |
| [ ] | Trust signals | No licensing, 'top', 'best', 24-hour, response-time or client-count statement unless its registry claim is approved. | TECHNICAL AUDIT: Trust signals; lib/claims.ts | Claim scan and registry status |
| [ ] | Trust signals | Testimonials, client names and case studies appear only with written consent (L10). | Evidence L10 | Consent record |
| [ ] | Structured data | Markup follows the structured-data requirements: only verified properties, one LocalBusiness per page, every value visible on the page. | TECHNICAL AUDIT: Structured data | Rich Results Test and Schema validator output |
| [ ] | Images | Any photo is rights-cleared through lib/photo-library.ts with descriptive alt text; none is used otherwise. | TECHNICAL AUDIT: Images; evidence L9 | Clearance record and image audit |
| [ ] | Conversion tracking | Call, WhatsApp and quote-request events are attributed to this page; test leads recorded (L12). | TECHNICAL AUDIT: Conversion tracking | GA4 / Tag Manager test log |
| [ ] | Core Web Vitals | Mobile LCP, INP and CLS measured; issues logged and fixed. A map embed, if used, is measured separately. | TECHNICAL AUDIT: Core Web Vitals | PageSpeed Insights report |
| [ ] | Security | HTTPS, form protection and privacy disclosures unchanged; a map embed (if any) passes privacy review and the security headers are updated deliberately (L11). | TECHNICAL AUDIT: Security | Header check and privacy review |
| [ ] | Regression | Homepage, Blog noindex, existing sitemap entries, robots.txt and the enquiry flow are unchanged. | Existing SEO tests | Test run and build output comparison |
