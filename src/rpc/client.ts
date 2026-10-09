import { createORPCClient } from "@orpc/client"
import { RPCLink } from "@orpc/client/fetch"
import { createRouterClient, type RouterClient } from "@orpc/server"
import { createTanstackQueryUtils } from "@orpc/tanstack-query"
import { createIsomorphicFn } from "@tanstack/react-start"
import { makeContext } from "./context.ts"
import { router, type Router } from "./router.ts"

// SSR calls the router in-process with no HTTP; the browser goes through /api/rpc (ADR 3).
// TanStack Start's compiler drops the server branch and its imports from the client bundle.
const getClient = createIsomorphicFn()
  .server((): RouterClient<Router> => createRouterClient(router, { context: makeContext }))
  .client((): RouterClient<Router> => createORPCClient(new RPCLink({ url: "/api/rpc" })))

export const client: RouterClient<Router> = getClient()
export const orpc = createTanstackQueryUtils(client)
