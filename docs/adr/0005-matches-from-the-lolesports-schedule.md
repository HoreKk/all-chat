---
status: accepted
---

# Matches mirrored from the lolesports schedule, no admin identity

Decided 2026-10-10 on the [Admin path ticket](https://github.com/HoreKk/all-chat/issues/8). The brief had the admin enter the calendar by hand: stages, tournament days and matches, "no live esports API", "no external ids". Swiss pairings are only known round by round, so that meant a form and an admin identity to fill it every evening. The owner reopened the esports source **for schedule data only**, having already read the same feed in another project.

## Decision

- **The whole calendar comes from the schedule**, with no constants in the repo. **Matches** come from the lolesports persisted gateway (`getSchedule`, header `x-api-key: LOL_API_KEY`) for every tournament slug listed in `LOL_TOURNAMENTS` (comma-separated, `worlds_2026` for All Chat). Each slug is resolved to its league and dates through `getLeagues` and `getTournamentsForLeague`, and the sync keeps that league's events between the tournament's dates, one day of slack each side; schedule events carry no tournament id. `match.tournament_slug` records which tournament a match belongs to. A polling fiber upserts them into `match` keyed on the lolesports match id: teams (code `TBD` until known), start time, state, best-of and game wins. It polls every 5 minutes, and every minute while a match is live or about to start. `pnpm db:seed` (or its `calendar` scope, `pnpm db:seed:calendar`) bootstraps a fresh database with one sync.
- **`match` is the only stored calendar table; `stage` and `tournament_day` are Postgres views over it**, following the map's "never store what can be derived". A stage is a schedule `blockName` (Play-Ins, Swiss, Quarterfinals, Semifinals, Finals), stored on the match as `stage_name`, with its slug `stage_id` (`play-ins`, …) as a generated column; its position and dates come from its first and last match. Both views are keyed by tournament as well: a stage is (tournament, block) and a tournament day is (tournament, date), since "Finals" recurs and two leagues can play on one date. A tournament day is a date holding matches, in the stage of its first match, labelled "Swiss day 3". Drizzle relations (`src/db/relations.ts`) join match, day and stage without foreign keys. `getStandings` was considered and rejected, because it folds the three knockout stages into one "Knockouts" stage.
- **A match's tournament day** is the Paris date of its start time minus 12 hours, a generated column, the one place this rule lives. Every first match starts between 18:00 and 23:00 Paris, so a 01:30 knockout match stays on the day that began at 23:00.
- **No admin identity in v0.** `Identity.isAdmin`, the admin claim route and every admin procedure are dropped. The developer is the admin, and Drizzle Studio (`pnpm db:studio`) against the database is the admin console: correcting a match, hiding a quote (`hiddenAt`), merging duplicates.

## Consequences

- The gateway is unofficial, undocumented and has no SLA. A failed pass is logged and retried at the next tick, and the last synced rows stay in place, so an outage freezes the schedule rather than emptying it. If the feed breaks for good, rows are edited in Studio and the poller is switched off.
- Live game data (drafts, objectives, stats, the livestats feed) stays out of scope. Only the schedule is read.
- The polling fiber is a second process singleton next to the ballot scheduler. It lives in the same `ManagedRuntime` and is covered by the same HMR guard (ADR 3), and a deploy overlap would duplicate it like the scheduler. The upsert is idempotent, so a duplicate costs only extra requests.
- `LOL_API_KEY` becomes a deployment secret. The admin secret the brief implied is gone.
- Views cannot be foreign-key targets. A later table that points at a tournament day (a quote, a day ballot) holds a plain date, checked in its service against the `tournament_day` view. If Riot moves a whole day after quotes were posted on it, those quotes sit on a date with no matches until fixed in Studio.
- Stage ids and names follow the feed: the last stage is `finals` / "Finals".
- The calendar sync is tournament-agnostic by the owner's call (checked against `msi_2026` alongside `worlds_2026`). Only the calendar: ballots, the Quote Wall and Tab Out stay scoped to Worlds 2026.
- Moderation stays what the map decided (hide, merge, rate limit, blocklist), performed by hand in Studio rather than through procedures.
