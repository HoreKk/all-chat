import { sql } from "drizzle-orm"
import { Context, Duration, Effect, Layer } from "effect"
import { match, stage, tournamentDay } from "../db/schema.ts"
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

export const stageSlug = (blockName: string) =>
  blockName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

// Same rule as the generated `match.day` column: the Paris date of the start minus 12 hours.
const parisDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" })
export const tournamentDayOf = (startsAt: Date) => parisDate.format(new Date(startsAt.getTime() - 12 * 3_600_000))

const toRow = (e: ScheduleEvent, syncedAt: Date) => {
  const [t1, t2] = e.match!.teams
  return {
    esportsId: e.match!.id,
    startsAt: new Date(e.startTime),
    state: e.state,
    stageId: stageSlug(e.blockName ?? "unknown"),
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
 * Stages and tournament days derived from matches sorted by start time: a stage per block name,
 * positioned by its first match; a day per distinct tournament day, in the stage of its first match.
 */
export const deriveCalendar = (events: ReadonlyArray<ScheduleEvent>) => {
  const sorted = [...events].sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime))
  const stages = new Map<string, { id: string; name: string; position: number; startsOn: string; endsOn: string }>()
  const days = new Map<string, { date: string; stageId: string }>()
  for (const e of sorted) {
    const name = e.blockName ?? "unknown"
    const id = stageSlug(name)
    const day = tournamentDayOf(new Date(e.startTime))
    const existing = stages.get(id)
    if (existing) existing.endsOn = day
    else stages.set(id, { id, name, position: stages.size + 1, startsOn: day, endsOn: day })
    if (!days.has(day)) days.set(day, { date: day, stageId: id })
  }
  const dayRows = [...days.values()].map((d) => {
    const sameStage = [...days.values()].filter((x) => x.stageId === d.stageId)
    const name = stages.get(d.stageId)!.name
    return { ...d, label: sameStage.length === 1 ? name : `${name} day ${sameStage.indexOf(d) + 1}` }
  })
  return { stages: [...stages.values()], days: dayRows }
}

/** Mirrors the Worlds schedule from lolesports into the `stage`, `tournament_day` and `match` tables. */
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
          const calendar = deriveCalendar(events)
          yield* db
            .insert(stage)
            .values(calendar.stages)
            .onConflictDoUpdate({
              target: stage.id,
              set: {
                name: excluded("name"),
                position: excluded("position"),
                startsOn: excluded("starts_on"),
                endsOn: excluded("ends_on")
              }
            })
          yield* db
            .insert(tournamentDay)
            .values(calendar.days)
            .onConflictDoUpdate({
              target: tournamentDay.date,
              set: { stageId: excluded("stage_id"), label: excluded("label") }
            })
          yield* db
            .insert(match)
            .values(rows)
            .onConflictDoUpdate({
              target: match.esportsId,
              set: {
                startsAt: excluded("starts_at"),
                state: excluded("state"),
                stageId: excluded("stage_id"),
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
