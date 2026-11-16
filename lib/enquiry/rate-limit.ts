import { createHash, createHmac } from "node:crypto"

const WINDOW_SECONDS = 10 * 60
const MAX_REQUESTS = 5

export type RateLimitResult = { ok: true } | { ok: false; reason: "limited" | "not_configured" | "error" }

const isProduction = () => process.env.NODE_ENV === "production"

function upstashConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim()
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  return url && token ? { url: url.replace(/\/+$/, ""), token } : null
}

/** True when durable rate limiting is available, or when running outside production. */
export function isRateLimitConfigured() {
  return Boolean(upstashConfig()) || !isProduction()
}

/** Salted hash of the client IP. The raw IP is never stored or sent anywhere. */
function clientKey(ip: string, secret: string) {
  const digest = createHmac("sha256", secret).update(ip).digest("hex").slice(0, 32)
  return `enquiry:rl:${digest}`
}

export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  const config = upstashConfig()

  if (!config) {
    if (isProduction()) return { ok: false, reason: "not_configured" }
    return memoryLimit(ip)
  }

  const key = clientKey(ip, config.token)
  try {
    const res = await fetch(`${config.url}/multi-exec`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, WINDOW_SECONDS],
      ]),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return { ok: false, reason: "error" }

    const results = (await res.json()) as Array<{ result?: unknown; error?: string }>
    if (!Array.isArray(results) || results.some((r) => r?.error)) return { ok: false, reason: "error" }

    const count = Number(results[0]?.result)
    if (!Number.isFinite(count)) return { ok: false, reason: "error" }
    return count > MAX_REQUESTS ? { ok: false, reason: "limited" } : { ok: true }
  } catch {
    return { ok: false, reason: "error" }
  }
}

// Development-only fallback. Not durable and not shared across instances.
const memory = new Map<string, { count: number; resetAt: number }>()

function memoryLimit(ip: string): RateLimitResult {
  const key = createHash("sha256").update(`dev:${ip}`).digest("hex")
  const now = Date.now()
  const entry = memory.get(key)
  if (!entry || entry.resetAt <= now) {
    memory.set(key, { count: 1, resetAt: now + WINDOW_SECONDS * 1000 })
    return { ok: true }
  }
  entry.count += 1
  return entry.count > MAX_REQUESTS ? { ok: false, reason: "limited" } : { ok: true }
}
