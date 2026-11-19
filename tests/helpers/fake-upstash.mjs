// A local stand-in for the Upstash Redis REST API, used ONLY by the automated tests.
// It models the documented behaviour of the few commands the limiter uses
// (POST /multi-exec; SET key value EX seconds [NX]; GET; DEL; INCR; PTTL; EXPIRE; EVAL of the
// dedup finalize script only) with a virtual
// clock, and rejects any other command or option shape. It is a MODEL of Upstash,
// not the real service: integration with a real database is verified separately.
import http from "node:http"

// The one Lua script the application is allowed to run. The fake does NOT execute Lua: it recognises this
// exact text and applies the same rules in JavaScript below. The script itself was checked against a real
// Redis server (see the milestone report); a model of it here only drives the HTTP-level tests.
const { FINALIZE_SCRIPT } = await import("@/lib/enquiry/dedup")

export async function startFakeUpstash() {
  const state = {
    nowMs: 0,
    mode: "ok", // ok | http500 | garbage | cmderr | hang
    failIf: null, // optional (commands) => boolean: answer just those transactions with HTTP 500
    beforeTx: null, // optional (commands) => void: runs just before a transaction executes (to stage races)
    store: new Map(), // key -> { value, expiresAt|null }
    transactions: [], // every request body received, for assertions
    token: "test-token",
  }
  const live = (key) => {
    const e = state.store.get(key)
    if (e && e.expiresAt !== null && e.expiresAt <= state.nowMs) state.store.delete(key)
    return state.store.get(key)
  }
  const run = (cmd) => {
    const [op, key, ...args] = cmd.map(String)
    switch (op.toUpperCase()) {
      case "SET": {
        // Supported shapes only: SET k v EX n NX (create-if-absent) and SET k v EX n (overwrite).
        const [value, ex, seconds, nx] = args
        const shapeOk =
          (args.length === 4 && ex?.toUpperCase() === "EX" && nx?.toUpperCase() === "NX") ||
          (args.length === 3 && ex?.toUpperCase() === "EX")
        if (!shapeOk || !Number.isFinite(Number(seconds))) return { error: "ERR unsupported SET form" }
        if (nx && live(key)) return { result: null }
        const stored = /^-?\d+$/.test(value) ? Number(value) : value
        state.store.set(key, { value: stored, expiresAt: state.nowMs + Number(seconds) * 1000 })
        return { result: "OK" }
      }
      case "DEL": {
        const existed = Boolean(live(key))
        state.store.delete(key)
        return { result: existed ? 1 : 0 }
      }
      case "EVAL": {
        // [numkeys, lockKey, stateKey, token, value, ttl]. Same rules as FINALIZE_SCRIPT.
        if (key !== FINALIZE_SCRIPT || args.length !== 6 || args[0] !== "2") return { error: "ERR unsupported script" }
        const [, lockKey, stateKey, token, value, ttl] = args
        const lock = live(lockKey)
        const owner = Boolean(lock) && String(lock.value) === token
        if (value !== "") {
          const cur = live(stateKey)
          const curValue = cur ? String(cur.value) : null
          const write = () => state.store.set(stateKey, { value, expiresAt: state.nowMs + Number(ttl) * 1000 })
          if (value.startsWith("sent:")) {
            if (!(curValue !== null && curValue.startsWith("sent:"))) write()
          } else if (curValue === null) {
            write()
          }
        }
        if (owner) {
          state.store.delete(lockKey)
          return { result: 1 }
        }
        return { result: 0 }
      }
      case "GET": {
        const e = live(key)
        return { result: e ? String(e.value) : null } // Redis returns strings
      }
      case "INCR": {
        let e = live(key)
        if (!e) {
          e = { value: 0, expiresAt: null }
          state.store.set(key, e)
        }
        e.value += 1
        return { result: e.value }
      }
      case "PTTL": {
        const e = live(key)
        if (!e) return { result: -2 }
        return { result: e.expiresAt === null ? -1 : e.expiresAt - state.nowMs }
      }
      case "EXPIRE": {
        const e = live(key)
        if (!e || args.length !== 1) return { result: 0 }
        e.expiresAt = state.nowMs + Number(args[0]) * 1000
        return { result: 1 }
      }
      default:
        return { error: `ERR unknown command ${op}` }
    }
  }
  const server = http.createServer((req, res) => {
    let body = ""
    req.on("data", (c) => (body += c))
    req.on("end", () => {
      if (req.headers.authorization !== `Bearer ${state.token}`) {
        res.statusCode = 401
        return res.end(JSON.stringify({ error: "Unauthorized" }))
      }
      if (req.method !== "POST" || req.url !== "/multi-exec") {
        res.statusCode = 404
        return res.end("{}")
      }
      if (state.mode === "hang") return
      if (state.mode === "http500") {
        res.statusCode = 500
        return res.end("boom")
      }
      if (state.mode === "garbage") return res.end("not json")
      const commands = JSON.parse(body)
      state.transactions.push(commands)
      state.beforeTx?.(commands)
      if (state.failIf?.(commands)) {
        res.statusCode = 500
        return res.end("boom")
      }
      if (state.mode === "cmderr") return res.end(JSON.stringify(commands.map(() => ({ error: "ERR x" }))))
      res.setHeader("content-type", "application/json")
      res.end(JSON.stringify(commands.map(run)))
    })
  })
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))
  state.url = `http://127.0.0.1:${server.address().port}`
  state.close = () => {
    server.closeAllConnections?.()
    return new Promise((resolve) => server.close(resolve))
  }
  state.advance = (seconds) => {
    state.nowMs += seconds * 1000
  }
  state.reset = () => {
    state.store.clear()
    state.transactions.length = 0
    state.mode = "ok"
    state.failIf = null
    state.beforeTx = null
    state.nowMs = 0
  }
  return state
}
