# Reusable location-page architecture (proposal)

Status: PROPOSAL ONLY. No route, component or content file described here exists. The visual design is frozen, so this covers structure, data and gating, not appearance. Written against this repository's Next.js 16.4 setup (`cacheComponents: true`, `partialPrefetching: true`), after reading `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-static-params.md`. It follows the same pattern as the service-page proposal (milestone 5B.1) so the two can share one `LIVE_PAGES` change and one metadata path.

## 1. Constraints

- **Design freeze.** Reuse existing primitives only (`SiteShell`, `Eyebrow`, `SectionTitle`, `Button`, and the office rendering in `components/office-list.tsx`) until the owner approves a layout (evidence L15).
- **Claims policy.** Every claim in `lib/claims.ts` is `needs-evidence`. A page renders only approved wording and owner-supplied, evidence-logged facts.
- **One location, one page.** Three pages: nairobi, nakuru, rongo. Rongo covers Migori County. There is no `migori` slug, and the route must not accept one.
- **Cache Components.** A dynamic route's `generateStaticParams` must return at least one param; an empty array is a build error. A `[slug]` route can therefore only be added together with the first approved page.
- **Async params.** `params` is a `Promise`; pages and `generateMetadata` must `await` it.
- **Trailing slash.** `trailingSlash` is not enabled, so canonical, sitemap and links use `/locations/nairobi`, not the workbook's `/locations/nairobi/`.

## 2. Route

```
app/locations/[slug]/page.tsx   // server component, renders <LocationPage content={...} />
```

- `generateStaticParams()` returns only the slugs in the published list.
- `export const dynamicParams = false`: every other slug, including `migori`, is a 404.
- `generateMetadata` awaits `params` and returns `pageMetadata(`/locations/${slug}`)`.
- No `/locations` index page: the offices are few, and a thin index would add nothing. This is also why `BreadcrumbList` is omitted.

Fallback: one static folder per office (`app/locations/nairobi/page.tsx`, and so on), each rendering the same `<LocationPage>`; this avoids the empty-params rule at the cost of repeated metadata wiring.

## 3. Single source for office data

NAP must never be typed into a content file. The page reads the office from `siteConfig.offices` and the content file holds only prose and verified extras:

```ts
type LocationPageContent = {
  slug: "nairobi" | "nakuru" | "rongo"
  officeName: Office["name"]          // "Nairobi" | "Nakuru" | "Migori" (see decision L-D2)
  status: "draft" | "approved"
  title: string                       // segment; the root template adds " | JOLU SECURITY"
  description: string
  h1: string
  hours: VerifiedHours | null         // null renders no hours section and no hours markup
  areasServed: string[]               // verified list (L4); empty hides the section
  services: ServiceId[]               // confirmed for this office (L5); empty hides the section
  sections: LocationSection[]         // owner-written, each with evidenceIds and claimIds
  faqs: { q: string; a: string; sourceEnquiry: string }[]
  map: { kind: "link"; href: string } | null
}
```

If the owner approves richer office data (street, postcode, per-office phone, hours, profile URL), it is added to `Office` in `lib/site-config.ts` as optional fields filled only after verification, so the footer, the homepage Organization data and the page can never disagree. That change touches the config file and needs owner approval (L-D1, L-D2).

## 4. Publication gate (enforced by tests when the first page is added)

A path may enter `LIVE_PAGES` only if:

1. `status` is `approved`, and L1 and L15 are on record.
2. Every `evidenceIds` entry has an evidence-log entry with a source and approver; all `publication`-blocking items for the office are closed.
3. Every `claimIds` entry is `approved` in `lib/claims.ts`.
4. Title, description, H1 and sections pass the claim scan and use no held keyword.
5. Its keywords are mapped once and no other page targets them.
6. The unique-content gate passes (L14): sibling pages share no more than the agreed share of sentences.
7. All internal links resolve to published routes or existing anchors.

`LIVE_PAGES` stays the single source for metadata, sitemap and robots. Its `path` type is widened from `"/" | "/blog"` to also accept `/locations/${LocationSlug}` (shared with the service-page proposal). `canonicalUrl` needs the slash-less rule for every path.

## 5. Page component

One server component, `components/location-page.tsx`:

- H1 and intro, then an office-details block from `siteConfig` (same wording as `OfficeList`), phone links from `siteConfig.contact`.
- Optional sections in the brief's order; a section with no verified content is not rendered.
- Quote call to action linking to `siteConfig.quoteHref` (`/#contact`); no new form, so the enquiry flow is untouched.
- Service links only for `services` that have a published page.
- Photos only through `resolvePhoto`, so clearance still decides visibility.
- No client JavaScript. A map is a plain link unless an embed is approved (L11).

## 6. Structured data

`buildLocationJsonLd(content, office)` beside `buildHomeJsonLd`, emitting one LocalBusiness node per page following `structured-data-requirements.md`: name and address identical to the homepage Organization `location` entry, `parentOrganization` referencing the Organization `@id`, and optional properties only when the content file holds verified values. Serialise with `serializeJsonLd`.

## 7. Internal linking

- Page to homepage and enquiry: `/` and `/#contact`.
- Page to the other published office pages and to confirmed, published service pages.
- Homepage to location pages: the homepage offices block currently has no links. Linking it changes frozen components (`components/site-footer.tsx`, the contact section) and needs owner approval (L-D10).
- Service pages link to office pages only for offices confirmed to provide that service.

## 8. Tests to add with the first page

- Keyword mapping: each location keyword is on exactly one page; documented re-maps (KW-093, KW-094) match the owner's decision.
- Slugs: `migori` and any unlisted slug return 404; the sitemap contains only published locations.
- NAP: rendered name and address equal `siteConfig` and the structured-data node, character for character.
- Metadata: lengths, uniqueness, brand suffix, canonical equals sitemap URL (slash-less).
- Claims: no unsupported claim in page text; every `claimIds` entry approved; no hours unless `hours` is set.
- Structured data: parses, references the Organization `@id`, contains none of the `never-until-evidenced` properties.
- Uniqueness: sibling pages share no more than the agreed share of sentences.
- Regression: homepage, Blog noindex, existing sitemap entries, robots and the enquiry flow unchanged.

## 9. Rollout per page

1. NAP, hours, service area and services verified and logged; owner decisions answered.
2. Content file added with status `approved`.
3. `LIVE_PAGES` entry, route (first page only) and tests in the same pull request.
4. Homepage link change only with owner approval.
5. Crawl, tracking test, structured-data validation and the acceptance checklist completed before merge.

## 10. Deliberately not done in this milestone

No route, component, content file, sitemap entry, navigation or structured-data change. No change to the homepage, footer, enquiry form or API, or to `lib/site-config.ts`.
