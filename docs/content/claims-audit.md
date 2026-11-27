# Content claims audit (Lane D, remediate/d-content-integrity)

Owner rule: operating history, guard numbers, office locations, licensing, certifications and geographical coverage are unverified until supported by approved evidence. Addresses and claims from the separate JOLU Machineries site must not be reused for JOLU Security.

Registries (render only entries with status `approved` AND recorded evidence):
- `lib/claims.ts` - 8 claims, all `needs-evidence` (unchanged).
- `lib/offices.ts` - new. 3 planned office identities, all `needs-evidence`, no address or label text stored.
- `lib/client-categories.ts` - new. 6 categories, all `needs-evidence`.

## Decisions

| # | Location | Text / data | Decision |
|---|----------|-------------|----------|
| 1 | `lib/site-config.ts` offices | Nairobi/Nakuru/Migori addresses and branch labels copied from Machineries | Removed. Replaced by evidence-gated `lib/offices.ts` (no address strings). |
| 2 | `components/site-footer.tsx` | "Offices" section | Section and heading render only when an approved office exists; grid unchanged. |
| 3 | `components/contact-section.tsx` | "Offices" block | Same gating; Downloads block untouched. |
| 4 | `components/navbar.tsx` (mobile sheet) | `<OfficeList compact />` | `OfficeList` returns nothing when none approved (no edit needed to navbar). |
| 5 | `lib/seo/json-ld.ts` | `location` (Place/PostalAddress) and `areaServed: Kenya` (Organization and each Service) | Removed. Organization/WebSite, logo, phones, email, offer catalog kept. |
| 6 | `lib/seo/page-json-ld.ts` | `areaServed: Kenya` on published service pages | Removed (no page is published; the location page `LocalBusiness` stays gate-backed by verified NAP evidence). |
| 7 | `lib/seo/publication-gate.ts` | Office identity check used `siteConfig.offices` | Now uses `PLANNED_OFFICE_NAMES` from the registry (identical names, so the check is unchanged and not weakened). |
| 8 | `components/trust-strip.tsx` / `clientCategories` | "Security for estates, events, ..." + category chips | Gated by `lib/client-categories.ts`; renders nothing now (no empty heading). Heading is built from approved labels only. |
| 9 | `siteConfig.description` (footer, hero) | "Security services across Kenya." (implies nationwide coverage) | Replaced by a service-list sentence with no coverage wording. |
| 10 | `lib/seo/pages.ts` HOME_DESCRIPTION | "... VIP close protection across Kenya." | "across Kenya" removed (length stays within 70-160). |
| 11 | `components/intro-section.tsx` | "Jolu Security provides security services in Kenya." | "in Kenya" removed. |
| 12 | `lib/seo/pages.ts` HOME_TITLE, root metadata | "Security Companies in Kenya \| JOLU SECURITY" | CHANGED (Patch 2) to the owner-approved "JOLU SECURITY \| Professional Security Services" (no location wording; workbook keyword stays in research data only). |
| 13 | `lib/services.ts` VALUES "Professionalism" / hero "Professional Protection" | quality wording | Unchanged; already on `lib/seo/copy-review.ts` owner review list. |
| 14 | `lib/services.ts` INDUSTRIES descriptions, footer Industries list | "Homes, estates and residential communities", schools, hotels... | Left: describes sectors a service could apply to, not clients served or experience. Flagged for owner review. |
| 15 | Enquiry form / `county-combobox` | "County" field, 47 counties | Left: collects the visitor's location; makes no coverage claim. Owner to confirm coverage wording if any is added. |
| 16 | `lib/protection-layers.ts`, services copy ("Alarm response", "K9 unit") | service descriptions | Left: describe offered services without response times, availability or numbers. |
| 17 | Scan of `app/**`, `components/**` for licensed/certified/accredited/PSRA/ISO/24/7/round the clock/nationwide/countrywide/across Kenya/trusted by/N+/N years/N guards/since YYYY | - | No remaining hits (enforced by `tests/content`). Hero-video comments mentioning "licensed footage" are code comments about media licensing, not rendered. |

## Not changed on purpose
- `lib/seo/planned-pages.ts`, `page-records.ts`, `workbook-keywords.ts`, `docs/seo/**`: planned location pages (Nairobi, Nakuru, Rongo) remain unpublished; `tests/seo` confirms none is live or in the sitemap. Publication gates for licences, certifications, guard numbers, operating history and coverage are untouched.
- Contact data, logo, brand name and design are unchanged.
