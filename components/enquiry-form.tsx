"use client"

import { Suspense, useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2, MessageCircle, Phone } from "lucide-react"
import { CountyCombobox } from "@/components/county-combobox"
import { Button } from "@/components/ui/button"
import {
  ENQUIRY_FIELDS,
  HONEYPOT_FIELD,
  LIMITS,
  normalizePhone,
  validateEnquiry,
  type EnquiryField,
  type EnquiryResponse,
  type FieldErrors,
} from "@/lib/enquiry/schema"
import { SERVICES, isServiceId } from "@/lib/services"
import { siteConfig, whatsappLink } from "@/lib/site-config"
import { cn } from "@/lib/utils"

type Values = { name: string; phone: string; email: string; service: string; county: string; town: string; details: string; consent: boolean }
const EMPTY: Values = { name: "", phone: "", email: "", service: "", county: "", town: "", details: "", consent: false }

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "accepted"; ref: string }
  | { kind: "test" }
  | { kind: "error"; message: string }

const ERROR_MESSAGES: Record<string, string> = {
  invalid: "Please check the highlighted fields.",
  not_configured: "Online enquiries are not available at the moment, so nothing was sent.",
  rate_limited: "Your enquiry was not sent due to a high volume of requests. Please try again later or contact our team directly by phone or WhatsApp.",
  unavailable: "Online enquiries are temporarily unavailable, so nothing was sent. Please try again shortly.",
  delivery_failed: "Your enquiry could not be submitted, so nothing was sent.",
  server_error: "Something went wrong on our side, so nothing was sent. Please try again, or call or message us on WhatsApp.",
  in_progress: "Your enquiry is already being sent. Please wait a moment; there is no need to submit it again.",
  // A dropped connection or an unreadable reply can happen after the server received the enquiry,
  // so this must not claim that nothing was sent. Retrying is safe: identical enquiries are de-duplicated.
  network:
    "We could not confirm that your enquiry reached us because of a connection problem, so it may or may not have been received. Please try again, or call or message us on WhatsApp.",
}
const GENERIC_ERROR = "Your enquiry could not be submitted, so nothing was sent."

const inputClass =
  "h-12 w-full rounded-md border border-input bg-background px-3 text-base text-foreground placeholder:text-muted-foreground/70 aria-invalid:border-primary"

/** Preselects the service from `?service=<id>`. Isolated so the form itself stays static. */
function ServiceFromUrl({ onService }: { onService: (id: string) => void }) {
  const service = useSearchParams().get("service")
  useEffect(() => {
    if (isServiceId(service)) onService(service)
  }, [service, onService])
  return null
}

