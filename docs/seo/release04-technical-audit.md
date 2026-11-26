# Release 04 technical SEO audit (Lane SEO)

Candidate: branch `release04/seo`, base `6d05e8e` (Release 03B). Audit date 2026-11-26.

## Method and limits

- Built the candidate with `next build` in a **throwaway copy** that swaps the three Google Fonts for local font files (`/home/claude/wt/r04-tools/build.sh`). The workaround is not in the repository. The unmodified `app/layout.tsx` still needs Google Fonts at build time; a plain `next build` is therefore expected to fail only when Google Fonts is unreachable.
- Started the production server (`next start`) and fetched the **initial HTML** with `curl` (no JavaScript). Also rendered the same pages with the repository's test renderer (`tests/content/render-helper.mjs`), which is what the new tests use.
- The AEO workbook's audit rows A11 and A12 describe the **legacy live site** (fetch of 2026-11-24). They were checked against this candidate, not assumed. No live site, Search Console, Bing Webmaster Tools or AI platform was accessed; findings that need those (A09, A10, A14, prompt tests) remain open and are listed as such.

## Routes in the built candidate

| Route | Type | HTTP | Indexable | Notes |
| --- | --- | --- | --- | --- |
| `/` | static | 200 | yes | one H1, 5.4k characters of body text, JSON-LD (Organization, WebSite) |
| `/blog` | static | 200 | no (`noindex, follow`) | placeholder, one H1, canonical `https://jolusecurity.com/blog` |
| `/blog/` | redirect | 308 to `/blog` | n/a | trailing slash is not configured (see below) |
| `/sitemap.xml` | metadata route | 200 | n/a | lists only `https://jolusecurity.com` |
| `/robots.txt` | metadata route | 200 | n/a | `Allow: /`, `Disallow: /api/`, sitemap on the apex |
| `/manifest.webmanifest` | static file | 200 | n/a | name and short name `JOLU SECURITY` |
| `/api/enquiry` | route handler | POST only | n/a | outside this lane |
| `/services/*`, `/locations/*`, `/industries/*`, `/insights/*`, `/about` | none | 404 | n/a | nothing planned or drafted is reachable |
| any unknown path | not found | 404 | noindex | the framework 404 page carries `noindex` |

Static public files also served: `/brand/*` (icons and the 1200x630 social image), `/lovable-uploads/jolu-logo.png` (the approved logo), and the unreferenced Next.js template files (`next.svg`, `vercel.svg`, `file.svg`, `globe.svg`, `window.svg`, `placeholder.svg`).

## Per-route checks (initial HTML)

| Check | `/` | `/blog` |
| --- | --- | --- |
| `<title>` | `JOLU SECURITY \| Professional Security Services` (the approved homepage title, unchanged) | `Blog \| JOLU SECURITY` |
| meta description | present, 148 characters, no claim | present, no claim |
| canonical | `https://jolusecurity.com` (apex, no trailing slash) | `https://jolusecurity.com/blog` |
| `og:url` | equals canonical | equals canonical |
| robots meta | none (default index, follow) | `noindex, follow` |
| H1 | exactly one: "Confidence in every layer of protection." | exactly one: "Articles are on the way" |
| body copy in the first response | yes (hero copy, seven services, six industries, values, contact block, enquiry form labels) | yes |
| JSON-LD | one script: Organization + WebSite, no unverified property | none |
| social image | `https://jolusecurity.com/brand/jolu-preview.png`, 1200x630, alt text, `summary_large_image` | same |
| template-builder tags | none (no `generator`, `author`, `twitter:site`, builder handles) | none |
| zero-valued counters | none (see note) | none |
| unsupported statistics | none (no years, guard counts, client counts) | none |

Note on counters: the only zero-valued text node is `Layer 00 / 05` in the scroll-stage position indicator (`components/stage-hud.tsx`), an index into the five hero layers. It is not a company statistic. The Release 03 design is frozen, so it is left as is; `tests/seo/technical-seo.test.mjs` allows exactly that node and fails on any other zero-valued counter.

## Trailing slash, canonical and redirects

- `next.config.ts` does not set `trailingSlash`, so canonical public paths have **no trailing slash** and `/blog/` answers `308` to `/blog`. The workbook proposes `/services/<slug>/` with a trailing slash; every planned path is normalised by `stripSlash` in `lib/seo/route-architecture.ts`.
- The homepage canonical and the sitemap entry are the same string (`https://jolusecurity.com`).
- Query strings (`/?utm=x`) answer 200 and keep the self-referencing canonical.
- Known harmless quirk: the framework 404 document contains two `<title>` elements (the 404 title and the default title). Both are in a `noindex`, HTTP 404 response, so it has no indexing effect. Not changed (framework behaviour).

## Sitemap and robots

- Sitemap: only live, canonical, indexable, published routes (`/`). `/blog` (noindex), planned pages, drafts and the seven built-but-unpublished service pages are absent. No `lastModified` (no reliable date exists).
- Robots policy is **unchanged**: `User-agent: *`, `Allow: /`, `Disallow: /api/`. The Blog is deliberately not disallowed so crawlers can see its `noindex`.
- Crawler classes (documentation only; no policy change is made). These are four different decisions, and a single `Allow: /` answers all of them as "yes":

