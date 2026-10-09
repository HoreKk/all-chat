---
status: accepted
---

# Postgres with Drizzle instead of SQLite

Amends ADR-0002 on 2026-10-09, before any code was written. The owner chose Postgres as the database and Drizzle (release candidate) as the ORM, replacing the brief's SQLite (libSQL/Turso) through `@effect/sql`. The single long-lived Node process, the in-memory live game state and the "deploy between tournament days" rule from ADR-0002 still hold. Postgres becomes a managed instance on the chosen host, plus a local container for development.

## Consequences

- We use the Drizzle release candidate, which ships its own Effect integration. Database access goes through that integration as an Effect service in the app `Layer`, so services keep the boundary rule of ADR-0001. The target is Effect 4.0. The version-pinning ticket checks that the pinned RC's Effect integration supports Effect 4.0; if it only supports Effect 3, the fallback is to wrap the Drizzle client in a hand-written `Database` service with `Effect.tryPromise`.
- The Drizzle table definitions become the source of the DB row types. The brief's "one `Schema.Class` per entity for the DB row, the oRPC output and the UI type" becomes: Drizzle tables for the rows, Effect `Schema` classes for the oRPC outputs and the UI, derived from the tables where the pinned Drizzle version allows it. The stack spike settles the mechanism.
- Migrations are generated and applied with `drizzle-kit`.
- Tests of services that touch the database need a Postgres instance (a container), or a `Database` layer replaced with an in-memory fake. Pure logic (ballot rules, the matchmaker, the game engine) stays testable under `TestClock` with no database at all.
