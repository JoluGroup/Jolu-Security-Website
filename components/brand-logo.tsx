import Image from "next/image"
import { siteConfig } from "@/lib/site-config"

export function BrandLogo() {
  return (
    <a href="/" className="flex items-center gap-3 rounded-md" aria-label={`${siteConfig.name} home`}>
      <Image
        src={siteConfig.logo.src}
        alt=""
        width={40}
        height={40}
        unoptimized
        priority
        className="size-10 object-contain"
      />
      <span className="text-sm font-semibold leading-tight tracking-[0.14em] text-foreground">
        JOLU GROUP <span className="block text-muted-foreground sm:inline">SECURITY</span>
      </span>
    </a>
  )
}
