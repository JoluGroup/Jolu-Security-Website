import assert from "node:assert/strict"
import { describe, it } from "node:test"

const { normalizeIp, parseTrustedProxyMode, resolveClientId } = await import("@/lib/enquiry/client-ip")

const headers = (h) => new Headers(h)
const NONE = { kind: "none" }

describe("trusted proxy mode parsing", () => {
  it("defaults to none and never enables trust silently", () => {
    for (const v of [undefined, "", "none", "NONE", "true", "1", "cloudflare", "forwarded-for", "forwarded-for:0", "forwarded-for:11", "forwarded-for:x"]) {
      assert.deepEqual(parseTrustedProxyMode(v), NONE, String(v))
    }
  })
  it("accepts only the documented modes", () => {
    assert.deepEqual(parseTrustedProxyMode("vercel"), { kind: "vercel" })
    assert.deepEqual(parseTrustedProxyMode(" Vercel "), { kind: "vercel" })
    assert.deepEqual(parseTrustedProxyMode("forwarded-for:2"), { kind: "forwarded-for", trustedHops: 2 })
  })
})

describe("untrusted (default) mode", () => {
  it("ignores every forwarding header", () => {
    const h = headers({ "x-forwarded-for": "9.9.9.9", "x-real-ip": "8.8.8.8", "x-vercel-forwarded-for": "7.7.7.7" })
    assert.equal(resolveClientId(h, NONE), null)
    assert.equal(resolveClientId(headers({}), NONE), null)
  })
})

describe("vercel mode", () => {
  const mode = { kind: "vercel" }
  it("uses the platform header, then x-real-ip", () => {
    assert.equal(resolveClientId(headers({ "x-vercel-forwarded-for": "1.2.3.4", "x-real-ip": "5.6.7.8" }), mode), "v4:1.2.3.4")
    assert.equal(resolveClientId(headers({ "x-real-ip": "5.6.7.8" }), mode), "v4:5.6.7.8")
  })
  it("does not read x-forwarded-for", () => {
    assert.equal(resolveClientId(headers({ "x-forwarded-for": "1.2.3.4" }), mode), null)
  })
  it("falls back to shared when the header is missing or not an IP", () => {
    assert.equal(resolveClientId(headers({}), mode), null)
    assert.equal(resolveClientId(headers({ "x-real-ip": "not-an-ip" }), mode), null)
    assert.equal(resolveClientId(headers({ "x-real-ip": "1.2.3.4; drop table" }), mode), null)
  })
})

describe("forwarded-for:N mode", () => {
  it("takes the Nth entry from the right and ignores client-supplied entries on the left", () => {
    const one = { kind: "forwarded-for", trustedHops: 1 }
    const two = { kind: "forwarded-for", trustedHops: 2 }
    const spoofed = headers({ "x-forwarded-for": "6.6.6.6, 1.1.1.1, 2.2.2.2" })
    assert.equal(resolveClientId(spoofed, one), "v4:2.2.2.2")
    assert.equal(resolveClientId(spoofed, two), "v4:1.1.1.1")
  })
  it("rotating the leftmost (spoofed) entry does not change the identity", () => {
    const one = { kind: "forwarded-for", trustedHops: 1 }
    const ids = new Set()
    for (let i = 0; i < 20; i++) ids.add(resolveClientId(headers({ "x-forwarded-for": `10.0.0.${i}, 203.0.113.5` }), one))
    assert.deepEqual([...ids], ["v4:203.0.113.5"])
  })
  it("is shared when there are fewer entries than trusted hops, or none", () => {
    const two = { kind: "forwarded-for", trustedHops: 2 }
    assert.equal(resolveClientId(headers({ "x-forwarded-for": "1.1.1.1" }), two), null)
    assert.equal(resolveClientId(headers({}), two), null)
  })
})

describe("IP normalisation", () => {
  it("accepts IPv4 and groups IPv6 by /64", () => {
    assert.equal(normalizeIp("196.201.1.1"), "v4:196.201.1.1")
    assert.equal(normalizeIp("2001:db8:1:2:aaaa:bbbb:cccc:dddd"), "v6:2001:db8:1:2")
    assert.equal(normalizeIp("2001:db8:1:2::1"), normalizeIp("2001:DB8:1:2:ffff::9"))
    assert.equal(normalizeIp("2001:db8::1"), "v6:2001:db8:0:0")
    assert.equal(normalizeIp("[2001:db8:1:2::1]"), "v6:2001:db8:1:2")
  })
  it("maps IPv4-mapped IPv6 to IPv4", () => {
    assert.equal(normalizeIp("::ffff:196.201.1.1"), "v4:196.201.1.1")
  })
  it("rejects junk", () => {
    for (const v of [undefined, null, "", "  ", "unknown", "999.1.1.1", "1.2.3", "a:b:c", "::1::2"]) {
      assert.equal(normalizeIp(v), null, String(v))
    }
  })
})
