import Image from "next/image"
import type { ServiceId } from "@/lib/services"
import { siteConfig } from "@/lib/site-config"
import { cn } from "@/lib/utils"

/*
 * Brand-colour line-art compositions in the same visual language as the five layer scenes
 * (hairline white strokes, red accents, faint grid). They replace empty photo slots.
 * Everything here is decorative (aria-hidden) and built from vector shapes plus the approved logo.
 * Nothing depicts people, real places or measured facts.
 */

const RED = "var(--primary)"
const LINE = "var(--scene-line)"
const FAINT = "var(--scene-faint)"

/** Shared frame: charcoal panel, grid, corner ticks and a mono caption. */
export function ArtFrame({
  children,
  caption,
  index,
  className,
}: {
  children: React.ReactNode
  caption: string
  index?: string
  className?: string
}) {
  return (
    <div
      className={cn("scene grain relative isolate overflow-hidden border border-border bg-card", className)}
      aria-hidden="true"
    >
      <div className="scene-grid absolute inset-0" />
      <div className="scene-glow absolute inset-0" />
      {children}
      <span className="absolute top-3 left-3 size-3 border-t border-l border-primary" />
      <span className="absolute top-3 right-3 size-3 border-t border-r border-primary" />
      <span className="absolute bottom-3 left-3 size-3 border-b border-l border-foreground/30" />
      <span className="absolute right-3 bottom-3 size-3 border-r border-b border-foreground/30" />
      <p className="absolute inset-x-0 bottom-0 flex items-center justify-between px-8 pb-5 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        <span className="flex items-center gap-3">
          <span className="h-px w-5 bg-primary" />
          {caption}
        </span>
        {index && <span>{index}</span>}
      </p>
    </div>
  )
}

/* ---------- Services: one diagram per service (400 x 500) ---------- */

