import type { LayerId } from "@/lib/protection-layers"
import { cn } from "@/lib/utils"

export type SceneId = LayerId | "intro"

export type MediaSlot = {
  /** Muted, looping background video. When set it replaces the SVG scene. */
  video?: string
  /** Poster frame shown while the video loads, or if it cannot play. */
  poster?: string
}

const RED = "var(--primary)"
const LINE = "var(--scene-line)"
const FAINT = "var(--scene-faint)"

export function LayerScene({
  scene,
  media,
  isStatic = false,
  className,
}: {
  scene: SceneId
  media?: MediaSlot
  isStatic?: boolean
  className?: string
}) {
  return (
    <div className={cn("scene relative size-full overflow-hidden bg-background", isStatic && "scene-static", className)} aria-hidden="true">
      {media?.video ? (
        <video
          className="absolute inset-0 size-full object-cover opacity-60"
          src={media.video}
          poster={media.poster}
          muted
          loop
          playsInline
          autoPlay={!isStatic}
          preload="metadata"
        />
      ) : (
        <SceneArt scene={scene} />
      )}
      <div className="scene-grid pointer-events-none absolute inset-0" />
      <div className="scene-glow pointer-events-none absolute inset-0" />
    </div>
  )
}

function SceneArt({ scene }: { scene: SceneId }) {
  return (
    <svg
      className="absolute inset-0 size-full"
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
    >
      {scene === "intro" && <IntroArt />}
      {scene === "perimeter" && <PerimeterArt />}
      {scene === "access" && <AccessArt />}
      {scene === "eyes" && <EyesArt />}
      {scene === "response" && <ResponseArt />}
      {scene === "people" && <PeopleArt />}
    </svg>
  )
}

const CX = 1120
const CY = 450

function IntroArt() {
  const rings = [90, 160, 230, 300, 370]
  return (
    <g>
      {rings.map((r, i) => (
        <circle
          key={r}
          cx={CX}
          cy={CY}
          r={r}
          stroke={i === 0 ? RED : LINE}
          strokeWidth="1"
          strokeDasharray={i % 2 ? "2 10" : undefined}
          className={i % 2 ? "anim-spin-slow" : "anim-spin-rev"}
          style={{ transformOrigin: `${CX}px ${CY}px` }}
        />
      ))}
      <circle cx={CX} cy={CY} r="5" fill={RED} />
      <path d={`M${CX - 420} ${CY}H${CX + 420}M${CX} ${CY - 420}V${CY + 420}`} stroke={FAINT} />
    </g>
  )
}

function PerimeterArt() {
  const plot = "M820 220 L1420 180 L1480 640 L900 720 Z"
  const posts: [number, number][] = [
    [820, 220], [1020, 207], [1220, 193], [1420, 180], [1440, 333], [1460, 487], [1480, 640],
    [1287, 667], [1093, 693], [900, 720], [873, 553], [847, 387],
  ]
  return (
    <g>
      <path d={plot} stroke={LINE} strokeWidth="1" />
      <path d={plot} stroke={RED} strokeWidth="2" strokeDasharray="14 18" className="anim-dash" />
      {posts.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x - 3} y={y - 3} width="6" height="6" fill={LINE} />
      ))}
      <rect x="1040" y="360" width="200" height="140" stroke={LINE} />
      <path d="M1040 360 L1140 300 L1240 360" stroke={LINE} />
      <g className="anim-spin" style={{ transformOrigin: "1150px 450px" }}>
        <path d="M1150 450 L1150 70 A380 380 0 0 1 1418 182 Z" fill="url(#sweep)" />
        <line x1="1150" y1="450" x2="1150" y2="70" stroke={RED} strokeWidth="1.5" />
      </g>
      <defs>
        <linearGradient id="sweep" x1="1150" y1="70" x2="1418" y2="182" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle cx="1150" cy="450" r="380" stroke={FAINT} />
      <circle cx="1150" cy="450" r="250" stroke={FAINT} strokeDasharray="2 8" />
    </g>
  )
}

function AccessArt() {
  const bars = Array.from({ length: 9 }, (_, i) => 1000 + i * 30)
  return (
    <g>
      <rect x="930" y="250" width="50" height="460" stroke={LINE} />
      <rect x="1290" y="250" width="50" height="460" stroke={LINE} />
      <path d="M980 330 H1290 M980 690 H1290" stroke={LINE} />
      {bars.map((x) => (
        <line key={x} x1={x} y1="330" x2={x} y2="690" stroke={LINE} strokeOpacity="0.6" />
      ))}
      <path d="M760 710 H1510" stroke={LINE} />
      <path d="M1135 710 L1060 860 M1135 710 L1210 860" stroke={FAINT} />
      {[
        "M900 220 h40 M900 220 v40",
        "M1370 220 h-40 M1370 220 v40",
        "M900 740 h40 M900 740 v-40",
        "M1370 740 h-40 M1370 740 v-40",
      ].map((d) => (
        <path key={d} d={d} stroke={RED} strokeWidth="2" />
      ))}
      <g className="anim-scan-y">
        <rect x="900" y="0" width="470" height="60" fill="url(#scanfade)" />
        <line x1="900" y1="60" x2="1370" y2="60" stroke={RED} strokeWidth="1.5" />
      </g>
      <defs>
        <linearGradient id="scanfade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.22" />
        </linearGradient>
        <clipPath id="gateclip">
          <rect x="900" y="220" width="470" height="520" />
        </clipPath>
      </defs>
    </g>
  )
}

