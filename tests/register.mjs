// Registers the "@/..." path alias (same as tsconfig paths) so Node's built-in test
// runner can import the TypeScript sources directly. No dependencies are needed:
// Node strips the types itself (Node 22.18+ or 23.6+).
import { register } from "node:module"

register("./loader.mjs", import.meta.url)