function ServiceDiagram({ id }: { id: ServiceId }) {
  switch (id) {
    case "manned-guarding":
      // Gate with two posts, a guard post and a stationed marker at the entrance.
      return (
        <g>
          <path d="M20 360 H130 M270 360 H380" stroke={LINE} strokeWidth="2" />
          <rect x="122" y="150" width="16" height="216" stroke={LINE} />
          <rect x="262" y="150" width="16" height="216" stroke={LINE} />
          <path d="M138 190 H262 M138 230 H262 M138 270 H262" stroke={FAINT} />
          <path d="M122 150 H278" stroke={RED} strokeWidth="2" />
          <rect x="300" y="250" width="56" height="64" stroke={LINE} />
          <path d="M294 250 L328 222 L362 250" stroke={LINE} />
          <circle cx="200" cy="420" r="16" stroke={RED} strokeWidth="1.5" />
          <circle cx="200" cy="420" r="4" fill={RED} />
          <path d="M200 400 V372" stroke={RED} strokeDasharray="3 6" />
          <path d="M60 300 L100 300 M80 280 L80 320" stroke={FAINT} />
        </g>
      )
    case "events-security":
      // Crowd field inside a cordon with two controlled entry points.
      return (
        <g>
          {Array.from({ length: 7 }).map((_, r) =>
            Array.from({ length: 10 }).map((__, c) => (
              <circle
                key={`${r}-${c}`}
                cx={52 + c * 33}
                cy={150 + r * 30}
                r="3"
                fill={LINE}
                opacity={(r * 3 + c) % 5 === 0 ? 1 : 0.4}
              />
            )),
          )}
          <rect
            x="30"
            y="122"
            width="340"
            height="236"
            stroke={RED}
            strokeWidth="2"
            strokeDasharray="14 10"
            className="anim-dash"
          />
          <path d="M30 358 H150 M250 358 H370" stroke={LINE} strokeWidth="2" />
          <path d="M150 358 V400 M250 358 V400" stroke={RED} strokeWidth="2" />
          <path d="M20 90 L60 70 L100 90" stroke={FAINT} />
          <path d="M300 90 L340 70 L380 90" stroke={FAINT} />
        </g>
      )
    case "k9-unit":
      // Handler and dog markers along a winding track with paired footprints.
      return (
        <g>
          <path
            d="M50 420 C100 360 40 310 120 290 S250 300 230 220 S350 190 350 110"
            stroke={FAINT}
            strokeWidth="14"
            strokeLinecap="round"
          />
          <path
            d="M50 420 C100 360 40 310 120 290 S250 300 230 220 S350 190 350 110"
            stroke={RED}
            strokeWidth="2"
            strokeDasharray="2 14"
            strokeLinecap="round"
            className="anim-trace"
          />
          {[
            [78, 372],
            [96, 330],
            [150, 288],
            [214, 276],
            [240, 226],
            [290, 204],
            [338, 160],
          ].map(([x, y], i) => (
            <g key={`${x}${y}`}>
              <circle cx={x - 5} cy={y} r="3" fill={LINE} />
              <circle cx={x + 5} cy={y - 6} r="3" fill={LINE} />
              {i === 6 && <circle cx={x} cy={y} r="22" stroke={RED} />}
            </g>
          ))}
          <circle cx="50" cy="420" r="12" stroke={LINE} />
          <circle cx="50" cy="420" r="3" fill={LINE} />
          <circle cx="350" cy="110" r="9" fill={RED} />
        </g>
      )
    case "cctv-installation":
      // Camera on a mount with a wide field of view over a site.
      return (
        <g>
          <path d="M40 60 H110" stroke={LINE} strokeWidth="2" />
          <path d="M74 60 V88" stroke={LINE} />
          <rect x="52" y="88" width="64" height="30" transform="rotate(18 84 103)" stroke={RED} strokeWidth="2" />
          <path d="M110 112 L380 200 L300 440 Z" fill="var(--primary)" fillOpacity="0.08" className="anim-breathe" />
          <path
            d="M110 112 L380 200 M110 112 L300 440 M110 112 L345 320"
            stroke={RED}
            strokeOpacity="0.8"
            strokeDasharray="6 8"
          />
          <rect x="250" y="290" width="70" height="70" stroke={LINE} strokeDasharray="4 4" />
          <path
            d="M250 304 V290 H264 M306 290 H320 V304 M320 346 V360 H306 M264 360 H250 V346"
            stroke={RED}
            strokeWidth="2"
          />
          <path d="M40 440 H380" stroke={FAINT} />
        </g>
      )
    case "electric-fencing":
      // Fence line with live wires and pulses travelling along it.
      return (
        <g>
          {[40, 120, 200, 280, 360].map((x) => (
            <g key={x}>
              <path d={`M${x} 170 V380`} stroke={LINE} strokeWidth="2" />
              <rect x={x - 5} y="164" width="10" height="10" fill={LINE} />
            </g>
          ))}
          {[210, 260, 310, 360].map((y, i) => (
            <path key={y} d={`M30 ${y} H370`} stroke={i === 1 ? RED : LINE} strokeWidth={i === 1 ? 2 : 1} />
          ))}
          <path
            d="M30 260 H370"
            stroke={RED}
            strokeWidth="4"
            strokeDasharray="4 60"
            strokeLinecap="round"
            className="anim-dash"
          />
          <path
            d="M30 310 H370"
            stroke={RED}
            strokeWidth="3"
            strokeDasharray="3 90"
            strokeLinecap="round"
            className="anim-trace"
          />
          <path
            d="M160 190 L176 214 L162 224 L178 250"
            stroke={RED}
            strokeWidth="2"
            strokeLinejoin="round"
            className="anim-breathe"
          />
          <path d="M20 400 H380" stroke={FAINT} />
        </g>
      )
    case "alarm-response":
      // Radar sweep with an alert point and a response route.
      return (
        <g>
          <circle cx="200" cy="230" r="170" stroke={LINE} />
          <circle cx="200" cy="230" r="115" stroke={FAINT} />
          <circle cx="200" cy="230" r="60" stroke={FAINT} />
          <path d="M30 230 H370 M200 60 V400" stroke={FAINT} />
          <g className="anim-spin" style={{ transformOrigin: "200px 230px" }}>
            <path d="M200 230 L200 60 A170 170 0 0 1 320 110 Z" fill="var(--primary)" fillOpacity="0.2" />
            <path d="M200 230 V60" stroke={RED} strokeWidth="2" />
          </g>
          <circle cx="290" cy="150" r="7" fill={RED} />
          <circle
            cx="290"
            cy="150"
            r="7"
            stroke={RED}
            className="anim-pulse-ring"
            style={{ transformOrigin: "290px 150px" }}
          />
          <circle cx="150" cy="300" r="4" fill={LINE} />
          <path d="M200 230 L290 150" stroke={RED} strokeDasharray="4 8" />
        </g>
      )
    case "vip-close-protection":
      // Protected point with a close ring, outer arcs and a movement path.
      return (
        <g>
          <circle cx="200" cy="250" r="14" fill={RED} />
          <circle cx="200" cy="250" r="52" stroke={RED} strokeWidth="1.5" />
          <circle
            cx="200"
            cy="250"
            r="100"
            stroke={LINE}
            strokeDasharray="2 10"
            className="anim-spin-slow"
            style={{ transformOrigin: "200px 250px" }}
          />
          <circle cx="200" cy="250" r="150" stroke={FAINT} />
          {[0, 72, 144, 216, 288].map((deg) => (
            <circle key={deg} cx="200" cy="198" r="6" fill={LINE} transform={`rotate(${deg} 200 250)`} />
          ))}
          <path d="M40 440 C110 400 130 350 160 320" stroke={FAINT} strokeDasharray="4 8" />
          <path
            d="M240 210 C290 170 340 130 380 70"
            stroke={RED}
            strokeDasharray="3 10"
            strokeLinecap="round"
            className="anim-trace"
          />
        </g>
      )
  }
}

