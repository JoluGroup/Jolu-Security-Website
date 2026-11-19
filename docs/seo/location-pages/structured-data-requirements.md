# Structured-data requirements for location pages

Status: REQUIREMENTS ONLY. No markup is added in this milestone. The homepage keeps its existing Organization and WebSite data, whose `location` list already carries each office's name and address.

Google's documentation was not re-checked in this milestone (web access was unavailable). Re-verify the property lists and rich-result eligibility against Google's current documentation before implementing.

## Principles

- One LocalBusiness node per location page, for that office only.
- Every value must also be visible on the page and come from lib/site-config.ts or an evidence-logged source.
- Never mark up what is not verified: hours, coordinates, ratings, reviews, price range, licences and awards stay out until evidenced.
- The node's name and address must equal the Organization.location entry on the homepage and the Google Business Profile.
- Serialise with the existing serializeJsonLd.

## Property rules

| Property | Treatment | Requirement | Evidence |
| --- | --- | --- | --- |
| @type LocalBusiness | include-when-verified | Use the generic LocalBusiness type. A more specific subtype only if the owner and SEO lead confirm it describes the office accurately. | L1, L2 |
| @id | include-when-verified | <canonical URL>#localbusiness, one per page. Never three offices on one page. | L1 |
| name | include-when-verified | Equal to the verified business name, and to the Organization.location name already on the homepage. | L2 |
| parentOrganization | include-when-verified | Reference to the existing Organization @id (https://www.jolusecurity.com/#organization). | L1 |
| url | include-when-verified | The slash-less canonical URL of the page. | L13 |
| address (PostalAddress) | include-when-verified | streetAddress, addressLocality and addressCountry from the verified NAP, identical to the visible address. addressRegion and postalCode only if verified; never inferred. | L2 |
| telephone | include-when-verified | The verified office number in E.164 form, visible on the page. | L7 |
| email | include-when-verified | The existing company address, only if shown on the page. | L2 |
| areaServed | include-when-verified | Only the verified service area list. | L4 |
| openingHoursSpecification | omit-by-default | Only days and hours confirmed by the local manager and shown on the page. No 24-hour value as a stand-in for service availability. | L3 |
| geo | omit-by-default | Only coordinates taken from the verified address. | L2 |
| hasMap | omit-by-default | Only when a map link exists on the page (L11). | L11 |
| sameAs | omit-by-default | Only the verified Google Business Profile or other profile URL the business owns. | L6 |
| image | omit-by-default | Only a rights-cleared photo shown on the page. | L9 |
| makesOffer / hasOfferCatalog | omit-by-default | Only services confirmed for the office (L5), with name and existing description, and no price. | L5 |
| priceRange | never-until-evidenced | A price statement; pricing content is not approved. | L1 |
| aggregateRating / review | never-until-evidenced | No reviews exist on the site; self-published review markup is not allowed. Only genuine, displayed, compliant reviews, via a separate approved process. | L10 |
| hasCredential / license / award | never-until-evidenced | Requires the PSRA evidence (L8) and the registry claim to be approved. | L8 |
| FAQPage | omit-by-default | Only for questions and answers that are visible on the page and owner-approved. Rich-result eligibility for FAQ is restricted by Google (to be re-verified), so it is not a reason to add FAQs. | L14 |
| BreadcrumbList | omit-by-default | Omitted: there is no /locations index page and no visible breadcrumb. Adding either changes the frozen design. | L15 |

## Eligibility today

| Page | LocalBusiness eligible now | Blocked by |
| --- | --- | --- |
| `/locations/nairobi/` | No | L1, L2, L7, NBO1 |
| `/locations/nakuru/` | No | L1, L2, L7, NAK1 |
| `/locations/rongo/` | No | L1, L2, L7, RON1, RON2 |

## Graph shape when eligible

`@graph` containing one LocalBusiness whose `parentOrganization` is `{ "@id": "https://www.jolusecurity.com/#organization" }`. No FAQPage, BreadcrumbList, Review or AggregateRating until their conditions in the table are met.

## Validation

Rich Results Test and a schema validator on each page, with the output attached to the publishing checklist (TECHNICAL AUDIT: 'No invalid or misleading markup').
