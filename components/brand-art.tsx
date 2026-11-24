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

function Posts({ pts }: { pts: [number, number][] }) {
  return (
    <>
      {pts.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x - 3} y={y - 3} width="6" height="6" fill={LINE} />
      ))}
    </>
  )
}

function ServiceDiagram({ id }: { id: ServiceId }) {
  switch (id) {
    case "manned-guarding":
      return (
        <g>
          <path d="M40 330 H150 M250 330 H360" stroke={LINE} strokeWidth="1.5" />
          <Posts
            pts={[
              [150, 330],
              [250, 330],
            ]}
          />
          <path d="M150 330 L150 250 M250 330 L250 250" stroke={LINE} />
          <path d="M150 250 H250" stroke={RED} strokeWidth="2" strokeDasharray="8 8" className="anim-dash" />
          {[
            [120, 300],
            [280, 300],
            [200, 372],
          ].map(([x, y]) => (
            <g key={`${x}${y}`}>
              <circle cx={x} cy={y} r="14" stroke={RED} />
              <circle cx={x} cy={y} r="3" fill={RED} />
            </g>
          ))}
          <path d="M200 120 V330" stroke={FAINT} />
          <path d="M200 180 L200 330" stroke={RED} strokeDasharray="2 10" />
          <path d="M184 196 L200 180 L216 196" stroke={RED} />
          <rect x="170" y="90" width="60" height="40" stroke={LINE} />
          <path d="M170 90 L200 66 L230 90" stroke={LINE} />
        </g>
      )
    case "events-security":
      return (
        <g>
          {Array.from({ length: 6 }).map((_, r) =>
            Array.from({ length: 9 }).map((__, c) => (
              <circle
                key={`${r}-${c}`}
                cx={60 + c * 35}
                cy={170 + r * 28}
                r="2.5"
                fill={LINE}
                opacity={(r + c) % 4 === 0 ? 1 : 0.45}
              />
            )),
          )}
          <rect
            x="40"
            y="140"
            width="320"
            height="190"
            stroke={RED}
            strokeWidth="1.5"
            strokeDasharray="12 10"
            className="anim-dash"
          />
          {[40, 120, 200, 280, 360].map((x) => (
            <rect key={x} x={x - 3} y="337" width="6" height="6" fill={LINE} />
          ))}
          <path d="M40 340 H360" stroke={LINE} />
          <path d="M170 340 V380 M230 340 V380" stroke={RED} strokeWidth="2" />
          <path d="M150 395 H250" stroke={FAINT} />
          <circle
            cx="200"
            cy="100"
            r="30"
            stroke={LINE}
            strokeDasharray="2 8"
            className="anim-spin-slow"
            style={{ transformOrigin: "200px 100px" }}
          />
          <circle cx="200" cy="100" r="4" fill={RED} />
        </g>
      )
    case "k9-unit":
      return (
        <g>
          <path
            d="M60 380 C110 340 90 290 150 280 S230 300 250 240 S330 200 340 140"
            stroke={RED}
            strokeWidth="2"
            strokeDasharray="3 12"
            strokeLinecap="round"
            className="anim-trace"
          />
          {[
            [60, 380],
            [150, 280],
            [250, 240],
            [340, 140],
          ].map(([x, y], i) => (
            <g key={x}>
              <circle cx={x} cy={y} r={i === 3 ? 38 : 22} stroke={LINE} strokeDasharray="2 6" />
              <circle cx={x} cy={y} r="4" fill={i === 3 ? RED : LINE} />
            </g>
          ))}
          <circle cx="340" cy="140" r="64" stroke={FAINT} />
          <path d="M60 120 H140 M60 140 H110" stroke={FAINT} />
        </g>
      )
    case "cctv-installation":
      return (
        <g>
          <path d="M60 380 L340 380 L340 200 L60 200 Z" stroke={LINE} />
          <path d="M60 200 L200 140 L340 200" stroke={LINE} />
          <path d="M80 110 L130 96 L142 130 L92 144 Z" stroke={RED} strokeWidth="1.5" />
          <path d="M100 140 V160" stroke={LINE} />
          <path d="M142 126 L330 220 L250 380 Z" fill="var(--primary)" fillOpacity="0.07" className="anim-breathe" />
          <path d="M142 126 L330 220 M142 126 L250 380" stroke={RED} strokeOpacity="0.7" strokeDasharray="6 8" />
          <rect x="258" y="270" width="40" height="40" stroke={LINE} strokeDasharray="4 4" />
          <path
            d="M258 282 V270 H270 M286 270 H298 V282 M298 298 V310 H286 M270 310 H258 V298"
            stroke={RED}
            strokeWidth="1.5"
          />
        </g>
      )
    case "electric-fencing":
      return (
        <g>
          {[80, 160, 240, 320].map((x) => (
            <g key={x}>
              <path d={`M${x} 190 V360`} stroke={LINE} strokeWidth="1.5" />
              <rect x={x - 4} y="184" width="8" height="8" fill={LINE} />
            </g>
          ))}
          {[220, 260, 300, 340].map((y) => (
            <path
              key={y}
              d={`M60 ${y} H340`}
              stroke={y === 260 ? RED : LINE}
              strokeWidth={y === 260 ? 2 : 1}
              strokeDasharray={y === 260 ? "14 10" : undefined}
              className={y === 260 ? "anim-dash" : undefined}
            />
          ))}
          <path
            d="M170 200 L186 224 L172 232 L188 262"
            stroke={RED}
            strokeWidth="2"
            strokeLinejoin="round"
            className="anim-breathe"
          />
          <path d="M40 380 H360" stroke={FAINT} />
          <path d="M60 130 H340" stroke={FAINT} strokeDasharray="2 8" />
        </g>
      )
    case "alarm-response":
      return (
        <g>
          <circle cx="130" cy="150" r="10" fill={RED} />
          {[0, 1, 2].map((i) => (
            <circle
              key={i}
              cx="130"
              cy="150"
              r="10"
              stroke={RED}
              className="anim-pulse-ring"
              style={{ transformOrigin: "130px 150px", animationDelay: `${i * 0.8}s` }}
            />
          ))}
          <path
            d="M130 150 C140 230 300 220 270 330 S 250 390 300 400"
            stroke={RED}
            strokeWidth="2"
            strokeDasharray="10 12"
            className="anim-dash"
          />
          <rect x="294" y="394" width="12" height="12" stroke={LINE} />
          <circle cx="130" cy="150" r="96" stroke={FAINT} />
          <circle cx="130" cy="150" r="48" stroke={LINE} strokeDasharray="2 8" />
          <path d="M40 300 H140 M60 320 H120" stroke={FAINT} />
        </g>
      )
    case "vip-close-protection":
      return (
        <g>
          <circle cx="200" cy="240" r="8" fill={RED} />
          <circle cx="200" cy="240" r="38" stroke={LINE} />
          <circle
            cx="200"
            cy="240"
            r="78"
            stroke={LINE}
            strokeDasharray="2 10"
            className="anim-spin-slow"
            style={{ transformOrigin: "200px 240px" }}
          />
          <circle cx="200" cy="240" r="120" stroke={FAINT} />
          {[0, 90, 180, 270].map((deg) => (
            <path key={deg} d="M200 130 L200 148" stroke={RED} strokeWidth="2" transform={`rotate(${deg} 200 240)`} />
          ))}
          <path d="M60 420 C120 380 150 330 200 320" stroke={FAINT} strokeDasharray="4 8" />
          <path
            d="M200 160 C260 120 320 100 350 70"
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
    <ArtFrame
      caption={siteConfig.name}
      index="Brand"
      className={cn("aspect-[16/10] w-full", className)}
    >
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
        {[110, 190, 270, 350, 430].map((r, i) => (
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
        <path d="M730 470 H1600 M1170 30 V900" stroke={FAINT} />
        <circle cx="1170" cy="470" r="5" fill={RED} opacity="0" />
      </svg>
      <div className="absolute top-[52%] left-[73%] hidden size-[15%] min-w-32 -translate-x-1/2 -translate-y-1/2 md:block">
        <Image src={siteConfig.logo.src} alt="" width={240} height={240} className="size-full object-contain" />
      </div>
    </div>
  )
}
