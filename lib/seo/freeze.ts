/** Recursively freezes plain data so publication registries cannot be mutated at runtime. Returns the same object. */
export function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const key of Reflect.ownKeys(value)) deepFreeze((value as Record<PropertyKey, unknown>)[key])
  }
  return value
}

/** A frozen deep copy made by one pass of JSON serialisation: getters run once, proxies and functions cannot survive. Throws on non-plain data. */
export function snapshot<T>(value: T): T {
  const text = JSON.stringify(value)
  if (text === undefined) throw new Error("value is not serialisable")
  return deepFreeze(JSON.parse(text) as T)
}
