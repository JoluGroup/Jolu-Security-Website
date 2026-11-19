# SEO implementation matrix (Milestone 5)

Source: `Jolu_Security_SEO_Keyword.xlsx` (10 sheets). Generated data lives in `lib/seo/planned-pages.ts`.

Rules applied
- No search volume, keyword difficulty, CPC, traffic or ranking figure appears anywhere: the workbook marks them "Not validated".
- Public brand is `JOLU SECURITY`. The workbook's draft suffix "Jolu Group Security" is not used.
- One search intent maps to one primary URL. Planned pages are NOT published, NOT in the sitemap and NOT in navigation, because the content they need (service proof, verified location details, customer evidence) does not exist yet. Publishing them now would create thin or doorway pages.
- Keywords flagged claim-sensitive (licensing, superlative or quality, availability or response time, pricing) must not be written into copy until the claim is evidenced and approved in `lib/claims.ts`.

## Existing routes (live)

| Route | Indexable | Title | Canonical | In sitemap |
|---|---|---|---|---|
| `/` | yes | Security Companies in Kenya \| JOLU SECURITY | `https://www.jolusecurity.com` | yes |
| `/blog` | no (noindex, follow; placeholder) | Blog \| JOLU SECURITY | `https://www.jolusecurity.com/blog` | no |

Homepage primary keyword: "security companies in Kenya" (workbook PAGE MAP, cluster "Security Companies").

## Proposed routes (planned, unpublished)

| Path | Type | Priority | Primary keyword | Intent | Geography | Draft title | Workbook keywords | Claim-sensitive |
|---|---|---|---|---|---|---|---|---|
| `/services/alarm-response/` | service | P2 | alarm response services in Kenya | Transactional | Kenya, Nairobi, Nakuru, Rongo, Migori | Alarm Response Services in Kenya | JOLU SECURITY | 31 | 6 |
| `/services/cctv-installation/` | service | P1 | CCTV installation in Kenya | Transactional | Kenya, Nairobi, Nakuru, Rongo, Migori | CCTV Installation in Kenya | JOLU SECURITY | 37 | 3 |
| `/services/electric-fencing/` | service | P1 | electric fence installation in Kenya | Transactional | Kenya, Nairobi, Nakuru, Rongo, Migori | Electric Fence Installation in Kenya | JOLU SECURITY | 34 | 3 |
| `/services/events-security/` | service | P2 | event security services in Kenya | Transactional | Kenya, Nairobi, Nakuru, Rongo, Migori | Event Security Services in Kenya | JOLU SECURITY | 34 | 0 |
| `/services/k9-unit-services/` | service | P2 | security dog services in Kenya | Transactional | Kenya, Nairobi, Nakuru, Rongo, Migori | Security Dog Services in Kenya | JOLU SECURITY | 31 | 0 |
| `/services/manned-guarding/` | service | P1 | security guard services in Kenya | Transactional | Kenya, Nairobi, Nakuru, Rongo, Migori | Security Guard Services in Kenya | JOLU SECURITY | 52 | 6 |
| `/services/vip-close-protection/` | service | P2 | VIP close protection in Kenya | Transactional | Kenya, Nairobi, Nakuru, Rongo, Migori | VIP Close Protection in Kenya | JOLU SECURITY | 31 | 0 |
| `/locations/migori/` | location | P2 | security companies in migori | Commercial | Migori | Security Companies in Migori | JOLU SECURITY | 2 | 0 |
| `/locations/nairobi/` | location | P1 | security company in Nairobi | Commercial | Nairobi, Local | Security Company in Nairobi | JOLU SECURITY | 9 | 1 |
| `/locations/nakuru/` | location | P1 | security company in Nakuru | Commercial | Nakuru | Security Company in Nakuru | JOLU SECURITY | 2 | 0 |
| `/locations/rongo/` | location | P2 | security company in Rongo | Commercial | Rongo | Security Company in Rongo | JOLU SECURITY | 2 | 0 |
| `/industries/commercial/` | industry | P2 | commercial security services in kenya | Commercial | Kenya, Nairobi, Nakuru | Commercial Security Services in Kenya | JOLU SECURITY | 3 | 0 |
| `/industries/construction/` | industry | P2 | construction site security services in kenya | Commercial | Kenya, Nairobi, Nakuru | Construction Security Services in Kenya | JOLU SECURITY | 3 | 0 |
| `/industries/educational/` | industry | P2 | school security services in kenya | Commercial | Kenya, Nairobi, Nakuru | Educational Security Services in Kenya | JOLU SECURITY | 3 | 0 |
| `/industries/hospitality/` | industry | P2 | hotel security services in kenya | Commercial | Kenya, Nairobi, Nakuru | Hospitality Security Services in Kenya | JOLU SECURITY | 3 | 0 |
| `/industries/residential/` | industry | P2 | residential security services in kenya | Commercial | Kenya, Nairobi, Nakuru | Residential Security Services in Kenya | JOLU SECURITY | 3 | 0 |
| `/industries/retail/` | industry | P2 | retail security services in kenya | Commercial | Kenya, Nairobi, Nakuru | Retail Security Services in Kenya | JOLU SECURITY | 3 | 0 |

