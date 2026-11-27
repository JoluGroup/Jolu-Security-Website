import Image from "next/image"
import Link from "next/link"
import { siteConfig } from "@/lib/site-config"

export function BrandLogo({ priority = false }: { priority?: boolean }) {
  return (
    <Link href="/" className="flex min-h-11 items-center gap-3 rounded-md" aria-label={`${siteConfig.name} home`}>
      <Image
        src={siteConfig.logo.src}
        alt=""
        width={40}
        height={40}
        preload={priority}
        className="size-10 object-contain"
      />
      <span className="text-sm font-semibold leading-tight tracking-[0.14em] text-foreground uppercase">
        Jolu <span className="text-muted-foreground">Security</span>
      </span>
    </Link>
  )
}
