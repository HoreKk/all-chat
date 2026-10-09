---
status: accepted
---

# oRPC v2 (beta) with `@orpc/experimental-effect` on Effect v4

The typed contract between client and server is oRPC v2, still in beta, bridged to Effect with `@orpc/experimental-effect@beta`, whose docs already use the Effect v4 API (`Context.Service`). Effect 4.0 is released (the brief predates that; see the Effect 4.0 release post), so the moving targets are now the two oRPC packages. We take them because the Effect integration (`handlerGen`, `middlewareGen`, `WithEffectContext`, SSE via `AsyncIteratorObject`) is the point of the project. Mitigations: exact versions pinned on day one, thin handlers (ADR-0001), and oRPC v1 as the fallback if the beta breaks. The stack spike on the wayfinder map ran procedures end to end on the pin set below and accepted this ADR on 2026-10-10 (see *Accepted* below). The oRPC v1 fallback still applies if a later beta breaks.

## Pin set (2026-10-10)

The version-pinning ticket checked these against the npm registry, the tarballs and an install plus `tsc` run; detail and sources in [`docs/research/pin-set.md`](../research/pin-set.md). Exact versions, no carets; changing a pin amends this ADR.

- `@orpc/server`, `@orpc/client`, `@orpc/experimental-effect`, `@orpc/tanstack-query`: `2.0.0-beta.43`. The `latest` tag of `@orpc/experimental-effect` is the v1 bridge, so it is never installed untagged.
- `effect`, `@effect/sql-pg`, `@effect/vitest`: `4.0.2` (`TestClock` from `effect/testing`, `it.effect` from `@effect/vitest`).
- `@tanstack/react-start` `1.168.60`, `@tanstack/react-router` `1.170.41`, `@tanstack/react-query` `5.104.1`; `react` / `react-dom` `19.3.0`; `vite` `8.3.4`; `vitest` `5.0.3`; `typescript` `7.0.2`; Node 24 LTS.
- `drizzle-orm` / `drizzle-kit`: `1.0.0-rc.5-5935859` (`rc5` dist-tag, a commit build). The `rc` tag (`1.0.0-rc.4`) crashes on load against Effect 4.0; rc5 carries Drizzle's Effect 4.0 release fixes. See ADR-0004.
- `pg` `8.23.1` (dev only, for `drizzle-kit`); no Postgres driver at runtime, since `@effect/sql-pg` speaks the protocol itself.

All four bridge exports the spike depends on (`handlerGen`, `middlewareGen`, the `effect/wrap` context key, `extensions/input-output`) are present. `effect/wrap` runs once per effect, not once per request: the app context is built once and passed through `'effect/context'`, and `effect/wrap` is kept for tracing. Signing and cookie helpers are functions in `@orpc/server/helpers`.

## Accepted (2026-10-10)

The [stack spike](https://github.com/HoreKk/all-chat/issues/6) passed every criterion on this pin set with Node 24 and Postgres. The run went TanStack Start's `/api/rpc/$` server route, then `RPCHandler`, `middlewareGen` identity, `handlerGen`, a `Context.Service`, and a Drizzle `effect-postgres` query. It also covered the SSR server client with no HTTP, `tsc` exit 0 and `vite build`. The spike fixed these conventions:

- **One runtime per process.** A module-level `ManagedRuntime.make(AppLayer)` holds the app context. Each request passes `'effect/context': await runtime.context()`, and `effect/wrap` only adds spans. The Layer built once across all requests.
- **Dev HMR guard.** Vite's SSR program reload re-evaluates the runtime module, so each edit started another scheduler fiber (three live after two edits). The runtime is kept on `globalThis`. Before re-evaluation builds a new runtime, the previous one is `dispose()`d, which closes its scope and interrupts its forked fibers.
- **Guest identity.** A read middleware never mints, and treats a missing or tampered cookie as no identity. A write middleware (submit, vote, play) mints a UUID and sets it with `sign` and `setCookie` through a `resHeaders` the route appends to the response. The cookie is `allchat_id`, `HttpOnly; Secure; SameSite=Lax; Path=/`, and expires 2026-11-30 23:59:59 Paris.
- **Public views.** The entity is `createSelectSchema(table)`. A public output is `Entity.mapFields(Struct.omit([...]))` on `.output(...)`, whose validation strips private fields even when a service returns full rows.