## Supporting keywords per planned page (workbook IDs)

### `/services/alarm-response/`

Draft description: Alarm response services in Kenya from JOLU SECURITY. Request a quote.

Workbook caution: Audit existing URL; slug is illustrative

- KW-063 alarm response services in nairobi [P1]
- KW-065 alarm response services in nakuru [P1]
- KW-234 alarm response company in nairobi [P1]
- KW-237 security alarm response in nairobi [P1]
- KW-240 rapid alarm response in nairobi [P1] (claim-sensitive: availability or response time)
- KW-243 intruder alarm response in nairobi [P1]
- KW-246 24 hour alarm response in nairobi [P1] (claim-sensitive: availability or response time)
- KW-249 alarm monitoring services in nairobi [P1]
- KW-252 security alarm services in nairobi [P1]
- KW-062 alarm response services kenya [P2]

### `/services/cctv-installation/`

Draft description: CCTV installation in Kenya from JOLU SECURITY. Request a quote.

Workbook caution: Audit existing URL; slug is illustrative

- KW-043 cctv installation in nairobi [P1]
- KW-045 cctv installation in nakuru [P1]
- KW-183 cctv camera installation in nairobi [P1]
- KW-186 cctv installers in nairobi [P1]
- KW-189 cctv installation cost in nairobi [P1] (claim-sensitive: pricing)
- KW-192 cctv maintenance services in nairobi [P1]
- KW-195 commercial cctv installation in nairobi [P1]
- KW-198 home cctv installation in nairobi [P1]
- KW-201 cctv surveillance systems in nairobi [P1]
- KW-204 cctv camera installation company in nairobi [P1]

### `/services/electric-fencing/`

Draft description: Electric fence installation in Kenya from JOLU SECURITY. Request a quote.

Workbook caution: Audit existing URL; slug is illustrative

- KW-053 electric fence installation in nairobi [P1]
- KW-055 electric fence installation in nakuru [P1]
- KW-210 electric fence installers in nairobi [P1]
- KW-213 electric fence installation cost in nairobi [P1] (claim-sensitive: pricing)
- KW-216 electric fence maintenance in nairobi [P1]
- KW-219 electric fence repair in nairobi [P1]
- KW-222 perimeter electric fencing in nairobi [P1]
- KW-225 residential electric fencing in nairobi [P1]
- KW-228 commercial electric fence installers in nairobi [P1]
- KW-231 electric fence company in nairobi [P1]

### `/services/events-security/`

Draft description: Event security services in Kenya from JOLU SECURITY. Request a quote.

Workbook caution: Audit existing URL; slug is illustrative

- KW-023 event security services in nairobi [P1]
- KW-025 event security services in nakuru [P1]
- KW-138 event security guards in nairobi [P1]
- KW-141 concert security services in nairobi [P1]
- KW-144 wedding security services in nairobi [P1]
- KW-147 corporate event security in nairobi [P1]
- KW-150 conference security services in nairobi [P1]
- KW-153 crowd control security in nairobi [P1]
- KW-156 festival security guards in nairobi [P1]
- KW-159 event access control in nairobi [P1]

### `/services/k9-unit-services/`

Draft description: Security dog services in Kenya from JOLU SECURITY. Request a quote.

Workbook caution: Audit existing URL; slug is illustrative

- KW-033 security dog services in nairobi [P1]
- KW-035 security dog services in nakuru [P1]
- KW-162 k9 security services in nairobi [P1]
- KW-165 security dog handlers in nairobi [P1]
- KW-168 guard dog services in nairobi [P1]
- KW-171 canine security services in nairobi [P1]
- KW-174 dog patrol security in nairobi [P1]
- KW-177 security dog unit in nairobi [P1]
- KW-180 k9 patrol services in nairobi [P1]
- KW-032 security dog services kenya [P2]

### `/services/manned-guarding/`

Draft description: Security guard services in Kenya from JOLU SECURITY. Request a quote.

Workbook caution: Audit existing URL; slug is illustrative

- KW-013 security guard services in nairobi [P1]
- KW-015 security guard services in nakuru [P1]
- KW-096 residential security guards in nairobi [P1]
- KW-099 commercial security guards in nairobi [P1]
- KW-102 industrial security guards in nairobi [P1]
- KW-105 office security guards in nairobi [P1]
- KW-108 estate security guards in nairobi [P1]
- KW-111 apartment security guards in nairobi [P1]
- KW-114 warehouse security guards in nairobi [P1]
- KW-117 school security guards in nairobi [P1]

### `/services/vip-close-protection/`

Draft description: VIP close protection in Kenya from JOLU SECURITY. Request a quote.

Workbook caution: Audit existing URL; slug is illustrative

- KW-073 vip close protection in nairobi [P1]
- KW-075 vip close protection in nakuru [P1]
- KW-255 bodyguard services in nairobi [P1]
- KW-258 executive protection services in nairobi [P1]
- KW-261 close protection services in nairobi [P1]
- KW-264 personal security guards in nairobi [P1]
- KW-267 vip security services in nairobi [P1]
- KW-270 private bodyguard hire in nairobi [P1]
- KW-273 corporate executive protection in nairobi [P1]
- KW-072 vip close protection kenya [P2]

