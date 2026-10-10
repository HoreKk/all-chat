import { defineRelations } from "drizzle-orm"
import { match, stage, tournamentDay } from "./schema.ts"

// Stages and tournament days are views over `match`, so these joins carry no foreign keys.
// Both are keyed by tournament: a match's day is (tournament_slug, day), its stage (tournament_slug, stage_id).
export const relations = defineRelations({ match, stage, tournamentDay }, (r) => ({
  match: {
    tournamentDay: r.one.tournamentDay({
      from: [r.match.tournamentSlug, r.match.day],
      to: [r.tournamentDay.tournamentSlug, r.tournamentDay.date],
      optional: false
    }),
    stage: r.one.stage({
      from: [r.match.tournamentSlug, r.match.stageId],
      to: [r.stage.tournamentSlug, r.stage.id],
      optional: false
    })
  },
  tournamentDay: {
    stage: r.one.stage({
      from: [r.tournamentDay.tournamentSlug, r.tournamentDay.stageId],
      to: [r.stage.tournamentSlug, r.stage.id],
      optional: false
    }),
    matches: r.many.match({
      from: [r.tournamentDay.tournamentSlug, r.tournamentDay.date],
      to: [r.match.tournamentSlug, r.match.day]
    })
  },
  stage: {
    tournamentDays: r.many.tournamentDay({
      from: [r.stage.tournamentSlug, r.stage.id],
      to: [r.tournamentDay.tournamentSlug, r.tournamentDay.stageId]
    }),
    matches: r.many.match({
      from: [r.stage.tournamentSlug, r.stage.id],
      to: [r.match.tournamentSlug, r.match.stageId]
    })
  }
}))
