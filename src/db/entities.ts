import { createSelectSchema } from "drizzle-orm/effect-schema"
import { Schema, Struct } from "effect"
import { match, stage } from "./schema.ts"

// One definition per entity (ADR 3): the Drizzle table is the source, public views omit fields.
export const Stage = createSelectSchema(stage)
export const Match = createSelectSchema(match)

export const PublicMatch = Match.mapFields(Struct.omit(["syncedAt"]))

export const CalendarOverview = Schema.Struct({
  nextMatch: Schema.NullOr(
    Schema.Struct({
      ...PublicMatch.fields,
      dayLabel: Schema.NullOr(Schema.String)
    })
  ),
  stages: Schema.Array(Stage)
})
