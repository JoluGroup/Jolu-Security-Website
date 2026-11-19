# Reusable service-page architecture (proposal)

Status: PROPOSAL ONLY. No route, component or content file described here exists. The visual design is frozen, so this document covers structure, data and gating, not appearance. Written against this repository's Next.js 16.4 setup (`cacheComponents: true`, `partialPrefetching: true`), after reading the bundled docs in `node_modules/next/dist/docs/01-app/03-api-reference/`.

## 1. Constraints that shape the design

- **Design freeze.** No new visual design, no v0 calls. A service page may only reuse existing primitives (`SiteShell`, `Eyebrow`, `SectionTitle`, `Button`) until the owner approves a layout (evidence item C11).
- **Claims policy.** `lib/claims.ts` marks every claim `needs-evidence`. A page may render only existing approved wording or owner-supplied evidence.
- **Cache Components.** With `cacheComponents` on, a dynamic route's `generateStaticParams` must return at least one param; an empty array is a build error (`generate-static-params.md`, "With Cache Components"). A `[slug]` route therefore cannot be added before the first approved page exists.
- **Async params.** In this version `params` is a `Promise`; pages and `generateMetadata` must `await` it.
- **Trailing slash.** `next.config.ts` does not enable `trailingSlash`, so `/services/manned-guarding/` is not the served URL. The workbook URLs carry a trailing slash; canonical, sitemap and links must use the slash-less form (`https://www.jolusecurity.com/services/manned-guarding`). `canonicalUrl` in `lib/seo/metadata.ts` already strips the root slash and needs the same rule for every path.

## 2. Route structure

Recommended: one dynamic route, added in the same pull request as the first approved page.

```
app/services/[slug]/page.tsx     // server component, renders <ServicePage content={...} />
```

- `generateStaticParams()` returns the slugs of pages in the published list (never empty by construction).
- `export const dynamicParams = false` so any other slug returns 404.
- `generateMetadata` awaits `params`, then returns `pageMetadata(`/services/${slug}`)`.
- Unpublished services have no route and are not in the sitemap.

Fallback if a shared route is not wanted: one static folder per service (`app/services/manned-guarding/page.tsx`), each rendering the same `<ServicePage>`. That removes the empty-params risk but repeats the metadata wiring.

A `/services` index page is not proposed: the homepage services section already acts as the index, and a thin index would add no value.

## 3. Content model

Planning specs (`lib/seo/service-briefs.ts`) stay as they are and are never rendered. Published content is a separate typed file per service, for example `lib/services/pages/manned-guarding.ts`:

```ts
type ServicePageContent = {
  serviceId: ServiceId            // existing id, also the enquiry preselect
  slug: string                    // from the workbook path, without slashes
  status: "draft" | "approved"
  title: string                   // title segment; the root template adds " | JOLU SECURITY"
  description: string
  h1: string
  intro: string                   // existing approved description, verbatim
  sections: ServiceSection[]      // text | list | faq | proof
  related: ServiceId[]
}
type ServiceSection = {
  heading: string
  body: string[]                  // owner-approved text only
  evidenceIds: string[]           // C-items and service items that support it
  claimIds: string[]              // registry claims used; each must be approved
}
```

Every section carries the evidence that supports it, so a reviewer can trace each statement. Sections without approved evidence are not present in the file.

## 4. Publication gate (enforced by tests)

A path may be added to `LIVE_PAGES` (`lib/seo/pages.ts`) only if, for its content file:

1. `status` is `approved`.
2. Every evidence id in its sections has an entry in an evidence log with a recorded source and approver.
3. Every `claimIds` entry is `approved` in `lib/claims.ts`.
4. Title, description, H1 and section text pass the claim scan and contain no held keyword whose claim is unapproved.
5. Its keywords are mapped once (no other page targets them).
6. All internal links resolve to published routes or existing anchors.

`LIVE_PAGES` is already the single source for metadata, sitemap and robots, so adding a page there gives the canonical, Open Graph, Twitter and sitemap entry. Its `path` type needs widening from `"/" | "/blog"` to also accept `/services/${string}`. Nothing else in the SEO layer changes.

## 5. Metadata

`pageMetadata(path)` is reused. Titles use the existing `%s | JOLU SECURITY` template (the segment form), so the stored title omits the brand. Descriptions are 70 to 160 characters. Open Graph and Twitter use the existing logo image until an approved social image exists.

## 6. Structured data

Add `buildServiceJsonLd(content)` beside `buildHomeJsonLd`:

- One `Service` node with `@id` `<canonical>#service`, `name`, `description` (existing wording), `url`, `provider` referencing the existing Organization `@id`, and `areaServed` Country Kenya, or only confirmed counties once C2 is closed.
- No price, offer terms, rating, review, hours, licence or award.
- `FAQPage` only for questions that are visible on the page with approved answers.
- `BreadcrumbList` is omitted: the parent "Services" is a homepage anchor, not a page.

Serialise with the existing `serializeJsonLd`.

## 7. Page component

A single server component, `components/service-page.tsx`, built from existing primitives:

- Hero with H1, the existing description and a quote button linking to `/?service=<id>#contact`. This reuses the enquiry form's existing preselect and avoids embedding the form, which uses `useSearchParams`.
- Sections in the order of the brief outline; sections with no content are not rendered.
- Related-services links from `related`, with plain anchor text and no package wording.
- Photos only through `resolvePhoto`, so rights clearance still decides visibility.

No client JavaScript is added.

## 8. Internal linking

- Page to homepage and enquiry: existing `/#services` and `/?service=<id>#contact`.
- Homepage to page: the service cards and footer links currently point at the enquiry form. Repointing them changes frozen components (`components/services-index.tsx`, `components/site-footer.tsx`) and needs owner approval (decision D3).
- Related services only between published pages; office and guide links only after those pages exist.

## 9. Tests to add with the first page

- Keyword mapping: every brief keyword stays accounted for; one page per keyword.
- Metadata: lengths, uniqueness, brand suffix, canonical equals sitemap URL (slash-less).
- Claims: section text contains no unsupported claim; every `claimIds` entry is approved.
- Structured data: parses, references the Organization `@id`, contains no forbidden fields.
- Links: every internal link resolves; no link to an unpublished page.
- Regression: homepage metadata, sitemap entries for existing pages, robots and the Blog noindex are unchanged.

## 10. Rollout per page

1. Evidence logged and approved (owner, Operations, compliance reviewer as needed).
2. Content file added with status `approved`.
3. `LIVE_PAGES` entry, route (first page only) and tests in the same pull request.
4. Homepage link change only with owner approval.
5. Live crawl, tracking test and acceptance checklist (`publishing-checklist.md`) completed before merge.

## 11. Deliberately not done in this milestone

No route, component, content file, sitemap entry or navigation change. No change to the homepage, footer, enquiry form or API.