export function EnquiryForm() {
  const [values, setValues] = useState<Values>(EMPTY)
  const [honeypot, setHoneypot] = useState("")
  const [errors, setErrors] = useState<FieldErrors>({})
  const [status, setStatus] = useState<Status>({ kind: "idle" })
  const formRef = useRef<HTMLFormElement>(null)
  const statusRef = useRef<HTMLDivElement>(null)

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((v) => ({ ...v, [key]: value }))
    if (errors[key as EnquiryField]) setErrors((e) => ({ ...e, [key]: undefined }))
  }
  // Stable identity (setValues never changes), so ServiceFromUrl's effect re-runs only when
  // the ?service= value changes and never overwrites a choice the visitor made afterwards.
  const setService = useCallback((id: string) => setValues((v) => ({ ...v, service: id })), [])

  const focusFirstError = (errs: FieldErrors) => {
    const first = ENQUIRY_FIELDS.find((f) => errs[f])
    if (first) formRef.current?.querySelector<HTMLElement>(`[data-field="${first}"]`)?.focus()
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (status.kind === "submitting") return

    const check = validateEnquiry(values)
    if (!check.ok) {
      setErrors(check.errors)
      setStatus({ kind: "error", message: ERROR_MESSAGES.invalid })
      focusFirstError(check.errors)
      return
    }

    setErrors({})
    setStatus({ kind: "submitting" })
    let result: EnquiryResponse | null = null
    try {
      const res = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, [HONEYPOT_FIELD]: honeypot }),
      })
      result = (await res.json().catch(() => null)) as EnquiryResponse | null
    } catch {
      setStatus({ kind: "error", message: ERROR_MESSAGES.network })
      statusRef.current?.focus()
      return
    }

    if (result?.ok && "state" in result && result.state === "accepted") {
      setStatus({ kind: "accepted", ref: result.ref })
      setValues(EMPTY)
    } else if (result?.ok && "mode" in result && result.mode === "test") {
      setStatus({ kind: "test" })
    } else if (result && !result.ok && result.code === "invalid") {
      setErrors(result.errors)
      setStatus({ kind: "error", message: ERROR_MESSAGES.invalid })
      focusFirstError(result.errors)
      return
    } else {
      const code = result && !result.ok ? result.code : ""
      // The outcome is unknown: it may have reached us, so never say it was not sent.
      const message =
        result === null
          ? ERROR_MESSAGES.network
          : !result.ok && result.code === "delivery_uncertain"
          ? `We could not confirm that your enquiry reached us, so it may or may not have been received (reference ${result.ref}). You can send it again, or call or message us on WhatsApp.`
          : (ERROR_MESSAGES[code] ?? GENERIC_ERROR)
      setStatus({ kind: "error", message })
    }
    statusRef.current?.focus()
  }

  const submitting = status.kind === "submitting"

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate aria-labelledby="enquiry-title" className="flex flex-col gap-6">
      <Suspense fallback={null}>
        <ServiceFromUrl onService={setService} />
      </Suspense>

      <h3 id="enquiry-title" className="text-2xl font-semibold tracking-tight text-foreground">
        Send an enquiry
      </h3>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="name" label="Full name" error={errors.name}>
          {(props) => (
            <input {...props} type="text" autoComplete="name" maxLength={LIMITS.name} value={values.name} onChange={(e) => set("name", e.target.value)} className={inputClass} />
          )}
        </Field>
        <Field id="phone" label="Phone" hint="For example 0712 345 678" error={errors.phone}>
          {(props) => (
            <input
              {...props}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={LIMITS.phone + 10}
              value={values.phone}
              onChange={(e) => set("phone", e.target.value)}
              onBlur={() => {
                const normalized = normalizePhone(values.phone)
                if (normalized) set("phone", normalized)
              }}
              className={cn(inputClass, "font-mono")}
            />
          )}
        </Field>
        <Field id="email" label="Email" error={errors.email} className="sm:col-span-2">
          {(props) => (
            <input {...props} type="email" autoComplete="email" maxLength={LIMITS.email} value={values.email} onChange={(e) => set("email", e.target.value)} className={inputClass} />
          )}
        </Field>
        <Field id="service" label="Service" error={errors.service} className="sm:col-span-2">
          {(props) => (
            <select {...props} value={values.service} onChange={(e) => set("service", e.target.value)} className={inputClass}>
              <option value="">Choose a service</option>
              {SERVICES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field id="county" label="County" error={errors.county}>
          {(props) => (
            <CountyCombobox
              key={values.county === "" && status.kind === "accepted" ? "reset" : "county"}
              id={props.id}
              value={values.county}
              onChange={(c) => set("county", c)}
              invalid={props["aria-invalid"]}
              describedBy={props["aria-describedby"]}
              inputClassName={inputClass}
            />
          )}
        </Field>
        <Field id="town" label="Town or area" error={errors.town}>
          {(props) => (
            <input {...props} type="text" autoComplete="address-level2" maxLength={LIMITS.town} value={values.town} onChange={(e) => set("town", e.target.value)} className={inputClass} />
          )}
        </Field>
        <Field id="details" label="What do you need?" hint="Describe the site, event or person, and the service you have in mind." error={errors.details} className="sm:col-span-2">
          {(props) => (
            <textarea
              {...props}
              rows={5}
              maxLength={LIMITS.details}
              value={values.details}
              onChange={(e) => set("details", e.target.value)}
              className={cn(inputClass, "h-auto py-3 leading-relaxed")}
            />
          )}
        </Field>
      </div>

      <div className="absolute -left-[9999px] size-px overflow-hidden" aria-hidden="true">
        <label htmlFor={HONEYPOT_FIELD}>Leave this field empty</label>
        <input id={HONEYPOT_FIELD} name={HONEYPOT_FIELD} type="text" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
      </div>

      {/* TODO(jolu): the company must supply the data controller name and the retention period for this notice. */}
      <div className="flex flex-col gap-2">
        <div className="flex items-start gap-3">
          <input
            id="consent"
            data-field="consent"
            type="checkbox"
            checked={values.consent}
            onChange={(e) => set("consent", e.target.checked)}
            aria-invalid={errors.consent ? true : undefined}
            aria-describedby={cn("consent-notice", errors.consent && "consent-error")}
            className="mt-1 size-5 shrink-0 accent-primary"
          />
          <label htmlFor="consent" className="text-sm leading-relaxed text-foreground">
            I agree to {siteConfig.name} using these details to respond to my enquiry.
          </label>
        </div>
        <p id="consent-notice" className="pl-8 text-sm leading-relaxed text-muted-foreground">
          We collect your name, phone, email, location and the details you write here. They are sent to {siteConfig.name} by email and used only to respond to this enquiry.
        </p>
        {errors.consent && (
          <p id="consent-error" className="pl-8 text-sm text-primary">
            {errors.consent}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Button type="submit" size="lg" disabled={submitting} className="h-12 px-8 text-base">
          {submitting && <Loader2 className="animate-spin" aria-hidden="true" />}
          {submitting ? "Submitting" : "Submit enquiry"}
        </Button>
      </div>

      <div ref={statusRef} tabIndex={-1} aria-live="polite" role="status" className="rounded-md outline-offset-4">
        <StatusMessage status={status} />
      </div>
    </form>
  )
}

function StatusMessage({ status }: { status: Status }) {
  if (status.kind === "accepted") {
    return (
      <div className="flex flex-col gap-3 border-l-2 border-primary pl-4">
        <p className="text-foreground">
          Your request has been submitted. Reference: <span className="font-mono">{status.ref}</span>
        </p>
        <a
          href={whatsappLink(`${siteConfig.contact.whatsappGreeting}. My enquiry reference is ${status.ref}.`)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-fit items-center gap-2 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          <MessageCircle className="size-4" aria-hidden="true" />
          Message us on WhatsApp (optional)
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </div>
    )
  }
  if (status.kind === "test") {
    return <p className="border-l-2 border-border pl-4 text-foreground">Test mode: nothing was sent.</p>
  }
  if (status.kind === "error") {
    return (
      <div className="flex flex-col gap-3 border-l-2 border-primary pl-4">
        <p className="text-foreground">{status.message} Your details are still in the form.</p>
        <p className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          You can also reach us directly:
          <a href={siteConfig.contact.phoneHref} className="flex items-center gap-2 font-mono text-foreground underline underline-offset-4">
            <Phone className="size-4" aria-hidden="true" />
            {siteConfig.contact.phoneDisplay}
          </a>
          <a href={siteConfig.contact.whatsappHref} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-foreground underline underline-offset-4">
            <MessageCircle className="size-4" aria-hidden="true" />
            WhatsApp
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </p>
      </div>
    )
  }
  return null
}

type ControlProps = { id: string; "data-field": string; "aria-invalid"?: boolean; "aria-describedby"?: string }

function Field({
  id,
  label,
  hint,
  error,
  className,
  children,
}: {
  id: EnquiryField
  label: string
  hint?: string
  error?: string
  className?: string
  children: (props: ControlProps) => ReactNode
}) {
  const describedBy = cn(hint && `${id}-hint`, error && `${id}-error`) || undefined
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children({ id, "data-field": id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })}
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm text-primary">
          {error}
        </p>
      )}
    </div>
  )
}
