// Consent state. The site has no consent banner yet, so the default is DENIED and nothing is emitted
// until whatever consent UI is added later calls setAnalyticsConsent(true). The state is held in memory
// only (it is not persisted here): the consent UI owns persistence and must call this on every page load.
type Listener = (granted: boolean) => void

let granted = false
const listeners = new Set<Listener>()

export function setAnalyticsConsent(value: boolean): void {
  const next = value === true
  if (next === granted) return
  granted = next
  for (const l of [...listeners]) {
    try {
      l(granted)
    } catch {
      // A listener failure must never affect the page.
    }
  }
}

export function hasAnalyticsConsent(): boolean {
  return granted
}

export function onAnalyticsConsentChange(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
