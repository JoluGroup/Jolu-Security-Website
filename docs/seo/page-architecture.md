# Publication-gated page architecture (Milestones 5D.2 and 5D.4)

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
- The claim scan is heuristic; per-statement approvals are the real control.
- Route-file existence and rendering are checked by tests in CI, not at runtime.
