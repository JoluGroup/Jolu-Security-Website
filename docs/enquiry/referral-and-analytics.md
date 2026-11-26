# Referral source and analytics (Release 04, lane CONV)

## 1. referral_source ("How did you hear about us?")

- Optional select on the enquiry form. Options live in one place, `lib/enquiry/referral.ts` (`REFERRAL_SOURCES`, `ReferralSource`, `isReferralSource`), imported by both the form and `validateEnquiry`.
- Allowed labels: Google Search, ChatGPT / OpenAI, Google Gemini, Perplexity AI, Microsoft Copilot, LinkedIn / Social Media, Client Referral / Word of Mouth, Directory / Tender Portal, Other.
- Server rule: missing, `null` or `""` is accepted (old clients keep working). Any other value must match a label exactly, else the normal `400 {code:"invalid", errors:{referral_source:"Choose an option from the list."}}`. The submitted value is never echoed. There is no free-text path.
- Delivery: the plain-text email gets a line `How they heard about us: <label>` only when provided. The email has no HTML part today, so there is nothing to HTML-escape; if an HTML part is added later it must escape this like every other field.
- Logging: the `accepted` log line carries `referral: "<label>"` or `"none"`. Values are from the fixed allowlist, so no PII.

### Interaction with duplicate detection

The duplicate fingerprint is built by `canonicalEnquiry()` in `lib/enquiry/dedup.ts` from name, phone, email, service, county, town and details. `referral_source` is deliberately NOT part of it. Consequences:

- Re-submitting the same enquiry with only a different referral answer is a duplicate: same reference, no second email, no quota used.
- The referral label stored/emailed is the one from the first accepted submission.
- Per-client, hourly and daily limits are unchanged and still count real sends (tested).

## 2. Analytics (`lib/analytics/`)

Disabled by default. No script is installed and no network call is made unless BOTH:

1. `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set to a real GA4 measurement ID (format `G-XXXXXXXXXX`; malformed values count as unset). No ID exists in the code.
2. Consent has been granted via `setAnalyticsConsent(true)` (`lib/analytics/consent.ts`). The site currently has no consent banner, so consent defaults to DENIED and is in-memory only; the future consent UI must call it on each page load and on change. Revoking stops events and sets `ga-disable-<ID>`.

Modules: `events.ts` (event names + sanitizer, pure), `config.ts`, `consent.ts`, `client.ts` (`track`, `loadAnalytics`, `initAnalytics`; all errors swallowed, async script), `click-tracking.ts` (tel:/WhatsApp classification), `analytics-root.tsx` (self-contained mount).

Events: `generate_lead`, `phone_click`, `whatsapp_click`, `enquiry_attempt`, `enquiry_accepted`, `enquiry_uncertain`, `enquiry_rejected`.

- `generate_lead` fires only when the server answered HTTP 2xx with `state:"accepted"`. Never for validation errors, 429, 5xx, uncertain/network outcomes, or test mode. Note: a 2xx `duplicate:true` reply is also a confirmed acceptance and does count.
- Payload allowlist: `page_path` (path only, query/hash/origin stripped, rejected if it contains characters like `@` or `%`), `service` (service id), `referral_source` (label), `source_component` (enquiry_form/header/footer/nav/main/other). Everything else is dropped. Name, phone, email, message, references, tokens and URLs are never emitted. Link clicks record only the kind of link, never the number or URL.
- gtag config disables Google signals and ad personalization. GA4's automatic page_view still reports the full page location including any query string by default; configure data-stream settings accordingly.

### Status and integration

- Enquiry lifecycle events: WIRED in `components/enquiry-form.tsx` (no-ops while disabled).
- `phone_click` / `whatsapp_click`: IMPLEMENTED BUT UNWIRED. They need the delegated listener mounted. Integrator, one line in `app/layout.tsx` inside `<body>`: `<AnalyticsRoot />` with `import { AnalyticsRoot } from "@/lib/analytics/analytics-root"`. No other markup changes are required.
- External activation needed: a GA4 property and measurement ID supplied by the business, a consent policy/banner (and privacy notice update), and a CSP allowance for `googletagmanager.com` and `google-analytics.com` if a CSP is added.
