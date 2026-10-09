---
status: accepted
---

# One long-lived Node process with SQLite

Tab Out needs server push (SSE) per game and an in-memory matchmaking queue, which rules out serverless and edge hosting. We run a single Node process (Fly.io or Railway) with one SQLite file (libSQL) through `@effect/sql`: no ops, nine small tables, and live game state kept in memory. We accept that a redeploy kills a running game (a game lasts two minutes; deploy between match days). Swap to Postgres only if traffic surprises.
