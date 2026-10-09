import { RPCHandler } from "@orpc/server/fetch"
import { makeContext } from "./context.ts"
import { router } from "./router.ts"

const handler = new RPCHandler(router)

export const handleRpc = async (request: Request) => {
  const { response } = await handler.handle(request, { prefix: "/api/rpc", context: await makeContext() })
  return response ?? new Response("Not Found", { status: 404 })
}
