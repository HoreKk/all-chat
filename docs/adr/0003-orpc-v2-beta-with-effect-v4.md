---
status: proposed
---

# oRPC v2 (beta) with `@orpc/experimental-effect` on Effect v4

The typed contract between client and server is oRPC v2, still in beta, bridged to Effect with `@orpc/experimental-effect@beta`, whose docs already use the Effect v4 API (`Context.Service`). We take three moving targets at once because the Effect integration (`handlerGen`, `middlewareGen`, `WithEffectContext`, SSE via `AsyncIteratorObject`) is the point of the project. Mitigations: exact versions pinned on day one, thin handlers (ADR-0001), and oRPC v1 as the fallback if the beta breaks. The status stays *proposed* until the version-pinning ticket on the wayfinder map confirms that the three work together.
