---
status: proposed
---

# oRPC v2 (beta) with `@orpc/experimental-effect` on Effect v4

The typed contract between client and server is oRPC v2, still in beta, bridged to Effect with `@orpc/experimental-effect@beta`, whose docs already use the Effect v4 API (`Context.Service`). Effect 4.0 is released (the brief predates that; see the Effect 4.0 release post), so the moving targets are now the two oRPC packages. We take them because the Effect integration (`handlerGen`, `middlewareGen`, `WithEffectContext`, SSE via `AsyncIteratorObject`) is the point of the project. Mitigations: exact versions pinned on day one, thin handlers (ADR-0001), and oRPC v1 as the fallback if the beta breaks. The status stays *proposed* until the stack spike on the wayfinder map runs one procedure end to end on the pin set below; a failure there trips the oRPC v1 fallback.

## Pin set (2026-10-10)

The version-pinning ticket checked these against the npm registry, the tarballs and an install plus `tsc` run; detail and sources in [`docs/research/pin-set.md`](../research/pin-set.md). Exact versions, no carets; changing a pin amends this ADR.

- `@orpc/server`, `@orpc/client`, `@orpc/experimental-effect`, `@orpc/tanstack-query`: `2.0.0-beta.43`. The `latest` tag of `@orpc/experimental-effect` is the v1 bridge, so it is never installed untagged.
- `effect`, `@effect/sql-pg`, `@effect/vitest`: `4.0.2` (`TestClock` from `effect/testing`, `it.effect` from `@effect/vitest`).
- `@tanstack/react-start` `1.168.60`, `@tanstack/react-router` `1.170.41`, `@tanstack/react-query` `5.104.1`; `react` / `react-dom` `19.3.0`; `vite` `8.3.4`; `vitest` `5.0.3`; `typescript` `7.0.2`; Node 24 LTS.
- `drizzle-orm` / `drizzle-kit`: open. The `rc` tag (`1.0.0-rc.4`) crashes on load against Effect 4.0; only the commit build `1.0.0-rc.5-5935859` runs. The choice belongs to ADR-0004 and its own ticket on the map.
- `pg` `8.23.1` (dev only, for `drizzle-kit`); no Postgres driver at runtime, since `@effect/sql-pg` speaks the protocol itself.

All four bridge exports the spike depends on (`handlerGen`, `middlewareGen`, the `effect/wrap` context key, `extensions/input-output`) are present. `effect/wrap` runs once per effect, not once per request: the app context is built once and passed through `'effect/context'`, and `effect/wrap` is kept for tracing. Signing and cookie helpers are functions in `@orpc/server/helpers`.
