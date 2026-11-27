// Starts a private, throwaway redis-server and an HTTP shim that speaks the part of the Upstash REST API the
// enquiry code uses (POST /multi-exec, bearer token), translating each request into MULTI ... EXEC on a REAL
// Redis over RESP, one fresh connection per request (so concurrent requests really interleave in Redis).
// This runs the real Lua scripts on a real server. It does NOT prove Upstash's hosted service behaves the same.
// Used only by tests/enquiry/*.redis.test.mjs. Honours REQUIRE_REAL_REDIS=1 / CI=true (missing redis-server FAILS).
import { spawn, spawnSync } from "node:child_process"
import http from "node:http"
import net from "node:net"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"

export const hasRedis = spawnSync("redis-server", ["--version"], { stdio: "ignore" }).status === 0
export const requireRedis = process.env.REQUIRE_REAL_REDIS === "1" || process.env.CI === "true"
if (requireRedis && !hasRedis) {
  throw new Error("REQUIRE_REAL_REDIS=1 (or CI=true) but redis-server is not on PATH: the real-Redis suite must run, not skip")
}

const resp = (args) => `*${args.length}\r\n` + args.map((a) => `$${Buffer.byteLength(String(a))}\r\n${a}\r\n`).join("")

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
    if (buf.length < next + len + 2) return null // ASCII-only payloads in these tests, so characters equal bytes
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

/** Sends the given commands as one pipelined write on a fresh connection and returns `expect` replies. */
function roundTrip(port, commands, expect) {
  return new Promise((resolve, reject) => {
    const socket = net.connect(port, "127.0.0.1")
    socket.setEncoding("utf8")
    let buffer = ""
    const replies = []
    const timer = setTimeout(() => (socket.destroy(), reject(new Error("redis did not answer"))), 5000)
    socket.once("error", (e) => (clearTimeout(timer), reject(e)))
    socket.on("data", (chunk) => {
      buffer += chunk
      for (;;) {
        const r = parse(buffer)
        if (!r) return
        buffer = buffer.slice(r.next)
        replies.push(r.value)
        if (replies.length >= expect) {
          clearTimeout(timer)
          socket.destroy()
          return resolve(replies)
        }
      }
    })
    socket.write(commands.map(resp).join(""))
  })
}

const toJson = (v) => (v instanceof Error ? { error: v.message } : { result: v })

const freePort = () =>
  new Promise((resolve) => {
    const probe = net.createServer().listen(0, "127.0.0.1", () => {
      const { port } = probe.address()
      probe.close(() => resolve(port))
    })
  })

/**
 * @param {{ persist?: boolean }} options persist: use an append-only file in a private directory so the server can be
 *   stopped and started again with its data (used by the restart-safety test).
 */
export async function startRealRedis(options = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "enquiry-redis-"))
  const port = await freePort()
  let server = null
  const token = "real-redis-test-token"

  const start = async () => {
    const args = ["--port", String(port), "--bind", "127.0.0.1", "--dir", dir, "--save", ""]
    args.push(...(options.persist ? ["--appendonly", "yes", "--appendfsync", "always"] : ["--appendonly", "no"]))
    server = spawn("redis-server", args, { stdio: "ignore" })
    for (let i = 0; i < 100; i++) {
      await new Promise((r) => setTimeout(r, 50))
      try {
        const [pong] = await roundTrip(port, [["PING"]], 1)
        if (pong === "PONG") return
      } catch {
        // not up yet
      }
    }
    throw new Error("could not start the throwaway redis-server")
  }
  const stop = async (signal = "SIGTERM") => {
    if (!server) return
    const s = server
    server = null
    await new Promise((resolve) => {
      s.once("exit", resolve)
      s.kill(signal)
    })
  }
  await start()

  const calls = [] // every /multi-exec body received, for assertions
  const http_ = http.createServer((req, res) => {
    let body = ""
    req.on("data", (c) => (body += c))
    req.on("end", async () => {
      if (req.headers.authorization !== `Bearer ${token}`) return void ((res.statusCode = 401), res.end("{}"))
      if (req.method !== "POST" || req.url !== "/multi-exec") return void ((res.statusCode = 404), res.end("{}"))
      try {
        const commands = JSON.parse(body)
        calls.push(commands)
        const all = [["MULTI"], ...commands, ["EXEC"]]
        const replies = await roundTrip(port, all, all.length)
        const exec = replies[replies.length - 1]
        if (!Array.isArray(exec)) throw exec instanceof Error ? exec : new Error("EXEC failed")
        res.setHeader("content-type", "application/json")
        res.end(JSON.stringify(exec.map(toJson)))
      } catch {
        res.statusCode = 500 // what Upstash's client path sees when the database is unreachable
        res.end("redis unreachable")
      }
    })
  })
  await new Promise((resolve) => http_.listen(0, "127.0.0.1", resolve))

  return {
    url: `http://127.0.0.1:${http_.address().port}`,
    token,
    calls,
    cmd: async (...args) => {
      const [r] = await roundTrip(port, [args], 1)
      if (r instanceof Error) throw r
      return r
    },
    stop,
    start,
    close: async () => {
      http_.closeAllConnections?.()
      await new Promise((resolve) => http_.close(resolve))
      await stop("SIGKILL")
      rmSync(dir, { recursive: true, force: true })
    },
  }
}

export function pointAtRealRedis(redis) {
  process.env.NODE_ENV = "production"
  process.env.UPSTASH_REDIS_REST_URL = redis.url
  process.env.UPSTASH_REDIS_REST_TOKEN = redis.token
}
