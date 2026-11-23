// Photo registry and rights clearance.
//
// A photo renders only when no clearance criterion is "pending" and every
// "not-applicable" criterion carries written evidence explaining why.
// This decision never depends on environment variables.
//
// Only server components may import this file, so uncleared paths stay out of
// client bundles and rendered HTML. Use `resolvePhoto()` and pass the result down.
//
// Served-directory rule: files under public/ are directly reachable by URL, so an uncleared
// file must never live there. Uncleared originals are withheld from this repository (hash-only manifest in docs/assets/;
// originals in a private bundle). A cleared file is moved to public/cleared/ and its `src` must point there:
// `src` is typed as `/cleared/...` and `assertClearedSrc()` is enforced by tests/assets.
// NOTE: the old blobs remain in older PUBLIC history (main and earlier branches); only making the repository private or using private storage gives confidentiality.

export type ClearanceStatus = "pending" | "approved" | "not-applicable"

export type ClearanceItem = { status: ClearanceStatus; evidence: string | null }

export type Clearance = {
  employeeConsent: ClearanceItem
  photographerCopyright: ClearanceItem
  venuePermission: ClearanceItem
  thirdPartyMarks: ClearanceItem
}

/** The only served directory a cleared photo may live in: public/cleared/. */
export const CLEARED_DIR = "/cleared"
export type ClearedSrc = `/cleared/${string}`

/** True only for a normalised path inside the cleared directory (no traversal, no other roots). */
export function isClearedSrc(src: string): src is ClearedSrc {
  return /^\/cleared\/[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/.test(src) && !src.split("/").some((p) => p === "..")
}

export function assertClearedSrc(src: string): ClearedSrc {
  if (!isClearedSrc(src)) throw new Error(`Photo src must be under ${CLEARED_DIR}/: ${src}`)
  return src
}

export type PhotoEntry = {
  id: string
  src: ClearedSrc
  alt: string
  width: number
  height: number
  objectPosition: string
  note: string
  clearance: Clearance
}

/** The minimal, cleared data a component needs. Never contains uncleared paths. */
export type ResolvedPhoto = Pick<PhotoEntry, "src" | "alt" | "width" | "height" | "objectPosition">

const pending = (): ClearanceItem => ({ status: "pending", evidence: null })
const allPending = (): Clearance => ({
  employeeConsent: pending(),
  photographerCopyright: pending(),
  venuePermission: pending(),
  thirdPartyMarks: pending(),
})

const BASE = CLEARED_DIR

export const PHOTO_LIBRARY = {
  "team-wide": {
    id: "team-wide",
    src: `${BASE}/gallery/best-image.jpeg`,
    alt: "Jolu Security team members",
    width: 1280,
    height: 960,
    objectPosition: "50% 45%",
    note: "Third-party sign visible. Cropping alone does not resolve rights; thirdPartyMarks needs a decision.",
    clearance: allPending(),
  },
  "hero-3": {
    id: "hero-3",
    src: `${BASE}/hero3.jpeg`,
    alt: "Jolu Security personnel on duty",
    width: 1280,
    height: 960,
    objectPosition: "50% 50%",
    note: "Hero poster candidate.",
    clearance: allPending(),
  },
  "hero-1": {
    id: "hero-1",
    src: `${BASE}/hero1.jpeg`,
    alt: "Jolu Security personnel on duty",
    width: 1280,
    height: 960,
    objectPosition: "50% 50%",
    note: "Hero poster candidate.",
    clearance: allPending(),
  },
  "gallery-3": {
    id: "gallery-3",
    src: `${BASE}/gallery/3.jpeg`,
    alt: "Jolu Security team member",
    width: 1200,
    height: 1600,
    objectPosition: "50% 40%",
    note: "Tall frame. Candidate for the People layer and people section.",
    clearance: allPending(),
  },
  "gallery-2": {
    id: "gallery-2",
    src: `${BASE}/gallery/2.jpeg`,
    alt: "Jolu Security guard at an entrance",
    width: 1280,
    height: 960,
    objectPosition: "50% 50%",
    note: "Candidate for the Access layer.",
    clearance: allPending(),
  },
  "gallery-1": {
    id: "gallery-1",
    src: `${BASE}/gallery/1.jpeg`,
    alt: "Jolu Security team",
    width: 1280,
    height: 960,
    objectPosition: "50% 50%",
    note: "",
    clearance: allPending(),
  },
  "gallery-13": {
    id: "gallery-13",
    src: `${BASE}/gallery/13.jpeg`,
    alt: "Jolu Security team member",
    width: 960,
    height: 1280,
    objectPosition: "50% 40%",
    note: "",
    clearance: allPending(),
  },
  "events-security": {
    id: "events-security",
    src: `${BASE}/gallery/events-security.jpg`,
    alt: "Jolu Security personnel at an event",
    width: 1280,
    height: 960,
    objectPosition: "50% 50%",
    note: "Event venue: venuePermission likely required.",
    clearance: allPending(),
  },
  "office-team": {
    id: "office-team",
    src: `${BASE}/gallery/IMG-20250428-WA0100.jpg`,
    alt: "Jolu Security office team",
    width: 1112,
    height: 1261,
    objectPosition: "50% 40%",
    note: "Group photo. Confirm subject and consent of everyone pictured.",
    clearance: allPending(),
  },
  "manned-guarding": {
    id: "manned-guarding",
    src: `${BASE}/manned-guarding.jpg`,
    alt: "Jolu Security guard on duty",
    width: 960,
    height: 1280,
    objectPosition: "50% 40%",
    note: "",
    clearance: allPending(),
  },
  "k9-unit": {
    id: "k9-unit",
    src: `${BASE}/k9-unit.png`,
    alt: "Jolu Security K9 handler and dog",
    width: 612,
    height: 420,
    objectPosition: "50% 50%",
    note: "Low resolution. Small use only.",
    clearance: allPending(),
  },
} satisfies Record<string, PhotoEntry>

export type PhotoId = keyof typeof PHOTO_LIBRARY

export function isPhotoCleared(entry: PhotoEntry): boolean {
  return Object.values(entry.clearance).every((item) => {
    if (item.status === "pending") return false
    if (item.status === "not-applicable") return Boolean(item.evidence?.trim())
    return true
  })
}

export function resolvePhoto(id: PhotoId): ResolvedPhoto | null {
  const entry: PhotoEntry = PHOTO_LIBRARY[id]
  if (!isPhotoCleared(entry)) return null
  assertClearedSrc(entry.src)
  const { src, alt, width, height, objectPosition } = entry
  return { src, alt, width, height, objectPosition }
}

/** Returns the first fully cleared photo in priority order, or null. */
export function firstClearedPhoto(ids: readonly PhotoId[]): ResolvedPhoto | null {
  for (const id of ids) {
    const photo = resolvePhoto(id)
    if (photo) return photo
  }
  return null
}

/** Aspect data for a slot, safe to render even when the photo is not cleared. */
export function photoAspect(id: PhotoId) {
  const { width, height } = PHOTO_LIBRARY[id]
  return { width, height }
}
