const KEYS = [
  "NODE_ENV",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "ENQUIRY_DELIVERY",
  "ENQUIRY_ALLOW_PRODUCTION_TEST",
  "ENQUIRY_TRUSTED_PROXY",
  "ENQUIRY_CLIENT_LIMIT",
  "ENQUIRY_CLIENT_WINDOW_SECONDS",
  "ENQUIRY_GLOBAL_LIMIT",
  "ENQUIRY_GLOBAL_WINDOW_SECONDS",
  "RESEND_API_KEY",
  "ENQUIRY_FROM",
  "ENQUIRY_TO",
]

/** Clears every variable the enquiry backend reads and returns a restore function. */
export function isolateEnv() {
  const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]))
  for (const k of KEYS) delete process.env[k]
  return () => {
    for (const k of KEYS) {
      if (saved[k] === undefined) delete process.env[k]
      else process.env[k] = saved[k]
    }
  }
}

export function pointAtFakeUpstash(fake) {
  process.env.NODE_ENV = "production"
  process.env.UPSTASH_REDIS_REST_URL = fake.url
  process.env.UPSTASH_REDIS_REST_TOKEN = fake.token
}
