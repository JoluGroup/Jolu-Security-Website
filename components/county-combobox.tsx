"use client"

import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react"
import { ChevronDown } from "lucide-react"
import { KENYA_COUNTIES } from "@/lib/kenya-counties"
import { cn } from "@/lib/utils"

/** Accessible, searchable combobox over the 47 Kenyan counties (WAI-ARIA combobox with listbox popup). */
export function CountyCombobox({
  id,
  value,
  onChange,
  invalid,
  describedBy,
  inputClassName,
}: {
  id: string
  value: string
  onChange: (county: string) => void
  invalid?: boolean
  describedBy?: string
  inputClassName?: string
}) {
  const listId = useId()
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLUListElement>(null)

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q || q === value.toLowerCase()) return [...KENYA_COUNTIES]
    return KENYA_COUNTIES.filter((c) => c.toLowerCase().includes(q))
  }, [query, value])

  const select = (county: string) => {
    onChange(county)
    setQuery(county)
    setOpen(false)
  }

  const moveTo = (index: number) => {
    setActive(index)
    listRef.current?.children[index]?.scrollIntoView({ block: "nearest" })
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      if (!open) setOpen(true)
      else moveTo(Math.min(matches.length - 1, active + 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      moveTo(Math.max(0, active - 1))
    } else if (e.key === "Enter" && open) {
      if (e.nativeEvent.isComposing || e.keyCode === 229) return
      e.preventDefault()
      if (matches[active]) select(matches[active])
    } else if (e.key === "Escape" && open) {
      e.preventDefault()
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        role="combobox"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && matches[active] ? `${listId}-${active}` : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        value={query}
        placeholder="Start typing a county"
        onChange={(e) => {
          setQuery(e.target.value)
          setActive(0)
          setOpen(true)
          if (value) onChange("")
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false)
          const exact = KENYA_COUNTIES.find((c) => c.toLowerCase() === query.trim().toLowerCase())
          if (exact) select(exact)
        }}
        onKeyDown={onKeyDown}
        className={cn(inputClassName, "pr-10")}
      />
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label="Counties"
          className="absolute inset-x-0 top-full z-20 mt-1 max-h-60 overflow-auto rounded-md border border-border bg-popover py-1 shadow-lg"
        >
          {matches.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground" role="presentation">
              No county matches “{query}”.
            </li>
          ) : (
            matches.map((county, i) => (
              <li
                key={county}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={county === value}
                onMouseDown={(e) => {
                  e.preventDefault()
                  select(county)
                }}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  "cursor-pointer px-3 py-2 text-sm text-popover-foreground",
                  i === active && "bg-accent",
                  county === value && "text-primary",
                )}
              >
                {county}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
