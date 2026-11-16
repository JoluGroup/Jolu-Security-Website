import Image from "next/image"
import type { ResolvedPhoto } from "@/lib/photo-library"
import { cn } from "@/lib/utils"

const MAX_UPSCALE = 1.3

/**
 * Renders a cleared photo with the site's photo-grade treatment, or — when the photo
 * is not cleared — a neutral grained panel of the same aspect ratio. The panel carries
 * no label, alt text or file path, so withheld photos leave no trace in the markup.
 *
 * Pass `photo` from `resolvePhoto()` on the server; `aspect` is always safe to pass.
 */
export function PhotoSlot({
  photo,
  aspect,
  sizes,
  priority = false,
  fill = false,
  className,
}: {
  photo: ResolvedPhoto | null
  aspect: { width: number; height: number }
  sizes: string
  priority?: boolean
  /** Fill the parent instead of reserving an aspect ratio. */
  fill?: boolean
  className?: string
}) {
  const frameStyle = fill
    ? undefined
    : { aspectRatio: `${aspect.width} / ${aspect.height}`, maxWidth: `${Math.round(aspect.width * MAX_UPSCALE)}px` }

  if (!photo) {
    return (
      <div
        aria-hidden="true"
        className={cn("photo-slot grain relative w-full overflow-hidden bg-card", fill && "size-full", className)}
        style={frameStyle}
      />
    )
  }

  return (
    <div className={cn("relative w-full overflow-hidden bg-card", fill && "size-full", className)} style={frameStyle}>
      <Image
        src={photo.src}
        alt={photo.alt}
        width={photo.width}
        height={photo.height}
        sizes={sizes}
        priority={priority}
        className="photo-grade size-full object-cover"
        style={{ objectPosition: photo.objectPosition }}
      />
      <div className="photo-grade-overlay grain pointer-events-none absolute inset-0" aria-hidden="true" />
    </div>
  )
}
