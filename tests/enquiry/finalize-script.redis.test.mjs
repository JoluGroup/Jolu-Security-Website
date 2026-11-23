// Runs the REAL dedup finalize Lua script on a REAL redis-server, when one is installed.
// It starts a private, throwaway server on a free local port (no persistence) and stops it afterwards.
// Skipped automatically when `redis-server` is not on PATH, so it never blocks machines without Redis.
// It is the check that the Lua is valid and behaves as documented, which the JavaScript fake cannot prove.
// It does NOT prove behaviour of Upstash's hosted Redis (see the milestone report).
import assert from "node:assert/strict"
import { spawn, spawnSync } from "node:child_process"
import net from "node:net"
import { after, before, beforeEach, describe, it } from "node:test"

const { FINALIZE_SCRIPT } = await import("@/lib/enquiry/dedup")

const hasRedis = spawnSync("redis-server", ["--version"], { stdio: "ignore" }).status === 0
const LOCK = "enquiry:dd:l:test"
const STATE = "enquiry:dd:s:test"

// Minimal RESP client: one command or one MULTI/EXEC block at a time.
function resp(args) {
  return `*${args.length}\r\n` + args.map((a) => `$${Buffer.byteLength(String(a))}\r\n${a}\r\n`).join("")
}
function parse(buf, i = 0) {
  const line = buf.indexOf("\r\n", i)
  if (line === -1) return null
  const type = buf[i]
  const body = buf.slice(i + 1, line)
  const next = line + 2
  if (type === "+") return { value: body, next }
  if (type === "-") return { value: new Error(body), next }
  if (type === ":") return { value: Number(body), next }
  if (type === "$") {
    const len = Number(body)
    if (len === -1) return { value: null, next }
    if (buf.length < next + len + 2) return null
    return { value: buf.slice(next, next + len), next: next + len + 2 }
  }
  if (type === "*") {
    const n = Number(body)
    if (n === -1) return { value: null, next }
    const out = []
    let pos = next
    for (let k = 0; k < n; k++) {
      const r = parse(buf, pos)
      if (!r) return null
      out.push(r.value)
      pos = r.next
    }
    return { value: out, next: pos }
  }
  throw new Error(`unexpected RESP type ${type}`)
}

