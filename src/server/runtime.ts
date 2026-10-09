import { ManagedRuntime, type Layer } from "effect"
import { AppLayer } from "./layers.ts"

// One runtime per process (ADR 3). Vite's SSR reload re-evaluates this module on edits,
// so the previous runtime is disposed first, which interrupts its polling fiber.
const key = Symbol.for("allchat/runtime")
const slot = globalThis as { [key]?: ManagedRuntime.ManagedRuntime<Layer.Success<typeof AppLayer>, unknown> }
if (slot[key]) void slot[key].dispose()

export const runtime = ManagedRuntime.make(AppLayer)
slot[key] = runtime
