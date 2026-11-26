"use client"

// Self-contained, DISABLED-BY-DEFAULT analytics mount. It renders nothing. With no
// NEXT_PUBLIC_GA_MEASUREMENT_ID it does nothing at all (no listener, no script, no network).
//
// Integration (one line, for whoever owns app/layout.tsx), inside <body>:
//     <AnalyticsRoot />      with   import { AnalyticsRoot } from "@/lib/analytics/analytics-root"
// STATUS: not yet mounted, so phone_click / whatsapp_click are IMPLEMENTED BUT UNWIRED.
import { useEffect } from "react"
import { initAnalytics, track } from "@/lib/analytics/client"
import { classifyLink, sourceFromTag } from "@/lib/analytics/click-tracking"
import { getMeasurementId } from "@/lib/analytics/config"

export function AnalyticsRoot() {
  useEffect(() => {
    if (!getMeasurementId()) return
    const stop = initAnalytics()
    const onClick = (event: MouseEvent) => {
      try {
        const start = event.target instanceof Element ? event.target : null
        const anchor = start?.closest("a[href]")
        const kind = classifyLink(anchor?.getAttribute("href"))
        if (!anchor || !kind) return
        const tags: string[] = []
        for (let el = anchor.parentElement; el; el = el.parentElement) tags.push(el.tagName)
        track(kind, { source_component: sourceFromTag(tags) })
      } catch {
        // never affect navigation
      }
    }
    document.addEventListener("click", onClick, { capture: true })
    return () => {
      stop()
      document.removeEventListener("click", onClick, { capture: true })
    }
  }, [])
  return null
}