describe("FINALIZE_SCRIPT on a real redis-server", { skip: hasRedis ? false : "redis-server is not installed" }, () => {
  let server
  let socket
  let port
  let pending = []
  let buffer = ""

  const send = (...commands) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("redis did not answer")), 5000)
      pending.push({ expect: commands.length, results: [], resolve: (v) => (clearTimeout(timer), resolve(v)) })
      socket.write(commands.map(resp).join(""))
    })
  const cmd = async (...args) => (await send(args))[0]
  const finalize = (token, value) => cmd("EVAL", FINALIZE_SCRIPT, 2, LOCK, STATE, token, value, 600)

  before(async () => {
    port = await new Promise((resolve) => {
      const probe = net.createServer().listen(0, "127.0.0.1", () => {
        const { port: p } = probe.address()
        probe.close(() => resolve(p))
      })
    })
    server = spawn("redis-server", ["--port", String(port), "--bind", "127.0.0.1", "--save", "", "--appendonly", "no", "--dir", process.env.TMPDIR || "/tmp"], { stdio: "ignore" })
    for (let i = 0; i < 100 && !socket; i++) {
      await new Promise((r) => setTimeout(r, 50))
      try {
        socket = await new Promise((resolve, reject) => {
          const s = net.connect(port, "127.0.0.1", () => resolve(s))
          s.once("error", reject)
        })
      } catch {
        socket = undefined
      }
    }
    assert.ok(socket, "could not connect to the throwaway redis-server")
    socket.setEncoding("utf8")
    socket.on("data", (chunk) => {
      buffer += chunk
      for (;;) {
        const head = pending[0]
        if (!head) return
        const r = parse(buffer)
        if (!r) return
        buffer = buffer.slice(r.next)
        head.results.push(r.value)
        if (head.results.length >= head.expect) {
          pending.shift()
          head.resolve(head.results)
        }
      }
    })
  })
  after(() => {
    socket?.destroy()
    server?.kill("SIGKILL")
  })
  beforeEach(async () => {
    await cmd("FLUSHALL")
  })

  it("owner: records the state with a 10 minute TTL and deletes its lock (returns 1)", async () => {
    await cmd("SET", LOCK, "oAAA", "EX", 30, "NX")
    assert.equal(await finalize("oAAA", "sent:JS-1"), 1)
    assert.equal(await cmd("EXISTS", LOCK), 0)
    assert.equal(await cmd("GET", STATE), "sent:JS-1")
    const ttl = await cmd("TTL", STATE)
    assert.ok(ttl > 590 && ttl <= 600)
  })

  it("former owner: leaves the newer owner's lock alone (returns 0), for every result type", async () => {
    for (const value of ["", "sent:JS-A", "unsure:JS-A"]) {
      await cmd("FLUSHALL")
      await cmd("SET", LOCK, "oBBB", "EX", 30, "NX")
      assert.equal(await finalize("oAAA", value), 0, `value=${JSON.stringify(value)}`)
      assert.equal(await cmd("GET", LOCK), "oBBB", `lock must survive (value=${JSON.stringify(value)})`)
    }
  })

  it("expired lock (none held): returns 0 and still records a late 'sent'", async () => {
    assert.equal(await finalize("oAAA", "sent:JS-3"), 0)
    assert.equal(await cmd("GET", STATE), "sent:JS-3")
  })

  it("release-only (empty value) writes no state", async () => {
    await cmd("SET", LOCK, "oAAA", "EX", 30)
    assert.equal(await finalize("oAAA", ""), 1)
    assert.equal(await cmd("EXISTS", LOCK), 0)
    assert.equal(await cmd("EXISTS", STATE), 0)
  })

  it("monotonic state: sent is never overwritten or downgraded; unsure never replaces unsure; sent upgrades unsure", async () => {
    await cmd("SET", STATE, "sent:JS-OLD", "EX", 500)
    await finalize("oX", "sent:JS-NEW")
    assert.equal(await cmd("GET", STATE), "sent:JS-OLD")
    await finalize("oX", "unsure:JS-U")
    assert.equal(await cmd("GET", STATE), "sent:JS-OLD")

    await cmd("FLUSHALL")
    await finalize("oX", "unsure:JS-U1")
    assert.equal(await cmd("GET", STATE), "unsure:JS-U1")
    await finalize("oX", "unsure:JS-U2")
    assert.equal(await cmd("GET", STATE), "unsure:JS-U1")
    await finalize("oX", "sent:JS-S")
    assert.equal(await cmd("GET", STATE), "sent:JS-S")
  })

  it("works inside MULTI/EXEC, which is how Upstash's /multi-exec runs it", async () => {
    await cmd("SET", LOCK, "oAAA", "EX", 30)
    const out = await send(["MULTI"], ["EVAL", FINALIZE_SCRIPT, 2, LOCK, STATE, "oAAA", "sent:JS-M", 600], ["EXEC"])
    assert.deepEqual(out[2], [1])
    assert.equal(await cmd("GET", STATE), "sent:JS-M")
    assert.equal(await cmd("EXISTS", LOCK), 0)
  })

  it("the claim step: SET lock token NX EX 30 lets exactly one claimant win", async () => {
    const first = await send(["MULTI"], ["SET", LOCK, "oAAA", "EX", 30, "NX"], ["GET", STATE], ["EXEC"])
    const second = await send(["MULTI"], ["SET", LOCK, "oBBB", "EX", 30, "NX"], ["GET", STATE], ["EXEC"])
    assert.equal(first[3][0], "OK")
    assert.equal(second[3][0], null)
    assert.equal(await cmd("GET", LOCK), "oAAA")
  })
})
