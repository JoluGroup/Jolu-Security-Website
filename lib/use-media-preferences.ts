"use client"

import { useSyncExternalStore } from "react"

function mediaQueryStore(query: string) {
  return {
    subscribe(onChange: () => void) {
      const mql = window.matchMedia(query)
      mql.addEventListener("change", onChange)
      return () => mql.removeEventListener("change", onChange)
    },
    get: () => window.matchMedia(query).matches,
  }
}

const reducedMotion = mediaQueryStore("(prefers-reduced-motion: reduce)")
const smallScreen = mediaQueryStore("(max-width: 767px)")

export function usePrefersReducedMotion() {
  return useSyncExternalStore(reducedMotion.subscribe, reducedMotion.get, () => false)
}

export function useIsSmallScreen() {
  return useSyncExternalStore(smallScreen.subscribe, smallScreen.get, () => false)
}

type NetworkInformation = { saveData?: boolean; addEventListener?: (t: string, cb: () => void) => void; removeEventListener?: (t: string, cb: () => void) => void }

function connection(): NetworkInformation | undefined {
  return (navigator as Navigator & { connection?: NetworkInformation }).connection
}

export function useSaveData() {
  return useSyncExternalStore(
    (onChange) => {
      const c = connection()
      c?.addEventListener?.("change", onChange)
      return () => c?.removeEventListener?.("change", onChange)
    },
    () => Boolean(connection()?.saveData),
    () => false,
  )
}
