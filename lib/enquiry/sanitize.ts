// Pure string sanitisers shared by the client form and the API route.

// C0/C1 control characters except tab (\u0009) and line feed (\u000A), plus bidi
// override and zero-width characters that can disguise text in email clients.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g

export function stripControl(value: string): string {
  return value.replace(/\r\n?/g, "\n").replace(CONTROL_CHARS, "")
}

/** Single-line field: no line breaks, collapsed whitespace, trimmed, length-capped. */
export function cleanLine(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return ""
  return stripControl(value).replace(/\s+/g, " ").trim().slice(0, maxLength)
}

/** Multi-line field: keeps line breaks, collapses runs of blank lines, trimmed, length-capped. */
export function cleanMultiline(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return ""
  return stripControl(value)
    .replace(/\t/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxLength)
}
