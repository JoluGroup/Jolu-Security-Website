export type BodyResult = { ok: true; text: string } | { ok: false; reason: "too_large" | "unreadable" }

/**
 * Reads a request body as UTF-8 text, stopping as soon as more than `maxBytes`
 * bytes have arrived. Unlike request.text(), this never buffers an oversized body
 * (including chunked bodies that declare no Content-Length).
 */
export async function readBodyWithLimit(request: Request, maxBytes: number): Promise<BodyResult> {
  if (!request.body) return { ok: true, text: "" }
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined)
        return { ok: false, reason: "too_large" }
      }
      chunks.push(value)
    }
  } catch {
    return { ok: false, reason: "unreadable" }
  }
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return { ok: true, text: new TextDecoder().decode(bytes) }
}
