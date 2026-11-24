# Global quota exhaustion on the enquiry endpoint

Status: partially mitigated in this change. One residual risk needs an owner decision (end of file).

## Finding (confirmed at base commit 9e8e742)

With `ENQUIRY_TRUSTED_PROXY` unset (the default), no forwarded header is trusted, every client shares one
identity, and only the global limit applies (default then 200 per hour, fixed window; the default is now 30 per hour, see daily-limit.md). `app/api/enquiry/route.ts`
charged that counter before the body was read, so malformed JSON, validation failures and honeypot hits each
used one of the 200. About 200 junk POSTs per hour were enough to answer every real visitor with 429 until the
window ended (up to an hour). Each junk request also cost an Upstash round trip (3 commands) forever, even
after the cap was reached.

## Options considered

| Option | Stops junk lockout | Stops valid-looking spam lockout | Keeps fail-closed | Keeps per-client limit | Verdict |
|---|---|---|---|---|---|
| A. Charge the global counter only after validation | Yes | No | Yes | Yes | Implemented |
| B. Separate "junk" counter that blocks when exceeded | No: it becomes the same lockout one cap higher (the attacker just sends 10x more) | No | Yes | Yes | Rejected: moves the problem, adds Redis cost |
| C. Separate "junk" counter that only logs | n/a | No | Yes | Yes | Rejected: no protective effect beyond Vercel's own logs |
| D. Raise the global cap | Only delays | Only delays, and raises the email-flood bound | Yes | Yes | Rejected: weakens the email cap |
| E. Enable `ENQUIRY_TRUSTED_PROXY=vercel` | Yes (per client) | Yes (per client) | Yes | Becomes effective | Not done: not proven safe, see `trusted-client-ip.md`. Owner decision |
| F. Vercel Firewall rate-limit rule on `POST /api/enquiry` | Yes (per IP, at the edge, before the function runs) | Yes | n/a (platform) | n/a | Recommended complement. Owner action (dashboard), not code |

## What was implemented (option A)

`lib/enquiry/rate-limit.ts` now exposes two halves, and `checkRateLimit` (client then global) is kept as the
reference composition:

- `checkClientRateLimit(clientId)`: runs before the body is read, exactly as before (global lockout peek, then
  the per-client counter). No-op for the shared identity.
- `checkGlobalRateLimit()`: runs in the route AFTER validation (and after the honeypot check), before the
  test-mode return and before dedup/delivery.

Why this does not weaken abuse protection:

1. Email volume. Every Resend call is preceded by exactly one successful global charge, and the charge is one
   atomic `/multi-exec` (SET NX EX, INCR, PTTL). So emails per window are still at most the global limit. Tests:
   "only globalLimit distinct valid enquiries are sent" and a 12-way concurrent burst against a limit of 4
   (exactly 4 sends).
2. Fail closed. If the store is down or unconfigured in production, a valid request gets 503 before anything is
   sent (tests for both). Invalid requests get their ordinary 400, which sends nothing either way.
3. Per-client limits are untouched, and still count junk, so a trusted client that floods is cut off after its
   own allowance (test).
4. Junk cost. A junk request previously cost one function invocation plus a Redis transaction. It now costs the
   invocation only (a test asserts zero Redis transactions for junk in shared mode). The invocation was already
   paid under the old design; returning 429 instead of 400 saved nothing but the body parse (bounded at 16 KiB).
5. Response contract unchanged: 429 + `Retry-After` for a valid request during a lockout; same codes.

Behavioural differences to know about: in shared mode a global lockout is now discovered after the body is read
and validated, not before; and a duplicate enquiry still uses a global slot (unchanged).

## Residual risk (not fixed, cannot be fixed safely in app code without a trusted client identity)

An attacker who sends well-formed, non-honeypot enquiries (varying the text) can still reach 200 per hour and
lock real visitors out; in live mode this also delivers up to 200 junk emails per hour to the inbox. Any in-app
cap that is shared across all visitors is, by construction, a shared resource an anonymous attacker can spend.
Only per-client identity (E) or edge rate limiting (F) fixes this. Phone and WhatsApp remain the fallback shown
on the site.

## Owner decision

Recommended: add a Vercel Firewall rate-limit rule for `POST /api/enquiry` (for example 5 requests per 10
minutes per IP, action: deny or challenge) in the dashboard. That is evaluated by Vercel before the function and
does not depend on header trust. Do not enable `ENQUIRY_TRUSTED_PROXY=vercel` until the conditions in
`trusted-client-ip.md` are confirmed, in particular that Cloudflare proxying is NOT in front of Vercel.

## Update: hourly default and new daily cap

See `docs/enquiry/daily-limit.md`. A daily site-wide cap (default 80 per 24 h) was added, the hourly default is now
30, and duplicates no longer consume site-wide quota (the duplicate check now runs before the site-wide charge).
The "a duplicate enquiry still uses a global slot" statement above is no longer true.
