# Worlds 2026 Project — Quote Wall & Pause Arcade

Oct 8, 2026 · @Antoine

## Vision & scope

A public companion site for Worlds 2026 (Oct 15 – Nov 14, 2026): one app, two modules, no rooms, no friend groups to set up. It fills the time when the game is *not* on — a tournament-wide quote wall voted day by day and stage by stage, and a quick-play arcade you can join in ten seconds during a pause — and it is the real-world excuse to learn Effect.

**Who it is for:** anyone watching Worlds. No account to create: a guest identity (signed cookie + nickname) is enough to submit, vote and play. Friends are optional — you can invite one to a match, but nothing requires it.

**In scope (v0)**

- Guest identity: nickname + signed cookie, created on first action; optional magic link later to keep it across devices
- Tournament calendar entered by hand by an admin: days, stages, matches (no live esports API)
- Quote Wall: submit a quote on a day, vote daily, then vote per stage (Play-Ins, Swiss, Quarterfinals, Semifinals, Final) and once for the whole tournament; public pages for every day, stage and the final hall of fame
- Pause Arcade: tap *Play* to join a public game via matchmaking, or send an invite link for a private match; 5 rounds of \~20 s; daily and overall leaderboards

**Explicitly out**

- Any prediction, bracket, pick'em or scoring of match outcomes
- Rooms, groups, friend lists, chat
- Live game data (objectives, drafts, stats)
- Mobile apps — responsive web only
- Moderation beyond "admin can hide a quote" and a per-identity submit rate limit

## The two modules

The wall feeds the arcade: every quote submitted during the tournament becomes a quiz question, so public games are full of lines everyone just heard, with zero authoring work.

**Quote Wall (asynchronous, between games)**

- The wall is organised by tournament day, grouped by stage: Play-Ins (Oct 15–18), Swiss (Oct 23–31), Quarterfinals (Nov 3–6), Semifinals (Nov 7–8), Final (Nov 14)
- Anyone submits a quote: text, day (defaults to today), match, optional "who said it" and team tag; duplicates are merged by the admin
- **Daily ballot:** one vote per identity per day, open from the day's first match until noon Paris time the next day → *Quote of the day*
- **Stage ballot:** when a stage ends, the daily winners plus the runners-up of each day form the stage ballot, open 48 h → *Quote of the Play-Ins*, *of the Swiss*, *of the Quarterfinals*…
- **Tournament ballot:** after the final, the stage winners compete for 72 h → *Quote of Worlds 2026*
- Public pages: `/day/:date`, `/stage/:stage`, `/hall-of-fame`; every ballot shows live counts once it closes, never before

**Pause Arcade (synchronous, during pauses)**

- **Quick play:** tap *Play* → you enter a matchmaking queue → a game starts as soon as 2 to 8 players are waiting, or after 10 s with whoever is there; alone after 10 s, you play solo against the day's median score
- **Invite:** *Play with a friend* creates a private lobby link; the game starts when the host taps *Start*. No account, no friend list
- A game is 5 rounds × 20 s: a question, answers locked at the timer, round scoreboard, next question; a whole game fits a short pause (\~2 min)
- Mini-game 1 (v0): quote quiz from the public wall — "who said it", "which match", "finish the quote"
- Mini-game 2–3 (only if time): champion-name typeracer, guess the splash art from a 5 % crop
- Leaderboards by nickname: today, this stage, whole tournament

|  | Quote Wall | Pause Arcade |
| --- | --- | --- |
| Rhythm | Any time, async; ballots close on a schedule | Live, 2 min per game |
| Who with | Everyone, one public wall | Strangers via queue, or one invite link |
| Transport | Plain request/response | Realtime (server push) per game |
| Needs | Identity, calendar, quotes, ballots | Same + matchmaking + a live game state |
| Ship target | Before play-ins, Oct 15 | Before Swiss, Oct 23 |

## Stack

TanStack Start serves the app and mounts oRPC on a server route; oRPC v2 is the typed contract between client and server; Effect owns everything behind a handler. Three things to know before the first commit: oRPC v2 is still in beta, its Effect package is `@orpc/experimental-effect@beta`, and the examples in its docs already use the Effect v4 API (`Context.Service`), which matches the v4 choice.