| Class | Examples | What it does | Effect of blocking |
| --- | --- | --- | --- |
| Search | Googlebot, Bingbot, OAI-SearchBot, Claude-SearchBot | builds search indexes and answer-engine indexes | the site drops out of that search or answer product |
| AI retrieval / grounding | OAI-SearchBot (ChatGPT search), Claude-SearchBot | fetches pages so a product can cite them | fewer citations in that product |
| Training | GPTBot, ClaudeBot, Google-Extended (a control token, not a separate crawler) | collects content that may be used to train models | content is excluded from future training; search visibility is not affected |
| User-triggered | ChatGPT-User, Claude-User | fetches one page because a person asked an assistant about it | vendors say robots.txt may not apply to these visits |

  Sources read: OpenAI's bot documentation (`developers.openai.com/api/docs/bots`) and Anthropic's crawler help article. The Google tokens are stated from general knowledge and were not re-verified here. The owner should decide the training and retrieval policy separately; until then the existing open policy stands. Any change belongs in `app/robots.ts` with its test.

## Structured data

- Homepage: Organization and WebSite with stable `@id` values (`https://jolusecurity.com/#organization`, `/#website`). Contacts are the verified `info@jolusecurity.com`, `+254 790 298 003`, `+254 705 038 679`. Absent by design: address, `areaServed`, `sameAs`, parent organisation, licence, ratings, hours, prices, LocalBusiness.
- Refactor in this lane: `buildOrganizationCore()` is now exported from `lib/seo/json-ld.ts` and reused by service pages; the homepage output is unchanged (existing tests plus a new comparison test).
- Service pages (built, unpublished): Organization, Service (provider by `@id`, no `areaServed`), BreadcrumbList (Home, then the service; there is no `/services` index route, so none is claimed), FAQPage built from the same objects as the visible FAQ. LocalBusiness is not emitted: no location is eligible (`eligibleLocalBusinessLocations()` is empty).
- Serialisation escapes `<`, U+2028 and U+2029 (existing `serializeJsonLd`); the new tests embed hostile strings (`</script>`, `<!--`, separators, lone surrogates, NUL) in a real script element and prove the element does not end early, and that every inline `ld+json` script in `app/` and `components/` uses the serializer.
- Google's own FAQ documentation page states that the FAQ rich result is **no longer shown in Google Search** (changelog entries of May and June 2026; read from the first 100,000 of about 201,000 characters of the page). FAQPage markup remains valid schema.org and is kept because the visible FAQ is genuine buyer content, but it must not be sold internally as a Google rich-result tactic.

## AEO workbook audit rows against this candidate

| Row | Finding about the legacy site | Candidate result |
| --- | --- | --- |
| A01 entity | name forms and services | one public identity `JOLU SECURITY`; seven services listed identically in copy, navigation, JSON-LD |
| A02 locations | Nairobi, Nakuru, Rongo listed | not listed anywhere in public copy or markup; offices stay `needs-evidence` |
| A03 trust | "licensed and compliant" claimed | not present; every claim in `lib/claims.ts` is `needs-evidence` and the gate refuses licensing copy without a verified claim (new tests) |
| A04 zero counters | counters showing zero | not present (see counter note) |
| A05, A06 | guarding and VIP pages without FAQ or cost guidance | no such routes yet; both pages are now built answer-first and gated (unpublished) |
| A07, A08, A14 | third-party listing, group launch, search visibility | off-site; not testable here, open |
| A09 | robots, sitemap, canonical, schema, indexing unknown | robots, sitemap, canonical and schema verified on the build; Search Console and Bing status remain open |
| A10 | analytics | other lane (`lib/analytics`, enquiry) |
| A11 | initial fetch returned no body text | **not reproduced**: H1 and 5.4k characters of body text are in the first response |
| A12 | builder author tag and Twitter site handle | **not reproduced**: no such tags; unique title, description, canonical, Open Graph and Twitter metadata |
| A13 | several name forms | none in public output; a new test fails on `Jolu Group Security`, `Jolu Group Ltd Security`, `Jolu Group Security Ltd` in metadata, JSON-LD, rendered HTML and drafts. The legal name decision (T25) is still an owner decision |
| A15 | competitors publish location pages and cost ranges | location pages are gated; cost guidance is built without prices (budget-factor tables) |

## Defects found and what was done

Genuine defects were few, because Release 03 already server-renders everything.

1. **Workbook keyword rows pointing at the wrong location page** (KW-093 "security company in nakuru town" and KW-094 "private security company in migori" were suggested for `/locations/nairobi/`; KW-086 and KW-087 "near me" were pinned to Nairobi). Fixed by an explicit, reasoned overlay in `lib/seo/route-architecture.ts` (KEYWORD_OVERRIDES); the generated workbook data is untouched. Net effect: Nairobi 5, Nakuru 3, Rongo 5 keywords; the two "near me" rows are unassigned.
2. **Cost and licensing wording cannot be unlocked by the publication gate**: no claim in `lib/seo/claim-scope.ts` covers the pricing category, and the only licensing claim (`licensed-compliant`) would assert a licence. Cost-driver and regulator-reference text therefore cannot pass the gate today. Not worked around; recorded in the inventory as an owner decision.
3. No other defect in title, description, canonical, `og:url`, robots, H1, body copy, JSON-LD or social image.

## Observations not changed (outside this lane or frozen)

- The logo URL (`/lovable-uploads/jolu-logo.png`) is in the Organization JSON-LD and exposes a template-builder directory name. Renaming it touches the asset inventory, asset tests and several components; recommend a later asset change with a redirect.
- Unreferenced Next.js template SVGs and `placeholder.svg` are publicly served. Harmless but untidy; governed by `docs/assets/inventory.md`.
- Visible brand text in the Release 03 design uses "Jolu Security" in sentence case in places; the metadata, structured data and manifest use `JOLU SECURITY`. Changing visible copy is a design decision.
- `X-Powered-By: Next.js` response header is sent; unimportant for search.
