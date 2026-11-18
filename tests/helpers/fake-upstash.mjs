// A local stand-in for the Upstash Redis REST API, used ONLY by the automated tests.
// It models the documented behaviour of the few commands the limiter uses
// (POST /multi-exec; SET key value EX seconds NX; INCR; PTTL; EXPIRE) with a virtual
// clock, and rejects any other command or option shape. It is a MODEL of Upstash,
// not the real service: integration with a real database is verified separately.
import http from "node:http"

export async function startFakeUpstash() {
  const state = {
    nowMs: 0,
    mode: "ok", // ok | http500 | garbage | cmderr | hang
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
        if (args.length !== 4 || args[1].toUpperCase() !== "EX" || args[3].toUpperCase() !== "NX") {
          return { error: "ERR unsupported SET form" }
        }
        if (live(key)) return { result: null }
        state.store.set(key, { value: Number(args[0]), expiresAt: state.nowMs + Number(args[2]) * 1000 })
        return { result: "OK" }
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
    state.nowMs = 0
  }
  return state
}