### `/locations/migori/`

Draft description: JOLU SECURITY security services in Migori. Contact the Migori office to discuss your requirements.

Workbook caution: Not in the workbook page map; keyword master suggests this URL. Verify before any use.

- KW-010 security companies migori [P2]

### `/locations/nairobi/`

Draft description: JOLU SECURITY security services in Nairobi. Contact the Nairobi office to discuss your requirements.

Workbook caution: Publish only if unique content and actual service area verified

- KW-003 security companies in nairobi [P1]
- KW-082 top security companies in nairobi [P1] (claim-sensitive: superlative or quality)
- KW-084 private security firms in nairobi [P1]
- KW-086 security company near me [P1]
- KW-087 security guard company near me [P1]
- KW-088 hire security guards in nairobi [P1]
- KW-093 security company in nakuru town [P1]
- KW-094 private security company in migori [P1]
- KW-004 security companies nairobi [P2]

### `/locations/nakuru/`

Draft description: JOLU SECURITY security services in Nakuru. Contact the Nakuru office to discuss your requirements.

Workbook caution: Publish only if unique content and actual service area verified

- KW-005 security companies in nakuru [P1]
- KW-006 security companies nakuru [P2]

### `/locations/rongo/`

Draft description: JOLU SECURITY security services in Rongo. Contact the Rongo office to discuss your requirements.

Workbook caution: Publish only if unique content and actual service area verified

- KW-007 security companies in rongo [P2]
- KW-008 security companies rongo [P2]

### `/industries/commercial/`

Draft description: JOLU SECURITY security for the commercial sector in Kenya. Request a quote.

Workbook caution: Proposed new URL; verify service capability and case studies

- KW-279 commercial security services in nairobi [P2]
- KW-280 commercial security services in nakuru [P2]

### `/industries/construction/`

Draft description: JOLU SECURITY security for the construction sector in Kenya. Request a quote.

Workbook caution: Proposed new URL; verify service capability and case studies

- KW-291 construction site security services in nairobi [P2]
- KW-292 construction site security services in nakuru [P2]

### `/industries/educational/`

Draft description: JOLU SECURITY security for the educational sector in Kenya. Request a quote.

Workbook caution: Proposed new URL; verify service capability and case studies

- KW-282 school security services in nairobi [P2]
- KW-283 school security services in nakuru [P2]

### `/industries/hospitality/`

Draft description: JOLU SECURITY security for the hospitality sector in Kenya. Request a quote.

Workbook caution: Proposed new URL; verify service capability and case studies

- KW-288 hotel security services in nairobi [P2]
- KW-289 hotel security services in nakuru [P2]

### `/industries/residential/`

Draft description: JOLU SECURITY security for the residential sector in Kenya. Request a quote.

Workbook caution: Proposed new URL; verify service capability and case studies

- KW-276 residential security services in nairobi [P2]
- KW-277 residential security services in nakuru [P2]

### `/industries/retail/`

Draft description: JOLU SECURITY security for the retail sector in Kenya. Request a quote.

Workbook caution: Proposed new URL; verify service capability and case studies

- KW-285 retail security services in nairobi [P2]
- KW-286 retail security services in nakuru [P2]

## Workbook discrepancies and unsupported items

- Brand: workbook uses "Jolu Group Security"; approved brand is JOLU SECURITY.
- Title casing in workbook drafts was malformed (for example "Cctv", "Vip"); corrected in generated drafts.
- Workbook draft descriptions use unsupported wording ("Professional", "tailored security assessment"); replaced by neutral drafts. Live homepage description was written for this site.
- Rongo and Migori appear as separate geographies for one office ("Near KENGAS Rongo, Migori"); not split into two pages. Migori has no entry in PAGE MAP.
- 31 of 311 keywords are claim-sensitive (licensing, superlatives such as "best" and "top", availability or response time such as "24 hour" and "rapid", pricing such as "cost").
- All metrics are "Not validated" and LOCAL SEO items are "Not started": no number from the workbook is used.
- Editorial calendar pieces need expert review and fact-checking before publication; the Blog stays a noindex placeholder.

## Missing content before any planned page can be published

- Service proof per service (what is actually delivered, how, where) approved by the owner.
- Verified name, address and phone for each office before any location page or local business markup beyond the current Place entries.
- Real customer evidence (none is used or fabricated).
- Approved evidence for any licensing, certification, availability or response-time statement.

## Implemented on existing routes

Per-page title, description, canonical, Open Graph and Twitter metadata; Organization and WebSite JSON-LD with offices and the existing seven services; `app/sitemap.ts` and `app/robots.ts` generated from `lib/seo/pages.ts`; removal of `public/robots.txt`; Blog kept noindex and out of the sitemap.

## Not in structured data (nothing verified supports it)

Ratings, reviews, opening hours, price range, geo coordinates, social profiles, licence numbers, FAQ markup.