| Layer | Choice | Role | Notes |
| --- | --- | --- | --- |
| Framework | TanStack Start (React) + TanStack Router | SSR, file routes, public day/stage/hall-of-fame pages, server route for the API | Mount `RPCHandler` on `createFileRoute('/api/rpc/$')` with an `ANY` server handler — [adapter doc](https://orpc.dev/docs/adapters/tanstack-start) |
| API | oRPC v2 (beta) | Contract-first procedures, typed errors, SSE via AsyncIteratorObject | `createIsomorphicFn` for the link (browser vs SSR); server-side client during SSR to skip HTTP |
| Effect bridge | `@orpc/experimental-effect@beta` | `handlerGen` / `base.effect(function* …)`, `middlewareGen`, `WithEffectContext` for services, `createEffectClient` | Services reach handlers through `context['effect/context']`; `effect/wrap` provides `Layer`s and tracing once per request — [integration doc](https://orpc.dev/docs/integrations/effect) |
| Validation | Effect `Schema` | `.input` / `.output` on procedures via the `extensions/input-output` import | One schema per entity, reused by DB mapping and the UI |
| Data | SQLite (libSQL/Turso) + `@effect/sql` | Identities, calendar, quotes, ballots, votes, game results | One file, no ops; swap to Postgres only if traffic surprises |
| Realtime | oRPC SSE procedure backed by Effect `PubSub` | One event stream per game (lobby, round, results) and one for the matchmaking queue | Server push only; player actions stay regular procedures |
| Identity | Signed guest cookie (oRPC `Signing` + `Cookie` helpers) | Nickname + opaque id, created on first submit/vote/play; one vote per identity per ballot | No sign-up on day one; Better Auth magic link is a later add-on to keep an identity across devices |
| Scheduling | Effect `Schedule` / `Cron` | Open and close daily, stage and tournament ballots; refresh leaderboards | One long-lived fiber started with the server |
| Client data | TanStack Query + oRPC Query integration | Caching, optimistic votes, SSE subscription hooks |  |
| Hosting | A single Node process (Fly.io or Railway) | SSE and the matchmaking queue need one long-lived process, so no serverless edge |  |

**Boundary rule:** React components call oRPC procedures and nothing else. oRPC handlers are thin: validate, resolve the user, `yield*` a service. All logic lives in Effect services, which never import oRPC. That makes the arcade engine and the quote ranking testable with `Effect.runPromise` and `TestClock`, no HTTP involved.

## Architecture

&#91;embedded content: runtime architecture · browser, oRPC layer, Effect services, SQLite\]

Requests enter through one TanStack Start server route; identity middleware reads or mints the signed guest cookie; procedures validate with Effect Schema and `yield*` a service from `effect/context`. The `Matchmaker` forms games from a queue and the `GameEngine` runs each game, publishing events through a `PubSub` that an SSE procedure streams back to every player in that game. A scheduler fiber opens and closes ballots on the calendar.

**Request lifecycle (per call)**

1. `effect/wrap` provides the app `Layer` (DB, services, tracing) once per request
2. `middlewareGen` verifies the guest cookie and adds `CurrentIdentity` to the Effect context; a first visit with no cookie gets one minted after the nickname step
3. The procedure handler calls the service; typed domain errors (`BallotClosed`, `AlreadyVoted`, `GameNotJoinable`, `NotLobbyHost`) are mapped to oRPC errors in one place

**Matchmaking and game lifecycle (in `Matchmaker` + `GameEngine`)**

Queue: `Play` enqueues the identity; a forked fiber forms a game when 2–8 are waiting or 10 s after the first arrival (solo mode if still alone). Invite: a lobby with a link; the host's `Start` skips the queue. Game: `lobby → round(n) → scoring(n) → round(n+1)… → ended`, one `Ref` per game, the round timer a forked fiber interrupted when the last answer lands. Every transition publishes an event. Both services are pure Effect, so queue timing and round timers run under `TestClock` in tests with no server.

## Data model

Nine tables, all small; every entity is an Effect `Schema.Class` so the DB row, the oRPC output and the UI type are one definition. Live game state (queue, lobby, current round, answers in flight) stays in memory in a `Ref` per game; only finished games are persisted.

| Entity | Key fields | Owner module | Notes |
| --- | --- | --- | --- |
| `Identity` | id, nickname, createdAt, isAdmin | Core | Minted with the guest cookie; the cookie carries the signed id only |
| `Stage` | id (playins / swiss / quarters / semis / final), name, startsOn, endsOn | Core | Five rows, entered once |
| `TournamentDay` | date (PK), stageId, label ("Swiss day 3") | Core | The wall's unit of organisation |
| `Match` | id, date, label ("T1 vs G2"), order | Core | Entered by the admin; no external ids |
| `Quote` | id, date, matchId?, text, saidBy?, teamTag?, authorIdentityId, createdAt, hiddenAt? | Wall | Soft hide; `saidBy` is free text |
| `Ballot` | id, scope (day / stage / tournament), scopeKey (date, stageId or 'worlds'), opensAt, closesAt, winnerQuoteId? | Wall | Day ballots are implicit (all quotes of the day); stage and tournament ballots list candidates |
| `BallotCandidate` | ballotId, quoteId, seededFrom (day winner / runner-up / stage winner) | Wall | Only for stage and tournament ballots |
| `Vote` | ballotId, identityId, quoteId, createdAt | Wall | Composite primary key (ballotId, identityId) = one vote per ballot |
| `Game` | id, mode (public / invite / solo), startedAt, endedAt | Arcade | One per finished game |
| `GameResult` | gameId, identityId, score, answered, correct | Arcade | Written once at game end; leaderboards aggregate this |

**Derived, never stored:** live tallies, leaderboards (today / stage / tournament) and the quiz question bank — all computed from `Vote`, `GameResult` and `Quote` in `BallotService` and `QuoteService`. A quiz question is `{ quoteId, kind: 'who' | 'match' | 'finish', options }`, generated at round start from the last three days of quotes, weighted by votes received.

## Timeline

&#91;embedded content: build timeline against Worlds 2026 stages · Oct 9 – Nov 14\]

Six days for the wall, one week for the arcade, then the tournament carries the content. The budget is \~3–5 h per week in normal weeks; the two build lanes assume a couple of longer evenings each. Stage dates come from Riot's published schedule ([Insider Gaming](https://insider-gaming.com/lol-worlds-2026-start-times-and-full-schedule-revealed/), [rdy.gg](https://rdy.gg/en/lol/news/league-of-legends-lol-worlds-2026-details)).

**Lane 1 — Quote Wall (Oct 9 – 14)**

- [ ] Scaffold TanStack Start + oRPC v2 + `@orpc/experimental-effect`, mount the server route, pin versions
- [ ] Effect `Layer` stack: Config, SQLite, `QuoteService`, `BallotService`; migrations; seed the five stages and the calendar
- [ ] Guest identity: nickname step, signed cookie, `middlewareGen` identity middleware, submit rate limit
- [ ] Procedures: quote submit/list/hide, vote, ballot read; admin match entry
- [ ] Scheduler fiber: open/close day ballots at the calendar's times (stage and tournament ballots can wait until Oct 18)
- [ ] Pages: today's wall + submit form, `/day/:date`, `/stage/:stage`, `/hall-of-fame`
- [ ] Deploy, share the link, submit the first quotes yourself on play-in day 1

**Lane 2 — Pause Arcade (Oct 15 – 22)**

- [ ] `GameEngine` state machine with `Ref` + forked timer fibers, tested under `TestClock`
- [ ] `Matchmaker`: queue, 2–8 player grouping, 10 s fallback, solo mode, invite lobbies
- [ ] Per-game `PubSub` + SSE procedure; client subscription hook; reconnect on a dropped stream
- [ ] Quiz generator from the wall (who / match / finish), answer scoring
- [ ] Screens: Play button, queue wait, lobby, round, game scoreboard, leaderboards
- [ ] Persist `Game` + `GameResult` at game end
- [ ] Dry run: two phones on a play-in VOD, then one stranger via the public queue, before Swiss day 1

**After Oct 23:** only fixes and, if a quiet day appears, a second mini-game. The "Worlds in 25 quotes" page is the deliverable for the final on Nov 14.

## Risks & open questions

The biggest risk is not technical: it is the arcade eating the whole budget before the wall exists. The order in the timeline is the mitigation.

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| oRPC v2 beta + experimental Effect package + Effect v4 RC: three moving targets at once | High | Pin exact versions on day one; keep oRPC handlers thin so a breaking change touches one folder; v1 oRPC is the fallback |
| Empty queue: nobody else is playing at that moment, so quick play feels dead | High | 10 s fallback into solo mode against the day's median score; show "N playing now" only when it is > 0 |
| Public submissions bring spam or abuse | Medium | Rate limit per identity, admin hide, a blocklist of words; no images, text only |
| Vote stuffing with fresh guest cookies | Medium | One vote per identity and a per-IP cap per ballot; counts stay hidden until the ballot closes, which removes most of the motive |
| SSE through the TanStack Start dev server or a proxy buffers or drops the stream | Medium | Test the SSE route in the first arcade session; fallback = client polling every 2 s during a game |
| Live game state lives in memory, so a redeploy kills running games | Medium | Accept for v0 (a game lasts 2 min); deploy between match days |
| Wrong ballot times (late games end after midnight Paris) | Low | Day ballots close at noon the next day; stage ballots are opened by the admin, not by the clock |

**Open questions**

- [ ] Name of the app and the public domain
- [ ] Stage ballot candidates: daily winners only, or winners + runners-up (more choice, longer ballot)?
- [ ] Should stage and tournament ballots be open to everyone, or only to identities that voted during that stage?
- [ ] Quick play group size: cap at 8, or let big games happen during the final?
- [ ] Round length: 20 s fixed, or shorter for "finish the quote"?
- [ ] Does solo mode count on the leaderboards, or only multiplayer games?