function EyesArt() {
  const cols = 3
  const rows = 3
  const w = 220
  const h = 150
  const gap = 24
  const x0 = 780
  const y0 = 200
  return (
    <g>
      {Array.from({ length: cols * rows }, (_, i) => {
        const c = i % cols
        const r = Math.floor(i / cols)
        const x = x0 + c * (w + gap)
        const y = y0 + r * (h + gap)
        const focus = i === 4
        return (
          <g key={i}>
            <rect x={x} y={y} width={w} height={h} stroke={focus ? RED : LINE} strokeWidth={focus ? 1.5 : 1} />
            <path d={`M${x + w / 2 - 10} ${y + h / 2}h20M${x + w / 2} ${y + h / 2 - 10}v20`} stroke={focus ? RED : FAINT} />
            <clipPath id={`cam-${i}`}>
              <rect x={x} y={y} width={w} height={h} />
            </clipPath>
            <g clipPath={`url(#cam-${i})`}>
              <line
                x1={x}
                x2={x + w}
                y1={y}
                y2={y}
                stroke={focus ? RED : LINE}
                strokeOpacity={focus ? 0.9 : 0.35}
                className="anim-scan-cam"
                style={{ animationDelay: `${(i * 0.37) % 2.4}s` }}
              />
            </g>
          </g>
        )
      })}
      <g transform="translate(600 180)">
        <path d="M0 0 L90 -20 L100 20 L10 40 Z" stroke={LINE} />
        <path d="M95 0 L140 10" stroke={LINE} />
        <path d="M100 0 L560 160 L470 330 Z" fill="var(--primary)" fillOpacity="0.05" className="anim-breathe" />
      </g>
    </g>
  )
}

function ResponseArt() {
  const route = "M820 720 L820 560 L1000 560 L1000 380 L1220 380 L1220 260 L1360 260"
  return (
    <g>
      {[300, 380, 460, 560, 640, 720].map((y) => (
        <line key={`h${y}`} x1="740" x2="1520" y1={y} y2={y} stroke={FAINT} strokeWidth="6" strokeOpacity="0.5" />
      ))}
      {[820, 1000, 1100, 1220, 1360, 1460].map((x) => (
        <line key={`v${x}`} x1={x} x2={x} y1="180" y2="800" stroke={FAINT} strokeWidth="6" strokeOpacity="0.5" />
      ))}
      <path d={route} stroke={LINE} strokeWidth="2" />
      <path d={route} stroke={RED} strokeWidth="3" strokeDasharray="10 14" className="anim-dash" />
      <rect x="806" y="706" width="28" height="28" stroke={LINE} fill="var(--background)" />
      <g style={{ transformOrigin: "1360px 260px" }}>
        {[0, 1, 2].map((i) => (
          <circle
            key={i}
            cx="1360"
            cy="260"
            r="20"
            stroke={RED}
            className="anim-pulse-ring"
            style={{ transformOrigin: "1360px 260px", animationDelay: `${i * 0.8}s` }}
          />
        ))}
        <circle cx="1360" cy="260" r="7" fill={RED} />
      </g>
      <polyline
        points="740,140 900,140 930,110 960,170 990,90 1020,150 1050,140 1520,140"
        stroke={RED}
        strokeOpacity="0.6"
        strokeWidth="1.5"
        strokeDasharray="800"
        className="anim-trace"
      />
    </g>
  )
}

function PeopleArt() {
  const px = 1140
  const py = 470
  return (
    <g>
      {[150, 230, 320].map((r, i) => (
        <circle
          key={r}
          cx={px}
          cy={py}
          r={r}
          stroke={i === 0 ? RED : LINE}
          strokeWidth={i === 0 ? 1.5 : 1}
          strokeDasharray={i === 1 ? "4 12" : i === 2 ? "60 30" : undefined}
          className={i === 1 ? "anim-spin-slow" : i === 2 ? "anim-spin-rev" : "anim-breathe"}
          style={{ transformOrigin: `${px}px ${py}px` }}
        />
      ))}
      <circle cx={px} cy={py - 60} r="34" stroke={LINE} strokeWidth="1.5" />
      <path d={`M${px - 80} ${py + 80} C${px - 80} ${py + 10} ${px - 40} ${py - 10} ${px} ${py - 10} C${px + 40} ${py - 10} ${px + 80} ${py + 10} ${px + 80} ${py + 80}`} stroke={LINE} strokeWidth="1.5" />
      {[0, 72, 144, 216, 288].map((deg) => {
        const rad = (deg * Math.PI) / 180
        const x = px + Math.cos(rad) * 230
        const y = py + Math.sin(rad) * 230
        return <rect key={deg} x={x - 4} y={y - 4} width="8" height="8" fill={RED} transform={`rotate(45 ${x} ${y})`} />
      })}
    </g>
  )
}
