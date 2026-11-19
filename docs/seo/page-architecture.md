# Publication-gated page architecture (Milestone 5D.2)

Infrastructure for future service and location pages. **Nothing is published**: no route, sitemap entry, navigation link or structured data exists for any of the ten planned pages. It follows the proposals in the 5B.1 and 5B.2 preparation documents (PR #5, PR #6) and uses the evidence ids of the Business Verification Pack (PR #7).

## Why there is no route yet

With `cacheComponents`, a dynamic route's `generateStaticParams` must return at least one param, so `app/services/[slug]` or `app/locations/[slug]` would break the build while no page is published (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-static-params.md`). The route is therefore added in the same change as the first approved page. `PublishedPage` and `getPublishedPage` are ready for it: unknown, unplanned and unpublished slugs return null and the route calls `notFound()`.

## Files

| File | Role |
| --- | --- |
| lib/seo/page-models.ts | Typed service and location records, approval record, evidence record, `Published<T>` brand |
| lib/seo/page-records.ts | The ten records. All `unpublished`, no approval, no sections |
| lib/seo/page-resolve.ts | Primary and supporting keywords and draft metadata read from lib/seo/planned-pages.ts (not duplicated) |
| lib/seo/publication-requirements.ts | Evidence ids each page requires (publication-blocking items of the register) |
| lib/seo/evidence-ledger.ts | Independent evidence on file. Empty |
| lib/seo/publication-gate.ts | The fail-closed gate, allowlist (empty) and published-page helpers |
| lib/seo/page-json-ld.ts | Structured data, returned only for gated pages |
| components/pages/* | Server components that accept only `Published<...>` pages |
| app/sitemap.ts | Adds gated paths to the existing entries (none today) |

## Gate

A page is published only if all of these hold. Any missing, malformed or throwing input means not published.

1. Its public path is in `PUBLICATION_ALLOWLIST` in code (empty).
2. `status` is exactly `"approved"`.
3. It has an owner approval: approver, valid ISO date, written reference, same path, layout approved.
4. Every required evidence id, every evidence id its sections, NAP and coverage use, and every id in the approval is `VERIFIED` in the ledger with verifier, date and an independent document, and is covered by the approval.
5. Every claim it uses is approved with evidence in lib/claims.ts and covered by the approval.
6. Every section cites evidence; claim-sensitive wording (licensing, superlatives, availability) needs an approved claim on that section.
7. The slug is a planned page (so `migori` and unknown slugs fail).

There is no environment variable, request input or runtime flag. Publishing needs a reviewable code change plus the owner's written authorisation.

## Publishing the first page (future milestone)

Fill the record and approval, add verified evidence to the ledger, approve its claims in lib/claims.ts, add the path to `PUBLICATION_ALLOWLIST`, add the route (`generateStaticParams` from `publishedSlugs`, `dynamicParams = false`, `generateMetadata` via `LIVE_PAGES`), and complete the acceptance checklists in the 5B.1 and 5B.2 documents.
