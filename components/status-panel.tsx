"use client"

import { useEffect, useState } from "react"
import { StatusDot } from "@/components/status-dot"
import { siteConfig } from "@/lib/site-config"

function useLocalTime(timeZone: string) {
  const [time, setTime] = useState<string | null>(null)
  useEffect(() => {
    const format = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
    const tick = () => setTime(format.format(new Date()))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [timeZone])
  return time
}

export function StatusPanel() {
  const { operationsCentre, stats, regions } = siteConfig
  const time = useLocalTime(operationsCentre.timeZone)

  return (
    <section
      aria-labelledby="control-room-title"
      className="rounded-xl border border-border bg-card"
    >
      <header className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6">
        <h2 id="control-room-title" className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Control Room Status
        </h2>
        <span className="font-mono text-xs tabular-nums text-muted-foreground" aria-label="Nairobi time">
          {time ?? "--:--:--"} EAT
        </span>
      </header>

      <div className="flex items-center gap-3 border-b border-border px-5 py-5 sm:px-6">
        <StatusDot pulse />
        <p className="text-sm text-foreground">
          {operationsCentre.label}{" "}
          <span className="font-mono text-status">{operationsCentre.status}</span>
        </p>
      </div>

      <dl className="grid grid-cols-2 border-b border-border">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className={`flex flex-col-reverse gap-1 px-5 py-6 sm:px-6 ${i > 0 ? "border-l border-border" : ""}`}
          >
            <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{stat.label}</dt>
            <dd className="font-mono text-4xl font-medium tracking-tight text-foreground sm:text-5xl">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="px-5 py-5 sm:px-6">
        <h3 className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Active regions</h3>
        <ul className="mt-3 flex flex-col">
          {regions.map((region) => (
            <li
              key={region}
              className="flex items-center justify-between border-t border-border py-3 first:border-t-0"
            >
              <span className="text-sm text-foreground">{region}</span>
              <span className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                <StatusDot />
                Online
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
