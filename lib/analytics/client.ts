// Browser-side analytics transport. Disabled by default, consent-gated, non-blocking and failure-tolerant:
// every public function swallows its own errors, so analytics can never break a form or a page.
import { getMeasurementId } from "@/lib/analytics/config"
import { hasAnalyticsConsent, onAnalyticsConsentChange } from "@/lib/analytics/consent"
import { sanitizeEvent, type AnalyticsEventName, type AnalyticsParams } from "@/lib/analytics/events"

type GtagWindow = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void }

let loaded = false

/** Injects gtag.js. Only when an ID is configured AND consent is granted. Idempotent. */
export function loadAnalytics(): void {
  try {
    const id = getMeasurementId()
    if (!id || !hasAnalyticsConsent() || loaded || typeof document === "undefined") return
    loaded = true
    const w = window as GtagWindow
    ;(w as unknown as Record<string, unknown>)[`ga-disable-${id}`] = false
    w.dataLayer = w.dataLayer ?? []
    w.gtag = function gtag() {
      // gtag.js requires the real `arguments` object, not an array.
      // eslint-disable-next-line prefer-rest-params
      w.dataLayer!.push(arguments)
    }
    w.gtag("js", new Date())
    w.gtag("consent", "update", { analytics_storage: "granted" })
    w.gtag("config", id, { allow_google_signals: false, allow_ad_personalization_signals: false })
    const script = document.createElement("script")
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`
    document.head.appendChild(script)
  } catch {
    // ignore
  }
}

/** Starts reacting to consent changes. Returns an unsubscribe function. Safe to call when disabled. */
export function initAnalytics(): () => void {
  if (!getMeasurementId()) return () => undefined
  loadAnalytics()
  return onAnalyticsConsentChange((granted) => {
    try {
      const id = getMeasurementId()
      if (!id) return
      ;(window as unknown as Record<string, unknown>)[`ga-disable-${id}`] = !granted
      if (granted) loadAnalytics()
    } catch {
      // ignore
    }
  })
}

/**
 * Records one event. No-op (and no network) unless an ID is configured and consent is granted.
 * `params` is passed through the allowlist sanitiser; the current page path is added automatically.
 */
export function track(name: AnalyticsEventName, params: AnalyticsParams = {}): void {
  try {
    if (typeof window === "undefined") return
    const id = getMeasurementId()
    if (!id || !hasAnalyticsConsent()) return
    const w = window as GtagWindow
    if (typeof w.gtag !== "function") return
    const safe = sanitizeEvent(name, { page_path: window.location.pathname, ...params })
    if (!safe) return
    w.gtag("event", safe.name, safe.params)
  } catch {
    // ignore
  }
}
