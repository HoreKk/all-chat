import "@orpc/experimental-effect/extensions/effect"
import "@orpc/experimental-effect/extensions/input-output"
import type { WithEffectContext } from "@orpc/experimental-effect"
import { os } from "@orpc/server"
import type { ManagedRuntime } from "effect"
import type { runtime } from "@/server/runtime.ts"

type Services = typeof runtime extends ManagedRuntime.ManagedRuntime<infer R, any> ? R : never

export interface RpcContext extends WithEffectContext<Services> {}

export const base = os.$context<RpcContext>()
