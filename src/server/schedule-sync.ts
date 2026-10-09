import { sql } from "drizzle-orm"
import { Context, Duration, Effect, Layer } from "effect"
import { match } from "../db/schema.ts"
import { Db } from "./db.ts"
import { LolEsports, type ScheduleEvent } from "./lolesports.ts"

// Worlds 2026 only: events outside this window (earlier editions) are ignored.
const windowStart = Date.parse("2026-10-01T00:00:00Z")
const windowEnd = Date.parse("2026-11-30T00:00:00Z")

const idlePoll = Duration.minutes(5)
const livePoll = Duration.minutes(1)

const inWindow = (e: ScheduleEvent) => {
  const t = Date.parse(e.startTime)
  return t >= windowStart && t < windowEnd
}

const toRow = (e: ScheduleEvent, syncedAt: Date) => {
  const [t1, t2] = e.match!.teams
  return {
    esportsId: e.match!.id,
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

/** Mirrors the Worlds schedule from lolesports into the `match` table; the `stage` and `tournament_day` views follow. */
export class ScheduleSync extends Context.Service<
  ScheduleSync,
  {
    /** One pass over every schedule page in the Worlds window; returns the number of matches upserted and whether one is live. */
    readonly syncOnce: Effect.Effect<{ readonly upserted: number; readonly live: boolean }, unknown>
  }
>()("allchat/ScheduleSync") {
  static readonly layer = Layer.effect(
    ScheduleSync,
    Effect.gen(function* () {
      const db = yield* Db
      const api = yield* LolEsports

      // The default page sits around now; walk older pages back to the window start and newer pages to the end.
      const fetchAll = Effect.gen(function* () {
        const first = yield* api.getSchedule()
        const events = [...first.events]
        let older = first.pages.older
        while (older && Date.parse(events[0]?.startTime ?? "") >= windowStart) {
          const page = yield* api.getSchedule(older)
          events.unshift(...page.events)
          older = page.pages.older
        }
        let newer = first.pages.newer
        while (newer) {
          const page = yield* api.getSchedule(newer)
          events.push(...page.events)
          newer = page.pages.newer
        }
        return events
      })

      const syncOnce = Effect.gen(function* () {
        const events = (yield* fetchAll).filter((e) => e.type === "match" && e.match && inWindow(e))
        const syncedAt = new Date()
        const rows = [...new Map(events.map((e) => [e.match!.id, toRow(e, syncedAt)])).values()]
        if (rows.length > 0) {
          yield* db
            .insert(match)
            .values(rows)
            .onConflictDoUpdate({
              target: match.esportsId,
              set: {
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
        const live = rows.some((r) => r.state === "inProgress" || (r.state === "unstarted" && r.startsAt.getTime() <= soon))
        return { upserted: rows.length, live }
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
