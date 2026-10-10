import { createFileRoute } from "@tanstack/react-router"
import { handleRpc } from "@/rpc/handler.ts"

export const Route = createFileRoute("/api/rpc/$")({
  server: {
    handlers: {
      ANY: ({ request }) => handleRpc(request)
    }
  }
})
