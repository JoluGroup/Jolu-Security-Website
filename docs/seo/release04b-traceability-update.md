# Release 04B traceability update

Computed by `lib/seo/traceability.ts` from the repository's keyword registry (`lib/seo/workbook-keywords.ts`, 311 rows generated from the SEO workbook). `tests/seo/traceability.test.mjs` fails if the figures below drift from the computation.

## What could and could not be recovered

| Artifact | Status |
| --- | --- |
| `lib/seo/workbook-keywords.ts` (311 keyword rows) | Available in the repository; used here |
| `docs/seo/*` mapping and inventory documents | Available |
| Business Verification register (PR #7) | Available on `refs/pull/7/head`; used for evidence ids and the questionnaire mapping |
| Original workbooks (`Jolu Security SEO Keyword(1).xlsx`, `Jolu Security AEO & GEO.xlsx`) | **Not available** in this environment. Checksums could not be re-verified |
| `/home/claude/reports/r04/traceability-matrix.csv` (500 rows), `reconciliation-report.md`, `prompt-inventory.csv`, `service-gate-matrix.md` | **Not available** (previous environment). Not reconstructed |

Consequence: the 311 keyword rows are updated below. The 189 non-keyword rows (audit findings A01-A15, tasks T01-T28, briefs C01-C15 and the remaining requirement rows) and the 160 AI prompt-test slots are **not re-classified here**, because their source rows are unavailable and inventing them is not acceptable. The 160 slots (20 prompts x 4 platforms x baseline and day 90) remain in the plan as post-launch item `PLQ-04`; branded prompts must use "JOLU SECURITY". No AI visibility result exists. Supplying the workbook ZIP or the four report files would allow the remaining rows to be updated.

## Exact source files needed to restore the 500-row matrix

Outstanding source-recovery requirement (Release 04C or earlier, whenever supplied). Supply any ONE of these sets; nothing is reconstructed from memory.

| # | File | Expected SHA-256 | Restores |
| --- | --- | --- | --- |
| 1 | `Jolu Security SEO Keyword(1).xlsx` | `9374da6f84bc56cce9b6e099702a222de6983a564dceda526512773f75abc815` | keyword sheet re-verification (the 311 rows are already in the repository) |
| 2 | `Jolu Security AEO & GEO.xlsx` | `18d3ef7a6c0c226cc45147f9149e04f34fe26534c289e3961c67f2c2544be618` | audit findings A01-A15, tasks T01-T28, briefs C01-C15, the 20 prompts behind the 160 AI prompt-test slots |
| 3 | `traceability-matrix.csv` (previous environment, `/home/claude/reports/r04/`) | not recorded | all 500 rows with their earlier classifications |
| 4 | `prompt-inventory.csv` (same folder) | not recorded | the 160 prompt-test slots (20 prompts x 4 platforms x baseline and day 90) |
| 5 | `reconciliation-report.md`, `service-gate-matrix.md` (same folder) | not recorded | the earlier reconciliation narrative and the original "31 requirements" count |

Set A (files 1 and 2) is the authoritative source once supplied. The two SHA-256 values above are copied from the Release 04B continuity handover (section 05); they were reported by the previous environment and have NOT been verified in this repository. A supplied file is accepted only if its SHA-256 matches. Set B (files 3 to 5) restores the previous classifications directly. The original workbooks must not be committed to the public repository; they are verified and used from a private location only.

## Keyword stages (311 rows)

| Stage | Keywords |
| --- | --- |
| Total | 311 |
| Deliberately unassigned ("near me" intents, KW-086, KW-087) | 2 |
| Architecture implemented (live page, or gate + canonical route template + tests) | 272 |
| Content implemented (live copy or a tested draft) | 259 |
| Content published | 9 |
| Content indexable | 9 |
| Drafted but NOT published (the seven service drafts) | 250 |
| No gate-backed architecture yet (industries and insights) | 37 |
| External optimisation pending | all 311 (Search Console, Bing, indexation and ranking measurement are post-launch, `PLQ-01` to `PLQ-08`) |

Only the homepage keywords are public, indexable SEO coverage today. The seven service drafts are built and tested but are **not** public: no route file, empty manifest, empty evidence ledger. They are not counted as coverage.

Destination split in the repository: homepage 9, services 250, locations 13, industries 18, insights 19, unassigned 2. The handover's split (services 250, insights 19, industries 18, locations 15, unassigned 9) is the same data under different conventions: its 15 locations include the two "near me" keywords the repository deliberately leaves unassigned, and its 9 unassigned are the homepage keywords.

## Educational cost guides: reclassified

Under the Release 04A wording rule, any page text with cost, price or quotation was a pricing claim, so cost-guide topics were treated as not applicable without an approved rate card. That was wrong: educational cost-driver guidance makes no price claim. Release 04B (`docs/seo/release04b-gate-dispositions.md`, S19) allows it and keeps money amounts, rate cards and price positioning blocked.

Pricing-intent keywords: 11. Now addressable by educational content with no figures: 8 (CCTV and electric-fencing cost keywords on their service drafts, and the two "how much does ... cost" insight destinations). The remaining three (KW-090 quotation, KW-091 rates, KW-092 cost of hiring guards) map to the homepage and stay as they are.

Topics retained for editorial planning (not built in 04B):

- security guard cost drivers (`/insights/security-guard-cost-kenya` in the handover; the repository's planned path is `/insights/how-much-does-it-cost-to-hire-a-security-guard-in-kenya`)
- CCTV installation cost drivers (`/insights/how-much-does-cctv-installation-cost-in-kenya`; handover: `/insights/cctv-installation-cost-kenya`)
- electric fencing budgets (served by the electric-fencing service draft)
- security procurement, tender preparation and quotation assessment (brief C12; no keyword in the registry, so no canonical URL until approved; handover: `/insights/security-tender-checklist`)
- PSRA licence verification (brief C11, `/insights/how-to-verify-a-security-company-psra-licence`; handover: `/insights/verify-psra-licence`)

The insight paths in the handover differ from the repository's reconciled paths. Neither is built; choosing one canonical path per topic is a Release 04C editorial decision, and only one URL per intent may exist.
