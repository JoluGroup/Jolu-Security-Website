import { isIP } from "node:net"

/**
 * Client identification for rate limiting.
 *
 * Forwarded headers (x-forwarded-for, x-real-ip, ...) are only trustworthy when a
 * proxy that YOU operate or rely on overwrites or appends to them. On any other
 * path the client controls them, so by default NO header is trusted and every
 * visitor shares one identity (the caller then applies only the global limit).
 *
 * A trusted mode must be enabled explicitly with ENQUIRY_TRUSTED_PROXY, and only
 * after the hosting provider is confirmed:
 *
 *   none               (default) trust nothing; shared identity.
 *   vercel             Vercel overwrites x-forwarded-for / x-real-ip with the real
 *                      client IP, so x-vercel-forwarded-for, then x-real-ip, is used.
 *   forwarded-for:<N>  N trusted proxies each APPEND the address they saw to
 *                      x-forwarded-for; the Nth entry from the right is the client.
 *                      Entries further left are client-supplied and are ignored.
 *
 * An unknown value is treated as "none". A missing, malformed or non-IP header
 * also falls back to the shared identity; it never becomes a per-client key.
 */
export type TrustedProxyMode =
  | { kind: "none" }
  | { kind: "vercel" }
  | { kind: "forwarded-for"; trustedHops: number }

export function parseTrustedProxyMode(value: string | undefined): TrustedProxyMode {
  const v = value?.trim().toLowerCase()
  if (v === "vercel") return { kind: "vercel" }
  const hops = v?.match(/^forwarded-for:(\d{1,2})$/)
  if (hops) {
    const n = Number(hops[1])
    if (n >= 1 && n <= 10) return { kind: "forwarded-for", trustedHops: n }
  }
  return { kind: "none" }
}

export function getTrustedProxyMode(): TrustedProxyMode {
  return parseTrustedProxyMode(process.env.ENQUIRY_TRUSTED_PROXY)
}

/** First four 16-bit groups of an IPv6 address (its /64), in a canonical form. */
function ipv6Prefix64(raw: string): string | null {
  let addr = raw.split("%")[0].toLowerCase()
  const dotted = addr.match(/^(.*:)(\d+\.\d+\.\d+\.\d+)$/)
  if (dotted) {
    const o = dotted[2].split(".").map(Number)
    addr = `${dotted[1]}${((o[0] << 8) | o[1]).toString(16)}:${((o[2] << 8) | o[3]).toString(16)}`
  }
  const halves = addr.split("::")
  if (halves.length > 2) return null
  const head = halves[0] ? halves[0].split(":") : []
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : []
  let groups: string[]
  if (halves.length === 2) {
    const missing = 8 - head.length - tail.length
    if (missing < 1) return null
    groups = [...head, ...Array<string>(missing).fill("0"), ...tail]
  } else {
    groups = head
  }
  if (groups.length !== 8) return null
  return groups
    .slice(0, 4)
    .map((g) => g.replace(/^0+(?=.)/, ""))
    .join(":")
}

/** Returns a stable identity string for a valid IP, or null. IPv6 is grouped by /64. */
export function normalizeIp(candidate: string | null | undefined): string | null {
  let ip = candidate?.trim()
  if (!ip) return null
  if (ip.startsWith("[") && ip.endsWith("]")) ip = ip.slice(1, -1)
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)
  if (mapped) ip = mapped[1]
  const version = isIP(ip.split("%")[0])
  if (version === 4) return `v4:${ip}`
  if (version === 6) {
    const prefix = ipv6Prefix64(ip)
    return prefix ? `v6:${prefix}` : null
  }
  return null
}

/**
 * Resolves the client identity, or null when the client cannot be identified
 * trustworthily (the shared identity).
 */
export function resolveClientId(headers: Headers, mode: TrustedProxyMode): string | null {
  if (mode.kind === "vercel") {
    const raw = headers.get("x-vercel-forwarded-for") ?? headers.get("x-real-ip")
    return normalizeIp(raw?.split(",")[0])
  }
  if (mode.kind === "forwarded-for") {
    const parts = (headers.get("x-forwarded-for") ?? "")
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean)
    const index = parts.length - mode.trustedHops
    // Fewer entries than trusted hops means the header did not pass through the
    // expected proxies, so nothing in it can be trusted.
    return index >= 0 ? normalizeIp(parts[index]) : null
  }
  return null
}
