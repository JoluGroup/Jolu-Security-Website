# Publication-gated page architecture (Milestones 5D.2, 5D.4, 5D.6, 5D.8 and 5D.10)

Infrastructure for future service and location pages. **Nothing is published**: no route, sitemap entry, navigation link or structured data exists for any of the ten planned pages. It follows the proposals in the 5B.1 and 5B.2 preparation documents (PR #5, PR #6) and uses the evidence ids of the Business Verification Pack (PR #7). 5D.4 hardened it after the independent audit of PR #8 (findings F-01 to F-13).

## Why there is no route yet, and what the first route must look like (F-01)

Under `cacheComponents`:

- `dynamicParams` is **not supported**. Exporting it fails the build. This document previously recommended `dynamicParams = false`; that advice was wrong and is withdrawn.
- A dynamic segment's `generateStaticParams` must return at least one param, so `app/services/[slug]` or `app/locations/[slug]` would fail the build while nothing is published.
- Params not returned by `generateStaticParams` render at request time, so such a route would have to call `notFound()` itself. With `partialPrefetching`, awaiting `params` inside a `<Suspense>` boundary makes `notFound()` answer HTTP 200 with a `noindex` tag instead of a real 404. A true 404 needs `params` awaited outside Suspense and no `loading.tsx` above it.

**Decision: the first approved pages use explicit, static route folders**, one per page (for example `app/services/<approved-slug>/page.tsx`), not a dynamic segment. This avoids the empty-params problem, needs no `generateStaticParams`, and makes every unknown slug a native Next.js 404 (HTTP 404, no page, not in the sitemap). A dynamic route can be reconsidered later once several pages are live; it must then pass a build and a response-code check (`curl -I` of an unknown slug returns 404).

Each page folder contains only a page that renders `PublishedPage` for its own fixed slug and exports `generateMetadata` using `gatedPageMetadata`. If the gate returns null at build or request time the page calls `notFound()`. No route is created by 5D.4.

## Files

| File | Role |
| --- | --- |
| lib/seo/page-models.ts | Typed records: sections with bound claims, approval with editorial and compliance reviews and per-claim approvals, evidence record with lifecycle fields, evidence-bound `LocationNap`, `Published<T>` brand |
| lib/seo/page-records.ts | The ten records, deep-frozen. All `unpublished`, no approval, no sections, no NAP |
| lib/seo/publication-requirements.ts | The **canonical** evidence table per page, identity tables, designation and licence evidence rules. Frozen. Records cannot weaken it |
| lib/seo/evidence-ledger.ts | Independent evidence on file. Empty, frozen |
| lib/seo/publication-manifest.ts | The single authoritative list of approved routes and their metadata. Empty, frozen. Feeds the sitemap, the route check and metadata |
| lib/seo/publication-deps.ts | The gate's dependencies and the committed `PUBLICATION_AS_OF` date (there is no clock) |
| lib/seo/publication-gate.ts | The fail-closed gate, snapshot registry and published-page helpers |
| lib/seo/freeze.ts | `deepFreeze` and JSON `snapshot` helpers |
| lib/seo/page-json-ld.ts, page-metadata.ts | Structured data and metadata, built only from gate-registered pages |
| components/pages/* | Server components that call `assertPublished(page)` at runtime |
| app/sitemap.ts | Adds manifest paths that pass the gate. Wrapped in try/catch so the homepage entry always survives |

## Gate

A page is published only if all of these hold. Any missing, malformed, throwing or non-serialisable input means not published. The record is first copied through a JSON round trip and frozen, so getters, proxies and later mutation cannot change what was judged.

1. **Identity (F-03).** Kind, path, slug, `plannedPath`, `serviceId` / `locationId` / office name all match the canonical tables and the keyword registry. `migori` and unknown slugs fail.
2. **Manifest (F-09).** The path is in `PUBLICATION_MANIFEST` with route file `app/<path>/page.tsx` and non-empty, claim-free title and description.
3. **Approval.** `status` is exactly `"approved"`; owner authorisation with approver, written reference, same path, layout approved, a real calendar date not in the future; editorial review always, compliance review whenever claims are used; review dates not after the approval date (F-08).
4. **Canonical evidence (F-02).** The gate takes the evidence list from `REQUIRED_EVIDENCE`, never from the record, and adds the ids its sections, coverage and designation use. Each must be usable and listed in the approval.
5. **Evidence lifecycle (F-05).** Usable means: `VERIFIED`; all metadata present; verifier and independent document; real verification date, not after the approval; not revoked; not superseded unless a valid, consistent replacement exists; not expired on the decision date or the approval date; licence evidence (CMP-01 to CMP-04, CLM-01) has an expiry. Duplicate ids and inconsistent supersession pairs reject every page.
6. **NAP (F-04).** A location needs a `nap` equal to the values attested by its name, address and phone evidence entries; E.164 telephone; head-office wording needs COM-03 and showroom wording needs OFF-NAK-11. The CTA phone must equal the number COM-05 attests. Coverage services and areas must be tied to the office's evidence.
7. **Claims (F-06).** Every claim-sensitive span in any rendered text must lie inside a statement bound to a claim that is approved with evidence in `lib/claims.ts` **and** has an approval entry naming that exact claim, section and statement with editorial and compliance approvers. Stray approvals are rejected. Headings, NAP fields, area names and manifest metadata cannot carry claims at all. The keyword scan is a backstop; the explicit approvals are the control.
8. **Content (F-07).** At least one section; each section cites evidence; paragraphs have at least 12 words (an integrity floor, not an SEO target); no paragraph repeated on the page, copied from a sibling page or from an approved service description. No length or keyword-density thresholds are applied.

There is no environment variable, request input, clock or runtime flag. Publishing needs a reviewable code change plus the owner's written authorisation.

### The as-of date

Prerendered code may not read the current time (build error), so the gate judges expiry against the committed `PUBLICATION_AS_OF`. While any page is published, `tests/seo/publication-clock.test.mjs` fails if that date is in the future or more than 31 days old, or if evidence a published page depends on has expired on the real date. Renewing the date is a reviewed code change.

### Runtime component boundary (F-12)

`Published<T>` is a type-level brand and can be forged by a cast. The real boundary is `assertPublished`, which accepts only objects the gate itself created and registered in a private `WeakMap`. Every page component calls it; copies, spreads and clones are rejected.

## Corrections added in Milestone 5D.6

These refine the gate above (finding ids are from the 5D.5 audit). Nothing is published and the ledger and allowlist remain empty.

- **Current evidence only (F5D5-01).** Evidence may be superseded by a replacement (`supersededBy` / `replaces`). The gate follows the chain to its tail (cycles, depth over 16, mismatched back-links and scope changes are rejected) and judges, and reads attested values from, the tail only. The approval must cite the tail id. NAP and the COM-05 phone are therefore compared with the current attestation; expired, revoked or malformed replacements make the page unpublishable.
- **Evidence scope (F5D5-04).** Every ledger entry carries `scope`: `company`, `office:<slug>` or `service:<slug>`. The gate checks it against the scope derived from the evidence code (`expectedScope` in `publication-requirements.ts`) and allows a page to use company-wide evidence or evidence scoped to its own office or service. This is explicit validation, not a prefix guess.
- **Text policy (F5D5-03).** `lib/seo/text-policy.ts` rejects (it never "cleans") hidden, control, formatting, private-use, unassigned and surrogate characters, line/paragraph separators, whitespace other than a plain space, combining marks, text that is not NFKC-stable (fullwidth, ligatures, compatibility forms), non-Latin letters and non-ASCII digits, in every rendered field, before claim scanning.
- **Claim scope (F5D5-05).** `lib/seo/claim-scope.ts` maps each claim id in `lib/claims.ts` (which is unchanged) to the categories and wording it may cover. A claim-sensitive span is unlocked only by a bound, approved claim whose scope covers it and whose statement covers it by position. A claim with no entry authorises nothing, and its statement must contain wording its scope covers. A changed statement needs a new approval. The scanner is still a heuristic; editorial and compliance review remain the real control, and nothing here proves a statement is true.
- **Designations (F5D5-06).** `DESIGNATIONS` is an allowlist (Regional Office, Branch Office, Head Office, Regional Office & Showroom), each bound to evidence; designation wording in a display name is rejected. Owner decision needed before use: the vocabulary.
- **Reviewed-content digest (F5D5-09).** `editorialReview` and `complianceReview` carry `contentDigest`, a SHA-256 of the path, title, description, evidence references, sections (including claim bindings), NAP and coverage. A reviewer computes it with the exported `contentDigest(record, manifestEntry)`. Any material change after review invalidates the approval.
- **Dependency snapshot (F5D5-10).** Dependencies (ledger, claims, manifest, as-of date) are copied through a JSON round trip, which also drops inherited fields, before evaluation. Failures stay closed; the runtime boundary is unchanged.
- **Manifest routes (F5D5-07).** `tests/helpers/manifest-routes.mjs` holds the canonical route template and a verifier. Tests prove, with temporary fixtures, that an approved manifest entry needs a real route file with valid metadata and the right `assertPublished` use, and that the production check is not vacuous. No production route exists.
- **Expiry monitoring (F5D5-02).** `lib/seo/evidence-monitor.ts` and `scripts/check-evidence-freshness.mjs` (read-only) report expired or soon-expiring evidence, stale as-of dates, revoked or superseded evidence still relied on, and licence evidence needing attention. `.github/workflows/evidence-freshness.yml` runs it weekly with `contents: read` only. GitHub runs scheduled workflows only from the default branch, so it does nothing until the file is on `main`. See `evidence-expiry-runbook.md`.
- **Mutation tests (F5D5-08).** `tests/helpers/gate-mutants.mjs` lists the mutants; `tests/seo/page-gate-mutation.test.mjs` runs them. A mutant that does not apply, load or compile fails the test (never a kill). Security mutants must be killed by a "rejects:" case; one property mutant (no snapshot) is killed by an "accepts:" case and reported separately; equivalent mutants must survive, must run (tracer) and carry a written reason.

## Corrections added in Milestone 5D.8

Findings are from the 5D.7 verification. Nothing is published; the allowlist, ledger and manifest stay empty.

- **Requirements come from the canonical root (F7-01).** Every requirement the gate applies to an evidence entry (scope, mandatory expiry for licence evidence, and the checks in `unusable`) comes from `rootRequirements(rootId)` in `publication-requirements.ts`, where the root is found by following `replaces` back to the id the evidence was first registered under. A replacement entry may carry any id and inherits the root's requirements. Before 5D.8 the licence-expiry rule read the replacement's own id, so `CMP-01` replaced by `CMP-91` or `ZZZ-91` with no expiry passed. A root that matches no known code has no profile and is rejected, so a new evidence category must be added to that function, with its flags, before it can be used. Limit: only the listed licence codes (`LICENCE_EVIDENCE`) require an expiry; any other company-coded root does not.
- **Ranking claims (F7-02).** `#1` could never match because `\b` does not hold between a space and `#`. The patterns for `#1`, `No. 1`, `No 1 in ...` and `number one / number 1` now use lookarounds, and site references such as "gate number 1" or "ticket #10" are not flagged. Detection is still a safety net, not proof of any statement.
- **Sibling records (F7-04).** The `siblings` argument is copied through one JSON pass and frozen like the record and dependencies; a sibling list that cannot be copied fails closed ("sibling records are malformed").
- **Monitoring (F7-03).** Findings carry a stable `code`. Revoked, superseded-without-citation, licence-without-expiry and expired-at-commit-date conditions surface as ERRORS on an approved-but-unpublishable record, by cause. The script has `--strict`, `--format=json` and `--format=markdown`; the workflow runs strict and writes a job summary. It is still not operational until it is on `main` and enabled (see the runbook).
- **Mutation harness (F7-05).** The two mutants wrongly called equivalent (a claim with no explicit scope; a superseded entry whose scope differs from its replacement) are now security mutants with rejection cases. Boundary mutants that depend on an acceptance (verification on the approval date) or a stricter-than-original change are reported as property mutants (acceptance kills). Equivalent mutants must still run (tracer) and survive.

## Corrections added in Milestone 5D.10

Findings are from the 5D.9 audit. Nothing is published; the allowlist, ledger and manifest stay empty.

- **Requirements come from every canonical identity in the chain (F9-01).** 5D.8 read requirements from the root of a supersession chain, which closed "licence root replaced by another id" but not the inverse: `CMP-07` replaced by the licence id `CMP-01` with no expiry. The gate now walks the whole chain (root to current entry) and calls `chainRequirements` in `publication-requirements.ts`. Rules: the root must be a registered identity (an unknown root is rejected); a replacement id the registry does not recognise inherits the root's requirements; every registered id in the chain must carry the same profile (scope and whether an expiry is mandatory), otherwise the chain is rejected as "mixes canonical evidence identities that carry different requirements". The conflict rule is deliberately stricter than an expiry check: a licence id used as a replacement for a non-licence entry (or the reverse, or a company id for an office entry) is refused even when the replacement is fully valid. There is no CMP-01 special case and no id-prefix heuristic; the licence list is `LICENCE_EVIDENCE`. Same-family replacement (for example `CMP-01` by `CMP-02`) is allowed because the profiles are identical.
- **Chain bound.** The root walk and the chain walk now use the same bound as the supersession walk, so no id in an accepted chain is left out of the check. At most 17 replacements are accepted; 18 are refused as over-long.
- **Expiry policy (unchanged, now tested).** An entry is expired on its expiry day: with a decision date of 2026-11-19, an entry expiring on 2026-11-19 is refused and one expiring on 2026-11-20 is accepted. Verification on the approval date is accepted; after the approval date it is refused.
- **Ranking scanner (F9-03).** Added `Number-one`, `#one`, `1st in ...`, `first-ranked`, `ranked first`, `numero uno` and `first choice for security`. Counter, item, office, extension, ticket and similar numbered references are not flagged. Still a heuristic: phrases such as "first name in guarding" or "second to none" are not detected, and exact-statement approval plus human review remain mandatory.
- **Sibling records (F9-04).** The sibling list must be a dense array of plain records, each with an own `sections` array whose bodies are string arrays. Anything else (null, functions, sparse lists, missing or non-array fields, inherited fields, class instances, hostile getters or proxies) fails closed as "sibling records are malformed".
- **Mutation harness.** The two audit gaps (CLM-01 as a licence id, and the `<=` expiry boundary) have rejection cases; the boundary case needs an approval dated before the decision date, because with equal dates a second comparison masks the first. Redundant sibling checks are classified as equivalent with tracers, not as kills.
- **Known limit (unchanged).** An unregistered company-coded root id (for example `CMP-99`) has no mandatory expiry, because licence evidence is defined only by `LICENCE_EVIDENCE`.

## Publishing the first page (future milestone)

1. Owner authorises the page in writing; record the reference.
2. Add independent evidence to the ledger (with attested NAP values for a location, expiry dates for licences).
3. Approve any claims in `lib/claims.ts` through the existing claims process.
4. Fill the record: sections with evidence ids and bound claims, `nap` and coverage for a location, the approval with editorial and compliance reviews and per-claim approvals.
5. Add the manifest entry, the static route folder and its metadata; update `PUBLICATION_AS_OF` in the same change.
6. Complete the acceptance checklists in the 5B.1 and 5B.2 documents; run the build and confirm an unknown slug returns HTTP 404.
7. Independent review before merge (see `governance-codeowners-proposal.md`).

## Known limits

- The gate cannot prove an approval really came from the owner; that is a review-process control.
- The claim scan and claim scope are heuristic; per-statement approvals and human review are the real control, and the gate does not prove factual accuracy.
- Separation of duties between reviewers is not enforced in code.
- Route-file existence and rendering are checked by tests in CI, not at runtime.

## Release 04 additions (Lane SEO)

- **Answer-first service content (unpublished).** `lib/seo/service-content.ts` holds draft content for the seven service pages (AEO briefs C01-C07); `lib/seo/service-sections.ts` flattens it into the `ContentSection[]` the gate reviews; `components/aeo/*` render it. `PublishedPage` uses the answer-first layout only when the gate-published record's sections equal the content's sections exactly, so reviewed copy and rendered copy cannot differ. All headings are free of pricing and licensing wording because the gate rejects claims in headings. No route file exists, the manifest and ledger are empty, and the pages answer 404.
- **Structured data for those pages.** `lib/seo/service-json-ld.ts` builds Organization, Service, BreadcrumbList and FAQPage from the same content, and returns null unless the page passed the gate and the sections match.
- **Route reconciliation.** `lib/seo/route-architecture.ts` gives one canonical path (no trailing slash) per intent, records the four workbook rows whose suggested URL contradicted their intent, and maps AEO briefs C01-C15 onto existing routes without creating second URLs. `lib/seo/location-support.ts` types location opportunities (no address, no coverage).
- See `release04-technical-audit.md` and `release04-evidence-gated-inventory.md`.
