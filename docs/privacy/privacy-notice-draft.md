# Privacy notice: INTERNAL DRAFT (not for publication)

> **Status: DRAFT. Do not publish.** Every `[[VERIFY: ...]]` marker is an input that management or legal must supply or confirm. No route serves this text. Final approval of the notice is production release gate item `PRG-01` (`lib/seo/release-gates.ts`). The notice is written from the website's actual processing as implemented at Release 04B; anything planned but not active is labelled as such.

Facts below were taken from the code: `components/enquiry-form.tsx`, `app/api/enquiry/route.ts`, `lib/enquiry/*`, `lib/analytics/*`, `next.config.ts`. They describe the website only, not any other system the company uses.

---

## Who we are

This website is operated by [[VERIFY: registered legal name of the data controller, registration number and postal address; questionnaire A01 and A09]], trading as JOLU SECURITY ("we").

Contact for privacy questions: [[VERIFY: privacy contact, for example info@jolusecurity.com, and whether a data protection officer is appointed]].

[[VERIFY: whether the company is registered with the Office of the Data Protection Commissioner (Kenya), and the registration number if so. Do not state a registration that has not been confirmed.]]

## What we collect when you send an enquiry

When you use the enquiry form, you give us:

- your name, phone number and email address;
- the service you are interested in, your county and town;
- the details you write in the message box;
- optionally, how you heard about us (a choice from a fixed list).

You must tick a box agreeing that we may use these details to respond to your enquiry before the form can be sent.

## What happens to it

- **Email to our team.** Your enquiry is sent as an email to our enquiry inbox [[VERIFY: recipient mailbox and the provider that hosts it]] through Resend, an email delivery service. The email's reply-to address is the email address you gave, so our reply comes straight to you. The email contains the details listed above and a reference number.
- **We do not store enquiries in a website database.** The website keeps no copy of your message after sending it. [[VERIFY: how long the enquiry email is kept in the company mailbox, who can read it, and when it is deleted. The website code sets no retention for the mailbox.]]
- **Duplicate protection.** To avoid sending the same enquiry twice, the website stores a one-way keyed fingerprint of the enquiry (an HMAC, from which the content cannot be read back) and the reference number, for 10 minutes, in Upstash Redis. A short lock entry exists for up to 30 seconds while an enquiry is being sent.
- **Abuse protection.** To prevent spam, the website counts enquiries per sender for 10 minutes. The counter is keyed by a one-way keyed hash of the network address the request came from; the address itself is not stored. Site-wide counters (per hour and per day) hold numbers only. All counters expire automatically.
- **Service logs.** The hosting platform records operational log lines for each enquiry attempt: the outcome (for example accepted, rejected, rate-limited), the reference number and, for accepted enquiries, the "how did you hear about us" answer. Names, phone numbers, email addresses and messages are not written to these logs. [[VERIFY: Vercel log retention for the plan in use.]]
- **Hidden spam field.** The form contains a hidden field that people do not see. If it is filled in, the request is discarded.

## Service providers

| Provider | Purpose | Data | Location |
| --- | --- | --- | --- |
| Vercel | Hosts the website and runs the enquiry handler | Request data in transit; operational logs | [[VERIFY: region and transfer safeguards]] |
| Resend | Sends the enquiry email to our inbox | The enquiry content | [[VERIFY: region and transfer safeguards]] |
| Upstash (Redis) | Duplicate protection and rate limits | Keyed fingerprints, reference numbers, counters (no readable enquiry content) | [[VERIFY: database region]] |
| [[VERIFY: mailbox provider]] | Stores the enquiry email we receive | The enquiry content | [[VERIFY]] |

[[VERIFY: whether data-processing terms are in place with each provider. Do not state that agreements exist until confirmed.]]

## Why we use your information

To respond to your enquiry, arrange a site assessment if you ask for one, and prepare a written proposal. [[VERIFY: the legal basis under the Data Protection Act, 2019 that legal counsel approves for this processing.]] We do not use enquiry details for marketing unless you separately agree. [[VERIFY: confirm this matches company practice.]]

## Cookies and analytics

**Today:** the website sets no cookies of its own and uses no browser storage for tracking. No analytics or advertising script is installed.

**Planned (not active):** the site contains analytics code that is switched off. It can only run after a Google Analytics measurement ID is configured AND you have given consent through a consent banner that does not exist yet. If it is ever switched on, it would record page paths, which service an enquiry concerns, the "how did you hear about us" answer and which kind of contact link was clicked. It is designed never to send names, phone numbers, email addresses or message text. This section must be rewritten and approved before analytics is activated.

## Your rights

[[VERIFY: legal counsel to state the data subject rights under the Data Protection Act, 2019 and how to exercise them, including the right to complain to the Office of the Data Protection Commissioner.]]

## Security

The enquiry handler validates every field on the server, limits request size and rate, refuses cross-origin submissions and fails closed if its protection services are unavailable. Data in transit uses HTTPS.

## Changes

[[VERIFY: effective date and version, set at approval.]]

---

## Unresolved inputs (for management and legal)

| # | Input needed | Questionnaire | Owner |
| --- | --- | --- | --- |
| P1 | Data controller legal name, registration number and address | A01, A09 | Management / legal |
| P2 | ODPC registration status and number, if any | A09 | Legal |
| P3 | Privacy contact and any data protection officer | A09 | Management |
| P4 | Mailbox provider, who can read enquiries, retention period | A05, A10 | Management / IT |
| P5 | Legal basis for enquiry processing | - | Legal |
| P6 | Data-processing terms with Vercel, Resend, Upstash and the mailbox provider | - | Legal |
| P7 | Hosting, email and Redis regions; international transfer safeguards | - | IT / legal |
| P8 | Vercel log retention on the commercial plan | - | IT |
| P9 | Data subject rights wording and complaint route | - | Legal |
| P10 | Marketing use of enquiry details (expected: none) | - | Management |
| P11 | Consent banner and analytics section, before any analytics activation | - | Management / legal |

## Route architecture (prepared, not built)

When approved, the notice is published at `/privacy` as a static page linked from the footer and from the enquiry form's consent text. Adding the route is a frozen-file change (`app/` is protected) and must arrive in the same reviewed change as the approved text, with no `[[VERIFY` marker remaining.
