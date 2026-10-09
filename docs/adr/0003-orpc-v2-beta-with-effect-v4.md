---
status: proposed
---

# oRPC v2 (beta) with `@orpc/experimental-effect` on Effect v4

The typed contract between client and server is oRPC v2, still in beta, bridged to Effect with `@orpc/experimental-effect@beta`, whose docs already use the Effect v4 API (`Context.Service`). Effect 4.0 is released (the brief predates that; see the Effect 4.0 release post), so the moving targets are now the two oRPC packages. We take them because the Effect integration (`handlerGen`, `middlewareGen`, `WithEffectContext`, SSE via `AsyncIteratorObject`) is the point of the project. Mitigations: exact versions pinned on day one, thin handlers (ADR-0001), and oRPC v1 as the fallback if the beta breaks. The status stays *proposed* until the version-pinning ticket on the wayfinder map confirms that oRPC v2, the bridge and Effect 4.0 work together.
