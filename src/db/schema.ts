import { sql } from "drizzle-orm"
import { date, index, integer, pgEnum, pgTable, pgView, smallint, text, timestamp } from "drizzle-orm/pg-core"

export const matchState = pgEnum("match_state", ["unstarted", "inProgress", "completed"])

/**
 * A match as the lolesports schedule reports it, upserted by the schedule sync on `esportsId`.
 * Opponents still to be decided carry the team code "TBD". It is the only stored calendar table:
 * stages and tournament days are views over it (ADR-0005).
 */
export const match = pgTable(
  "match",
  {
    esportsId: text("esports_id").primaryKey(),
    // The lolesports tournament slug, e.g. "worlds_2026" (LOL_TOURNAMENTS lists which are synced)
    tournamentSlug: text("tournament_slug").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true, mode: "date" }).notNull(),
    // A match belongs to the tournament day of its Paris start time minus 12 hours,
    // so a 01:30 knockout match stays on the day that started at 23:00.
    day: date("day", { mode: "string" })
      .notNull()
      .generatedAlwaysAs(sql`((starts_at at time zone 'Europe/Paris') - interval '12 hours')::date`),
    state: matchState("state").notNull(),
    // The lolesports block name: Play-Ins, Swiss, Quarterfinals, Semifinals, Finals
    stageName: text("stage_name").notNull(),
    // Slug of the block name, e.g. "play-ins"
    stageId: text("stage_id")
      .notNull()
      .generatedAlwaysAs(sql`trim(both '-' from lower(regexp_replace(stage_name, '[^A-Za-z0-9]+', '-', 'g')))`),
    bestOf: smallint("best_of").notNull(),
    team1Code: text("team1_code").notNull(),
    team1Name: text("team1_name").notNull(),
    team1Wins: smallint("team1_wins").notNull().default(0),
    team2Code: text("team2_code").notNull(),
    team2Name: text("team2_name").notNull(),
    team2Wins: smallint("team2_wins").notNull().default(0),
    syncedAt: timestamp("synced_at", { withTimezone: true, mode: "date" }).notNull()
  },
  (t) => [index("match_starts_at_idx").on(t.startsAt), index("match_tournament_day_idx").on(t.tournamentSlug, t.day)]
)

/** One stage per tournament and schedule block, positioned by its first match within the tournament. */
export const stage = pgView("stage", {
  tournamentSlug: text("tournament_slug").notNull(),
  id: text("id").notNull(),
  name: text("name").notNull(),
  position: integer("position").notNull(),
  startsOn: date("starts_on", { mode: "string" }).notNull(),
  endsOn: date("ends_on", { mode: "string" }).notNull()
}).as(sql`
  select tournament_slug, stage_id as id, min(stage_name) as name,
    (row_number() over (partition by tournament_slug order by min(starts_at)))::int as position,
    min(day) as starts_on, max(day) as ends_on
  from ${match}
  group by tournament_slug, stage_id
`)

/** One tournament day per tournament and date holding matches, in the stage of its first match ("Swiss day 3"). */
export const tournamentDay = pgView("tournament_day", {
  tournamentSlug: text("tournament_slug").notNull(),
  date: date("date", { mode: "string" }).notNull(),
  stageId: text("stage_id").notNull(),
  label: text("label").notNull()
}).as(sql`
  select tournament_slug, day as date, stage_id,
    case when count(*) over (partition by tournament_slug, stage_id) = 1 then stage_name
      else stage_name || ' day ' || row_number() over (partition by tournament_slug, stage_id order by day)
    end as label
  from (
    select distinct on (tournament_slug, day) tournament_slug, day, stage_id, stage_name
    from ${match} order by tournament_slug, day, starts_at
  ) as first_match
`)

export type MatchState = (typeof matchState.enumValues)[number]
