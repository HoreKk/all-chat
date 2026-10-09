---
status: accepted
---

# Effect owns the logic; oRPC handlers stay thin

All Chat is also the real-world excuse to learn Effect, and three of its stack layers (oRPC v2 beta, `@orpc/experimental-effect`, Effect v4) are moving targets. We decided that React components call oRPC procedures and nothing else; that a handler only validates, resolves the identity and `yield*`s a service; and that every rule (ballots, matchmaking, the game engine, quiz generation) lives in Effect services that never import oRPC. A breaking change in the transport then touches one folder, and the arcade engine and the quote ranking are testable with `Effect.runPromise` and `TestClock`, with no HTTP involved.
