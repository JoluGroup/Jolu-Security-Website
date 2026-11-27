# Trusted client IP on Vercel (`ENQUIRY_TRUSTED_PROXY=vercel`)

Research date: 2026-11-23. Sources were read on that date; Vercel pages can change. Nothing was tested against a
live deployment (not permitted in this lane), so every conclusion rests on documentation.

## Verdict

- Direct to Vercel (no proxy in front, including Cloudflare "DNS only" / grey cloud): the headers are overwritten
  by Vercel, a client cannot spoof them. Enabling `vercel` mode is SAFE ONLY UNDER THAT CONDITION, per the docs,
  and still unproven empirically for this project.
- Cloudflare proxied (orange cloud) in front of Vercel: a client still cannot inject an arbitrary identity via
  these headers (Vercel overwrites them with what it sees), but the identity Vercel sees is Cloudflare's egress
  address, not the visitor. `vercel` mode would then key every visitor behind the same Cloudflare edge address
  together. That does not spoof, but it defeats per-client limits and can lock out unrelated visitors. UNPROVEN
  and NOT RECOMMENDED. Do not enable it behind an orange cloud.
- Overall: do not enable. Keep the default (`none`) until DNS is final and the conditions below are checked.

## Evidence

1. Vercel, "Request headers" (https://vercel.com/docs/headers/request-headers, last_updated 2025-12-13):
   - `x-forwarded-for`: "The public IP address of the client that made the request."
   - "If you are trying to use Vercel behind a proxy, we currently overwrite the X-Forwarded-For header and do not
     forward external IPs. This restriction is in place to prevent IP spoofing."
   - Custom `X-Forwarded-For` is possible only with "Trusted Proxy ... available on Enterprise plans".
   - `x-vercel-forwarded-for`: "identical to the x-forwarded-for header. However, x-forwarded-for could be
     overwritten if you're using a proxy on top of Vercel."
   - `x-real-ip`: "identical to the x-forwarded-for header."
2. Vercel, "Reverse Proxy Servers and Vercel" (https://vercel.com/docs/security/reverse-proxy, last_updated
   2026-09-18): "We do not recommend placing a reverse proxy server in front of your Vercel project"; reasons
   include "Real end-user IP addresses cannot be accurately identified." Cloudflare is listed among Verified Proxy
   Lite providers (header `CF-Connecting-IP`); that mechanism is for Vercel's firewall, and the page does not say
   it changes what `x-forwarded-for` contains inside functions.
3. Vercel, "Using Cloudflare and other reverse proxies with Vercel"
   (https://vercel.com/kb/guide/can-i-use-a-proxy-on-top-of-my-vercel-deployment and
   https://vercel.com/kb/guide/cloudflare-with-vercel.md): "An external proxy changes the connection information
   Vercel receives."; "Without the appropriate configuration, your application may receive the proxy's IP address
   or location."; "Forwarding a client-IP header alone does not establish trust."; "We recommend connecting
   directly where possible"; "You can keep Cloudflare as your DNS provider without enabling its reverse proxy."
   Also: "Verified Proxy does not block direct access" (the `*.vercel.app` URL stays reachable).

## What the code does (`lib/enquiry/client-ip.ts`)

In `vercel` mode it reads `x-vercel-forwarded-for`, else `x-real-ip`, takes the first comma-separated entry,
validates it as an IP, normalises (IPv6 grouped by /64) and uses a salted hash as the counter key. Anything missing
or malformed becomes the shared identity (fail to the global limit, never to a per-client key). `x-forwarded-for`
is ignored in this mode. That matches the documentation: when Vercel receives the connection directly, the first
(only) entry is the client address. If Vercel ever passed a multi-entry header (Enterprise trusted proxy only,
not enabled here), the first entry would be client-controlled; this project does not use that feature.
No code change was needed, so no new tests were added for this task.

## Cloudflare orange cloud: implications

- Spoofing: not via these headers (Vercel overwrites). Residual: an attacker who reaches the Vercel origin
  directly (`*.vercel.app`, or the origin IPs) bypasses Cloudflare's rules but gets their own real IP recorded,
  so per-client limits still apply to them.
- Identity collapse: all visitors arriving through one Cloudflare edge address share one key. A few abusers on a
  popular edge can exhaust that key for unrelated visitors, and the per-client limit (default 5 per 10 minutes)
  is far too low for a shared edge address (NAT-like behaviour).
- `forwarded-for:<N>` mode is not a fix: Cloudflare appends to `X-Forwarded-For`, but Vercel documents that it
  overwrites that header, so the hop count would be wrong. Do not use it with Vercel in either DNS layout.
- Cloudflare's `CF-Connecting-IP` is not read by the code and must not be added unless Vercel documents that the
  header can only come from Cloudflare for this project (it can be forged by direct-to-origin requests).

## Conditions before enabling `ENQUIRY_TRUSTED_PROXY=vercel` (owner checklist)

1. DNS for jolusecurity.com points directly at Vercel (Cloudflare records "DNS only" / grey cloud), or no proxy.
2. After deploy, send one request from a known IP and confirm in Vercel runtime logs (temporarily, without
   logging full headers) that `x-vercel-forwarded-for` equals that IP, and that a request carrying a forged
   `X-Forwarded-For`/`X-Real-IP` does not change it. This empirical check was not possible here.
3. Add the Vercel Firewall rate-limit rule (see `quota-exhaustion.md`) so the edge, not the app, is the first line.
4. Re-check if DNS or any proxy changes. Enabling Cloudflare proxying later silently turns the identity into the
   Cloudflare edge address.
