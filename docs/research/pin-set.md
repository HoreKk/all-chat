# Pin set: oRPC v2 beta, Effect 4.0, Drizzle RC, TanStack

Research for the version-pinning ticket on the [wayfinder map](https://github.com/HoreKk/all-chat/issues/1). Checked on 2026-10-10 against the npm registry, the published tarballs, the GitHub sources and the oRPC docs. Scratch verification ran outside the repo, under the session scratchpad (`pin-check/` and `pin-check-rc5/`).

## Short answer

- **oRPC v2 + the Effect bridge + Effect 4.0 work together.** `@orpc/*@2.0.0-beta.43` with `effect@4.0.2` installs with no peer conflicts and type-checks cleanly. At runtime, `handlerGen`, `middlewareGen`, `.effect(...)`, `effect/wrap`, Effect `Schema` input validation and `sign`/`unsign` cookies all ran correctly. All four trip-condition exports are present. ADR-0003 records this pin set and stays *proposed*; only the stack spike accepts it.
- **The Drizzle `rc` dist-tag (`1.0.0-rc.4`) does not work with Effect 4.0.** It type-checks, but `import 'drizzle-orm/effect-postgres'` throws at load time: `TypeError: Schema$1.TaggedErrorClass is not a function`. rc.4 came out on 2026-06-27 and was built against an Effect 4 beta. Effect 4.0.0 shipped on 2026-10-01 and renamed that API to `Schema.TaggedError`.
- **The newest Drizzle prerelease, `1.0.0-rc.5-5935859` (dist-tag `rc5`, 2026-09-09), does work with Effect 4.0.2.** Against a real Postgres it loaded, ran insert and select, returned a typed `EffectDrizzleQueryError`, decoded a row through `drizzle-orm/effect-schema`, and applied a `drizzle-kit generate` migration through `drizzle-orm/effect-postgres/migrator`. It is a commit build, not a tagged release. The owner has two options: pin this preview, or take ADR-0004's fallback (a hand-written `Database` service over Drizzle's plain driver).
- **No `pg`/`postgres` driver is needed at runtime.** The Drizzle Effect integration sits on `@effect/sql-pg`'s `PgClient`, and `@effect/sql-pg@4.0.2` ships its own wire protocol with no driver dependency. Only `drizzle-kit migrate`/`push`/`studio` need a driver, and drizzle-kit looks for **`pg`** first.

## Pin table

Recommended set, assuming the `rc5` preview is accepted for Drizzle. "Verified" means it went through install + `tsc` in the scratch project, plus the runtime smoke tests where noted.

