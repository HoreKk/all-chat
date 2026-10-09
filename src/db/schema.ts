import { sql } from "drizzle-orm"
import { date, index, pgEnum, pgTable, smallint, text, timestamp } from "drizzle-orm/pg-core"

// Stages and tournament days are derived from the lolesports schedule by the schedule sync:
// a stage is a `blockName` (Play-Ins, Swiss, Quarterfinals, Semifinals, Finals), a tournament day
// is a date holding matches. Rows are upserted, never deleted, so later references stay valid.
export const stage = pgTable("stage", {
  // Slug of the lolesports block name, e.g. "play-ins"
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  position: smallint("position").notNull(),
  startsOn: date("starts_on", { mode: "string" }).notNull(),
  endsOn: date("ends_on", { mode: "string" }).notNull()
})

export const tournamentDay = pgTable("tournament_day", {
  date: date("date", { mode: "string" }).primaryKey(),
  stageId: text("stage_id").notNull().references(() => stage.id),
  label: text("label").notNull()
})

export const matchState = pgEnum("match_state", ["unstarted", "inProgress", "completed"])

/**
 * A match as the lolesports schedule reports it, upserted by the schedule sync on `esportsId`.
 * Opponents still to be decided carry the team code "TBD".
 */
export const match = pgTable(
  "match",
  {
    esportsId: text("esports_id").primaryKey(),
    startsAt: timestamp("starts_at", { withTimezone: true, mode: "date" }).notNull(),
    // A match belongs to the tournament day of its Paris start time minus 12 hours,
    // so a 01:30 knockout match stays on the day that started at 23:00.
    day: date("day", { mode: "string" })
      .notNull()
      .generatedAlwaysAs(sql`((starts_at at time zone 'Europe/Paris') - interval '12 hours')::date`),
    state: matchState("state").notNull(),
    stageId: text("stage_id")
      .notNull()
      .references(() => stage.id),
    bestOf: smallint("best_of").notNull(),
    team1Code: text("team1_code").notNull(),
    team1Name: text("team1_name").notNull(),
    team1Wins: smallint("team1_wins").notNull().default(0),
    team2Code: text("team2_code").notNull(),
    team2Name: text("team2_name").notNull(),
    team2Wins: smallint("team2_wins").notNull().default(0),
    syncedAt: timestamp("synced_at", { withTimezone: true, mode: "date" }).notNull()
  },
  (t) => [index("match_starts_at_idx").on(t.startsAt), index("match_day_idx").on(t.day)]
)

export type MatchState = (typeof matchState.enumValues)[number]
