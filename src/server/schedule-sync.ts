import { sql } from "drizzle-orm"
import { Config, Context, Data, Duration, Effect, Layer } from "effect"
import { match } from "../db/schema.ts"
import { Db } from "./db.ts"
import { LolEsports, type ScheduleEvent, type Tournament } from "./lolesports.ts"

const idlePoll = Duration.minutes(5)
const livePoll = Duration.minutes(1)
const day = 86_400_000

export class UnknownTournament extends Data.TaggedError("UnknownTournament")<{ readonly slug: string }> {}

// Schedule events carry no tournament id, so a tournament is its league's events between its dates.
// One day of slack on each side covers leagues whose local start date is a UTC day ahead.
const windowOf = (t: Tournament) => ({
  start: Date.parse(`${t.startDate}T00:00:00Z`) - day,
  end: Date.parse(`${t.endDate}T00:00:00Z`) + 2 * day
})

const toRow = (tournamentSlug: string, e: ScheduleEvent, syncedAt: Date) => {
  const [t1, t2] = e.match!.teams
  return {
    esportsId: e.match!.id,
    tournamentSlug,
    startsAt: new Date(e.startTime),
    state: e.state,
    stageName: e.blockName ?? "unknown",
    bestOf: e.match!.strategy.count,
    team1Code: t1?.code ?? "TBD",
    team1Name: t1?.name ?? "TBD",
    team1Wins: t1?.result?.gameWins ?? 0,
    team2Code: t2?.code ?? "TBD",
    team2Name: t2?.name ?? "TBD",
    team2Wins: t2?.result?.gameWins ?? 0,
    syncedAt
  }
}

const excluded = (column: string) => sql.raw(`excluded."${column}"`)

/**
 * Mirrors the schedule of the tournaments named in `LOL_TOURNAMENTS` (lolesports slugs, comma-separated,
 * e.g. `worlds_2026`) into the `match` table; the `stage` and `tournament_day` views follow.
 */
export class ScheduleSync extends Context.Service<
  ScheduleSync,
  {
    /** One pass over every configured tournament; returns the number of matches upserted and whether one is live. */
    readonly syncOnce: Effect.Effect<{ readonly upserted: number; readonly live: boolean }, unknown>
  }
>()("allchat/ScheduleSync") {
  static readonly layer = Layer.effect(
    ScheduleSync,
    Effect.gen(function* () {
      const db = yield* Db
      const api = yield* LolEsports
      const slugs = (yield* Config.String("LOL_TOURNAMENTS"))
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)

      // The default page sits around now; walk older pages back to the window start, newer ones to its end.
      const fetchEvents = (t: Tournament) =>
        Effect.gen(function* () {
          const { start, end } = windowOf(t)
          const first = yield* api.getSchedule(t.leagueId)
          const events = [...first.events]
          let older = first.pages.older
          while (older && Date.parse(events[0]?.startTime ?? "") >= start) {
            const page = yield* api.getSchedule(t.leagueId, older)
            events.unshift(...page.events)
            older = page.pages.older
          }
          let newer = first.pages.newer
          while (newer && Date.parse(events.at(-1)?.startTime ?? "") < end) {
            const page = yield* api.getSchedule(t.leagueId, newer)
            events.push(...page.events)
            newer = page.pages.newer
          }
          return events.filter((e) => {
            const at = Date.parse(e.startTime)
            return e.type === "match" && e.match !== undefined && at >= start && at < end
          })
        })

      const syncOnce = Effect.gen(function* () {
        const syncedAt = new Date()
        const rows = []
        for (const slug of slugs) {
          const tournament = yield* api.findTournament(slug)
          if (!tournament) return yield* new UnknownTournament({ slug })
          for (const e of yield* fetchEvents(tournament)) rows.push(toRow(slug, e, syncedAt))
        }
        const unique = [...new Map(rows.map((r) => [r.esportsId, r])).values()]
        if (unique.length > 0) {
          yield* db
            .insert(match)
            .values(unique)
            .onConflictDoUpdate({
              target: match.esportsId,
              set: {
                tournamentSlug: excluded("tournament_slug"),
                startsAt: excluded("starts_at"),
                state: excluded("state"),
                stageName: excluded("stage_name"),
                bestOf: excluded("best_of"),
                team1Code: excluded("team1_code"),
                team1Name: excluded("team1_name"),
                team1Wins: excluded("team1_wins"),
                team2Code: excluded("team2_code"),
                team2Name: excluded("team2_name"),
                team2Wins: excluded("team2_wins"),
                syncedAt: excluded("synced_at")
              }
            })
        }
        const soon = Date.now() + Duration.toMillis(idlePoll)
        const live = unique.some(
          (r) => r.state === "inProgress" || (r.state === "unstarted" && r.startsAt.getTime() <= soon)
        )
        return { upserted: unique.length, live }
      })

      return { syncOnce }
    })
  )

  /**
   * The polling fiber: every 5 minutes, every minute while a match is live or about to start.
   * A failed pass is logged and retried at the next tick; the last synced rows stay in place.
   */
  static readonly poller = Layer.effectDiscard(
    Effect.gen(function* () {
      const sync = yield* ScheduleSync
      const tick = sync.syncOnce.pipe(
        Effect.tap(({ upserted, live }) => Effect.logInfo(`schedule sync: ${upserted} matches, live=${live}`)),
        Effect.map(({ live }) => (live ? livePoll : idlePoll)),
        Effect.catchCause((cause) => Effect.logError("schedule sync failed", cause).pipe(Effect.as(idlePoll)))
      )
      yield* Effect.forkScoped(Effect.forever(Effect.flatMap(tick, (wait) => Effect.sleep(wait))))
    })
  )
}