export function ServiceArt({
  id,
  index,
  total,
  className,
}: {
  id: ServiceId
  index: string
  total: string
  className?: string
}) {
  return (
    <ArtFrame caption="Service" index={`${index} / ${total}`} className={cn("aspect-[4/5] w-full", className)}>
      <svg
        className="absolute inset-0 size-full"
        viewBox="0 0 400 500"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <ServiceDiagram id={id} />
      </svg>
    </ArtFrame>
  )
}

/* ---------- Industries: environments around the brand mark ---------- */

/**
 * Six nodes on a ring around the approved logo. `nodes` are rendered by the caller (icons need lucide components),
 * positioned in percentages so the ring scales with the frame.
 */
export function RingOrbit({
  nodes,
  caption,
  className,
}: {
  nodes: { id: string; label: string; icon: React.ReactNode }[]
  caption: string
  className?: string
}) {
  const n = nodes.length
  return (
    <ArtFrame caption={caption} index={`0${n}`} className={cn("aspect-square w-full", className)}>
      <svg className="absolute inset-0 size-full" viewBox="0 0 400 400" fill="none">
        <circle cx="200" cy="200" r="150" stroke={LINE} />
        <circle cx="200" cy="200" r="110" stroke={FAINT} />
        <circle
          cx="200"
          cy="200"
          r="150"
          stroke={RED}
          strokeDasharray="2 12"
          className="anim-spin-slow"
          style={{ transformOrigin: "200px 200px" }}
        />
        <circle
          cx="200"
          cy="200"
          r="178"
          stroke={FAINT}
          strokeDasharray="2 8"
          className="anim-spin-rev"
          style={{ transformOrigin: "200px 200px" }}
        />
        {nodes.map((_, i) => {
          const a = (-90 + (360 / n) * i) * (Math.PI / 180)
          return <path key={i} d={`M200 200 L${200 + 150 * Math.cos(a)} ${200 + 150 * Math.sin(a)}`} stroke={FAINT} />
        })}
      </svg>
      <div className="absolute top-1/2 left-1/2 size-[27%] -translate-x-1/2 -translate-y-1/2">
        <Image src={siteConfig.logo.src} alt="" width={160} height={160} className="size-full object-contain" />
      </div>
      {nodes.map((node, i) => {
        const a = (-90 + (360 / n) * i) * (Math.PI / 180)
        return (
          <span
            key={node.id}
            className="absolute flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center border border-border bg-background text-foreground"
            style={{ left: `${50 + 37.5 * Math.cos(a)}%`, top: `${50 + 37.5 * Math.sin(a)}%` }}
          >
            {node.icon}
            <span className="sr-only">{node.label}</span>
          </span>
        )
      })}
    </ArtFrame>
  )
}

/* ---------- About: brand plate ---------- */

export function BrandPlate({ className }: { className?: string }) {
  return (
    <ArtFrame caption={siteConfig.name} index="Brand" className={cn("aspect-[16/10] w-full", className)}>
      <svg
        className="absolute inset-0 size-full"
        viewBox="0 0 640 400"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        {[70, 120, 170, 220, 270].map((r, i) => (
          <circle
            key={r}
            cx="320"
            cy="190"
            r={r}
            stroke={i === 0 ? RED : LINE}
            strokeDasharray={i % 2 ? "2 10" : undefined}
            className={i % 2 ? "anim-spin-slow" : "anim-spin-rev"}
            style={{ transformOrigin: "320px 190px" }}
          />
        ))}
        <path d="M0 190 H640 M320 0 V400" stroke={FAINT} />
      </svg>
      <div className="absolute top-[46%] left-1/2 size-[34%] -translate-x-1/2 -translate-y-1/2">
        <Image src={siteConfig.logo.src} alt="" width={240} height={240} className="size-full object-contain" />
      </div>
    </ArtFrame>
  )
}

/* ---------- Hero (no footage): rings with the logo, right-hand side ---------- */

export function HeroEmblem({ className }: { className?: string }) {
  return (
    <div className={cn("scene pointer-events-none absolute inset-0", className)} aria-hidden="true">
      <svg
        className="absolute inset-0 size-full"
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        {[150, 260, 370, 480, 590].map((r, i) => (
          <circle
            key={r}
            cx="1170"
            cy="470"
            r={r}
            stroke={i === 0 ? RED : LINE}
            strokeOpacity={i === 0 ? 1 : 0.6}
            strokeDasharray={i % 2 ? "2 10" : undefined}
            className={i % 2 ? "anim-spin-slow" : "anim-spin-rev"}
            style={{ transformOrigin: "1170px 470px" }}
          />
        ))}
        <path d="M600 470 H1600 M1170 -100 V1000" stroke={FAINT} />
        <circle cx="1170" cy="470" r="5" fill={RED} opacity="0" />
      </svg>
      <div className="absolute top-[52%] left-[73%] hidden aspect-square w-[19vw] max-w-[340px] min-w-40 -translate-x-1/2 -translate-y-1/2 lg:landscape:block">
        <Image src={siteConfig.logo.src} alt="" width={240} height={240} className="size-full object-contain" />
      </div>
    </div>
  )
}
