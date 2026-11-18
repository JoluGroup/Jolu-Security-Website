import { existsSync, statSync } from "node:fs"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

function resolveFile(base) {
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate
  }
  return null
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const file = resolveFile(path.join(root, specifier.slice(2)))
    if (file) return nextResolve(pathToFileURL(file).href, context)
  }
  return nextResolve(specifier, context)
}
