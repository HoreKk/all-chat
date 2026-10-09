import { runtime } from "../server/runtime.ts"
import type { RpcContext } from "./base.ts"

/** The prebuilt app context, shared by every request (ADR 3: one runtime per process). */
export const makeContext = async (): Promise<RpcContext> => ({
  "effect/context": await runtime.context()
})