| Package | Exact version | dist-tag | Source |
| --- | --- | --- | --- |
| `@orpc/server` | `2.0.0-beta.43` | `beta` (`latest` is 1.15.5) | [npm](https://www.npmjs.com/package/@orpc/server/v/2.0.0-beta.43), [GitHub tag](https://github.com/middleapi/orpc/tree/v2.0.0-beta.43/packages/server) |
| `@orpc/client` | `2.0.0-beta.43` | `beta` | [npm](https://www.npmjs.com/package/@orpc/client/v/2.0.0-beta.43) |
| `@orpc/experimental-effect` | `2.0.0-beta.43` | `beta` (**`latest` is 1.14.11, the v1 bridge**, so never install it untagged) | [npm](https://www.npmjs.com/package/@orpc/experimental-effect/v/2.0.0-beta.43), [GitHub tag](https://github.com/middleapi/orpc/tree/v2.0.0-beta.43/packages/effect/src) |
| `@orpc/tanstack-query` | `2.0.0-beta.43` | `beta` | [npm](https://www.npmjs.com/package/@orpc/tanstack-query/v/2.0.0-beta.43) |
| `effect` | `4.0.2` | `latest` (4.0.0 on 2026-10-01, 4.0.2 on 2026-10-07) | [npm](https://www.npmjs.com/package/effect/v/4.0.2), [GitHub tag](https://github.com/Effect-TS/effect/tree/effect@4.0.2/packages/effect) |
| `@effect/sql-pg` | `4.0.2` | `latest` | [npm](https://www.npmjs.com/package/@effect/sql-pg/v/4.0.2). This is the `PgClient` that `drizzle-orm/effect-postgres` requires, and the only `@effect/*` runtime package the app needs. |
| `@effect/vitest` | `4.0.2` | `latest` | [npm](https://www.npmjs.com/package/@effect/vitest/v/4.0.2). Provides `it.effect` and `it.layer`. Peer `vitest >=5 <6`. |
| `@effect/platform-node` | `4.0.2` (optional) | `latest` | [npm](https://www.npmjs.com/package/@effect/platform-node/v/4.0.2). TanStack Start owns the HTTP server, so the app only needs this for `NodeRuntime`-style entry points. HTTP, SQL, RPC and testing modules now live inside `effect` itself (`effect/http`, `effect/sql`, `effect/testing`, per `effect/README.md` in the tarball). |
| `drizzle-orm` | `1.0.0-rc.5-5935859` (recommended); `1.0.0-rc.4` is broken, see below | `rc5` (`rc` = 1.0.0-rc.4, `latest` = 0.45.4) | [npm](https://www.npmjs.com/package/drizzle-orm/v/1.0.0-rc.5-5935859), [commit 59358596](https://github.com/drizzle-team/drizzle-orm/blob/59358596b5be6a79f9cc1a2a20d39d276f6ab4b5/drizzle-orm/src/effect-core/errors.ts) |
| `drizzle-kit` | `1.0.0-rc.5-5935859` (matches the ORM; rc.4 also ran `generate` fine) | `rc5` | [npm](https://www.npmjs.com/package/drizzle-kit/v/1.0.0-rc.5-5935859) |
| `pg` (dev, drizzle-kit only) | `8.23.1` | `latest` | [npm](https://www.npmjs.com/package/pg/v/8.23.1). drizzle-kit checks for `pg` before `postgres` (`drizzle-kit/bin.cjs`, `checkPackage("pg")`). |
| `@types/pg` | `8.23.1` | `latest` | [npm](https://www.npmjs.com/package/@types/pg) |
| `@tanstack/react-start` | `1.168.60` | `latest` | [npm](https://www.npmjs.com/package/@tanstack/react-start/v/1.168.60). Pins `@tanstack/react-router@1.170.41` exactly; `engines.node >=22.12.0`. |
| `@tanstack/react-router` | `1.170.41` | `latest` | [npm](https://www.npmjs.com/package/@tanstack/react-router/v/1.170.41) |
| `@tanstack/react-query` | `5.104.1` | `latest` | [npm](https://www.npmjs.com/package/@tanstack/react-query/v/5.104.1). `@orpc/tanstack-query` peers `@tanstack/query-core >=5.89.0`, and one 5.104.1 copy is deduped. |
| `react` / `react-dom` | `19.3.0` | `latest` | [npm](https://www.npmjs.com/package/react) |
| `vite` | `8.3.4` | `latest` | Optional peer of react-start (`>=7.0.0`) |
| `vitest` | `5.0.3` | `latest` | `engines.node ^22.12.0 \|\| ^24.0.0 \|\| >=26.0.0` |
| `typescript` | `7.0.2` | `latest` | Effect requires TS ≥ 5.9 with `strict` and recommends 7 (`effect/README.md` in the tarball) |
| `@types/node`, `@types/react`, `@types/react-dom` | `26.6.5`, `19.3.0`, `19.3.0` | `latest` | |

Notes on peers (from `npm view <pkg>@<ver> peerDependencies`):

- `@orpc/experimental-effect` declares `effect >=4.0.0`.
- `@effect/sql-pg`, `@effect/vitest` and `@effect/platform-node` declare `effect ^4.0.2`.
- `drizzle-orm@1.0.0-rc.4` declares `effect >=4.0.0-beta.83 || >=4.0.0` and `@effect/sql-pg` with the same range. `rc.5-5935859` declares `>=4.0.0-beta.105 || >=4.0.0`.
- These ranges are satisfied by 4.0.2 even where the code is not. The rc.4 failure does not show up as a peer conflict.

## Export checklist: `@orpc/experimental-effect@2.0.0-beta.43`

Sources: the tarball (`package/package.json` `exports` and `package/dist/**/*.d.mts`), the [GitHub source at tag v2.0.0-beta.43](https://github.com/middleapi/orpc/tree/v2.0.0-beta.43/packages/effect/src), and the [oRPC Effect integration guide](https://orpc.dev/docs/integrations/effect).

| Item | Status | Where (tarball) | Docs |
| --- | --- | --- | --- |
| `handlerGen` | **present** | `dist/shared/experimental-effect.D0zFxpKr.d.mts`, re-exported from `dist/index.d.mts` | `import { handlerGen } from '@orpc/experimental-effect'`; agrees |
| `middlewareGen` | **present** | `dist/index.d.mts` (`MiddlewareGen`, `MiddlewareGenNext`, `MiddlewareGenOptions` too) | agrees; `yield* next({ context })` inside |
| `WithEffectContext` | **present** (type) | `dist/shared/experimental-effect.D0zFxpKr.d.mts`; defines `'effect/context': Context.Context<Services>` and optional `'effect/wrap'` | agrees |
| `createEffectClient` | **present** | `dist/index.d.mts` (`EffectClient<T>` maps every procedure to `Effect.Effect<Output, Error>`) | agrees |
| `effect/wrap` | **present, as a context key** (not a plugin) | `WithEffectContext['effect/wrap']?: (effect, { path, procedure, signal }) => Effect` in the shared `.d.mts`; applied in `dist/index.mjs` lines 110–114 | The docs also describe it as a context key, used for tracing and error handling. The **brief** is the one that disagrees: it calls it a plugin that provides the app `Layer` "once per request". The smoke test (below) shows `effect/wrap` runs **once per effect**: once for each `middlewareGen` and once for the handler, so `['p1','p1','p2']` for one middleware-guarded call plus one plain call. Building the app `Layer` inside `effect/wrap` would rebuild it several times per request. Build the context once (e.g. a `ManagedRuntime` or a pre-built `Context`) and pass it through `'effect/context'`; keep `effect/wrap` for spans. |
| `extensions/input-output` (Effect `Schema` on `.input`/`.output`) | **present** | `exports["./extensions/input-output"]` → `dist/extensions/input-output.d.mts`; augments `@orpc/contract` and `@orpc/server` builders to accept `Schema.ConstraintDecoder` | agrees: import it once, then pass `Schema.Struct(...)` directly |
| `.effect(function* …)` builder method | **present** | `exports["./extensions/effect"]` → `dist/extensions/effect.d.mts` | agrees: `import '@orpc/experimental-effect/extensions/effect'` |
| Extras | present | `catchORPCError`, `catchORPCErrorCode(s)`, `EffectSchemaToJsonSchemaConverter`, `runPromise`, `toStandardSchema`, `InferEffectServices` in `dist/index.d.mts` | The docs show `Schema.toStandardSchemaV1` from `effect` for the no-extension path. It exists in `effect@4.0.2` (`dist/Schema.d.ts:1080`). The tarball also exports its own `toStandardSchema`, which the docs page does not show. |

The docs give no version beyond `npm install @orpc/experimental-effect@beta effect`. The tarball pins the peer to `effect >=4.0.0`. Apart from the `effect/wrap` framing in our brief, docs and tarball agree.

**`Signing` / `Cookie` helpers in the oRPC v2 beta.** They exist as **functions, not classes**, in `@orpc/server/helpers` (`package/dist/helpers/index.d.mts` in the `@orpc/server@2.0.0-beta.43` tarball; source [signing.ts](https://github.com/middleapi/orpc/blob/v2.0.0-beta.43/packages/server/src/helpers/signing.ts) and [cookie.ts](https://github.com/middleapi/orpc/blob/v2.0.0-beta.43/packages/server/src/helpers/cookie.ts)):

- `sign(value, secret)`, `unsign(signed, secret)` and `getSignedValue(signed)`
- `setCookie(headers, name, value, opts)`, `getCookie(headers, name, opts)` and `deleteCookie(headers, name, opts)`
- `encrypt`/`decrypt` and `encodeBase64url`/`decodeBase64url`

A sign → `setCookie` → `getCookie` → `unsign` round trip inside a `middlewareGen` identity middleware worked at runtime. This covers the signed guest cookie that carries an identity.

## Drizzle RC and Effect 4.0

- **Integration surface.** `drizzle-orm` RC ships `drizzle-orm/effect-postgres` (`make`, `makeWithDefaults`, `DefaultServices`, `EffectPgDatabase`), `drizzle-orm/effect-postgres/migrator`, `drizzle-orm/pg-core/effect/*` and `drizzle-orm/effect-core` (errors, logger). `effect-postgres/driver.d.ts` requires `PgClient` from `@effect/sql-pg/PgClient` (tarball `package/effect-postgres/driver.d.ts`).
- **`1.0.0-rc.4` (dist-tag `rc`) fails at runtime on Effect 4.0.2.**
  - The cause is `package/effect-core/errors.js` and `package/cache/core/cache-effect.js`, which call `Schema.TaggedErrorClass()(…)`. `effect@4.0.2` has no `TaggedErrorClass` (`dist/Schema.d.ts` exports `TaggedError`), and neither does `4.0.0-rc.118`.
  - The live test failed on import with `TypeError: Schema$1.TaggedErrorClass is not a function`. `tsc` does not catch it, because the `.d.ts` files declare the classes without the base call.
  - Upstream tracks this as [drizzle-orm#6162](https://github.com/drizzle-team/drizzle-orm/issues/6162), which is open.
- **`1.0.0-rc.5-5935859` (dist-tag `rc5`) works at runtime.** Its `effect-core/errors.js` uses `Schema.TaggedError()` ([source at 59358596](https://github.com/drizzle-team/drizzle-orm/blob/59358596b5be6a79f9cc1a2a20d39d276f6ab4b5/drizzle-orm/src/effect-core/errors.ts)). The live smoke test against a local Postgres 14 covered:
  - `PgClient.layer` → `makeWithDefaults` → insert → select
  - a duplicate key failing with `_tag: "EffectDrizzleQueryError"`
  - `migrate(db, { migrationsFolder })` applying a `drizzle-kit generate` migration
- **Type-level caveat (both builds).** 4 `.d.ts` files in the pg path import `effect/unstable/sql/SqlError`:
  - `effect-postgres/migrator.d.ts`
  - `effect-postgres/session.d.ts`
  - `pg-core/effect/db.d.ts`
  - `pg-core/effect/session.d.ts`

  `effect@4.0.2` no longer has `effect/unstable/*`; it moved to `effect/sql/SqlError`. With `skipLibCheck: true`, which Drizzle needs anyway (49 other `.d.ts` errors under `skipLibCheck: false` with TS 7), the missing module silently becomes `any`. A probe showed the error channel of `migrate(...)` collapses to `any`, while query builders (`db.select().from(t)`) keep `EffectDrizzleQueryError`. Expect weaker typing on migrations and transactions, not breakage.
- **Effect `Schema` derivation from tables: yes.** `drizzle-orm/effect-schema` exports `createSelectSchema`, `createInsertSchema` and `createUpdateSchema` (tarball `package/effect-schema/index.d.ts`, built on `effect/Schema` v4 types). This answers ADR-0004's "derived from the tables where the pinned Drizzle version allows it". A derived select schema decoded a live row. Two open upstream issues are worth knowing:
  - [#6412](https://github.com/drizzle-team/drizzle-orm/issues/6412): vector columns break on Effect rc.118+ renames. We do not use vectors.
  - [#6382](https://github.com/drizzle-team/drizzle-orm/issues/6382): `effect-postgres` `db.execute()` is typed as rows but returns the `@effect/sql-pg` result object. Avoid `db.execute` or unwrap it explicitly.
- **Postgres driver.**
  - Runtime: none. `@effect/sql-pg@4.0.2` has only `effect` as a peer and no dependencies; it implements the protocol itself (`dist/PgProtocol`, `dist/PgConnection`).
  - Tooling: `pg@8.23.1` for drizzle-kit `migrate`/`push`/`studio`. `generate` needs no driver.
  - Migrations can also be applied by the app at boot through `drizzle-orm/effect-postgres/migrator`, which then needs no driver at all.

## Effect 4.0 stability of the modules All Chat would use

Effect 4.0.2 marks stability in JSDoc as `@stability stable|unstable` on each module and export (counted from `package/dist/*.d.ts` in the tarball). The old `effect/unstable/*` import paths are gone; former unstable packages now live at `effect/http`, `effect/sql`, `effect/rpc` and so on.

| Module | Status |
| --- | --- |
| `Effect`, `Layer`, `Context` (incl. `Context.Service`), `Ref`, `SynchronizedRef`, `PubSub`, `Queue`, `Fiber`, `Schedule`, `Cron`, `Clock`, `Duration`, `DateTime`, `Data`, `Redacted` | **stable**: every tagged export is `@stability stable` |
| `effect/testing` → `TestClock` | **stable** (the `TestClock.d.ts` exports are all stable; the `effect/testing` barrel's own header and `TestConsole` / `TestSchema` are unstable) |
| `Schema` | **stable core** (478 stable tags), with 132 unstable exports: `Cookie`, `Cookies`, `Headers`, `UrlParams`, `RecordFromCookies`, `RecordFromUrlParams`, IP/MAC/socket-address schemas, `ByteSize*`, `Graph`. Avoid `Schema.Cookie`/`Headers` in domain code; the guest cookie goes through oRPC helpers anyway. |
| `effect/schema` subpath (`Model`, `VariantSchema`, AOT/JIT compilers) | **unstable** |
| `Effect.withErrorReporting`, `Effect.withExecutionPlan`; `Stream.withExecutionPlan`, `Stream.limitBytes`; `Config.ByteSize` | **unstable** (individual exports) |
| `effect/sql` (`SqlClient`, `SqlError`, `Migrator`, …) | **unstable**. Both `@effect/sql-pg` (13 unstable tags in `PgClient.d.ts`) and Drizzle's Effect integration sit on it. |
| `effect/http` (`HttpServer`, `HttpRouter`, `HttpServerResponse`, `Cookies`) | **unstable**. Not needed: TanStack Start + oRPC own HTTP. |
| `@effect/vitest` | no `@stability` tags in `dist/index.d.ts` |

## Install and type-check verification

Scratch project: `pin-check/` with exact versions (no carets), Drizzle `1.0.0-rc.4`, run as `npm install --ignore-scripts`. `pin-check-rc5/` is the same project with `drizzle-orm`/`drizzle-kit` at `1.0.0-rc.5-5935859`.

`src/check.ts` imports and uses the following, under `tsconfig`: `strict`, `exactOptionalPropertyTypes`, `moduleResolution: bundler` and `skipLibCheck: true`.

- oRPC server and client:
  - `os`, `ORPCError`, `RouterClient`
  - `RPCHandler` from `@orpc/server/fetch`
  - `sign`, `unsign`, `getCookie`, `setCookie`, `deleteCookie` from `@orpc/server/helpers`
  - `createORPCClient`, and `RPCLink` from `@orpc/client/fetch`
  - `createTanstackQueryUtils`
- The Effect bridge: `handlerGen`, `middlewareGen`, `createEffectClient`, `toStandardSchema`, `WithEffectContext`, and both extensions
- Effect: `Context.Service`, `Layer`, `Schedule.cron`, `Cron.parseUnsafe`, `PubSub`, `Ref`, `Schema`, `Redacted`, `Duration`, `TestClock.adjust`, and `it.effect` from `@effect/vitest`
- Drizzle: `pgTable`, `effect-postgres` `makeWithDefaults`, `migrate`, `createSelectSchema`/`createInsertSchema`, `PgClient.layer`, and `defineConfig` from drizzle-kit
- TanStack: `createFileRoute`, `createRouter`, `createIsomorphicFn`, `createStart`, `QueryClient`

**Install output (both projects):**

```
npm warn EBADENGINE Unsupported engine {
npm warn EBADENGINE   package: 'vitest@5.0.3',
npm warn EBADENGINE   required: { node: '^22.12.0 || ^24.0.0 || >=26.0.0' },
npm warn EBADENGINE   current: { node: 'v25.9.0', npm: '11.12.1' }
added 197 packages in 16s
```

- There were **no peer-dependency conflicts**. `npm ls` shows only UNMET OPTIONAL peers (`fastify`, `crossws`, `bufferutil`, `@opentelemetry/api`, swagger/scalar).
- Everything dedupes to a single `effect@4.0.2`, `@tanstack/query-core@5.104.1`, `@tanstack/react-router@1.170.41`, `react@19.3.0` and `vite@8.3.4`.
- The engine warning is about this machine's Node 25 (an odd, non-LTS line). Pin **Node 24 LTS** for the project, since TanStack Start needs ≥ 22.12.

**`tsc --noEmit` (TypeScript 7.0.2):**

- **Exit 0 in both projects**, after two fixes to my own call sites:
  - `RPCLink({ url })` in v2 is typed as a path (`` `/${string}` ``), so `'/api/rpc'` rather than an absolute URL (`@standard-server/core` `StandardUrl`).
  - `Cron.unsafeParse` is `Cron.parseUnsafe` in 4.0.
- With `--skipLibCheck false`: 53 errors, all inside `node_modules/drizzle-orm`.
  - 4 are `TS2307: Cannot find module 'effect/unstable/sql/SqlError'`.
  - The rest are Drizzle's own `.d.ts` issues: cockroach, mssql, mysql, singlestore and sqlite builders, `PgPolicy`, `PgRole`.

**Runtime smoke tests (beyond the brief, because the type-check missed the Drizzle break):**

- `import('drizzle-orm/effect-postgres')` with rc.4 gives `TypeError: Schema$1.TaggedErrorClass is not a function`. With rc.5-5935859 it is ok.
- Live Postgres with rc.5-5935859 returned `OK {"rows":[{"id":"q1","text":"smoke","votes":0}],"decoded":{…},"errTag":"EffectDrizzleQueryError"}`. The migrator returned `OK [{"n":1}]`.
- oRPC via `call()`:
  - A `middlewareGen` identity guard plus a `handlerGen` that yields a `Context.Service` returned `ident-1:7`.
  - `.input(Schema.Struct(…)).effect(…)` returned the input. Invalid input gave `BAD_REQUEST`.
  - The `effect/wrap` calls were `['p1','p1','p2']`.

## Trip conditions

**None of `handlerGen`, `middlewareGen`, `effect/wrap` or `extensions/input-output` is missing** from `@orpc/experimental-effect@2.0.0-beta.43`. All four are present in the tarball and documented, and the first three were exercised at runtime. The oRPC v1 fallback is not triggered.

One separate trip does fire, ADR-0004's Drizzle condition: the Drizzle **`rc` dist-tag (`1.0.0-rc.4`) does not run on Effect 4.0**. Only the untagged-release preview `1.0.0-rc.5-5935859` does. The owner decides between:

- pinning that preview, and accepting `skipLibCheck` plus an `any`-typed `SqlError` on migrations;
- or ADR-0004's fallback: a hand-written `Database` service with `Effect.tryPromise` over Drizzle's non-Effect driver.
