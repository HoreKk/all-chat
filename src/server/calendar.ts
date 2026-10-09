import { asc, desc, eq, inArray } from "drizzle-orm"
import { Context, Effect, Layer } from "effect"
import { match, stage, tournamentDay } from "../db/schema.ts"
import { Db } from "./db.ts"

type Match = typeof match.$inferSelect
type Stage = typeof stage.$inferSelect

export interface CalendarOverview {
  /** The match on now, or else the next one to start. Null once the Final is over or before any sync. */
  readonly nextMatch: (Match & { readonly dayLabel: string | null }) | null
  readonly stages: ReadonlyArray<Stage>
}

export class Calendar extends Context.Service<
  Calendar,
  { readonly overview: Effect.Effect<CalendarOverview, unknown> }
>()("allchat/Calendar") {
  static readonly layer = Layer.effect(
    Calendar,
    Effect.gen(function* () {
      const db = yield* Db

      const overview = Effect.gen(function* () {
        const stages = yield* db.select().from(stage).orderBy(asc(stage.position))
        // The lolesports state is authoritative: a delayed match is still "next" after its planned start.
        const [next] = yield* db
          .select({ match, dayLabel: tournamentDay.label })
          .from(match)
          .leftJoin(tournamentDay, eq(tournamentDay.date, match.day))
          .where(inArray(match.state, ["inProgress", "unstarted"]))
          // enum order is unstarted < inProgress, so desc puts a live match first
          .orderBy(desc(match.state), asc(match.startsAt))
          .limit(1)
        return {
          stages,
          nextMatch: next ? { ...next.match, dayLabel: next.dayLabel } : null
        }
      })

      return { overview }
    })
  )
}
