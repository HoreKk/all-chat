import { defineRelations } from "drizzle-orm"
import { match, stage, tournamentDay } from "./schema.ts"

// Stages and tournament days are views over `match`, so these joins carry no foreign keys:
// a match's day is `match.day`, its stage `match.stage_id`.
export const relations = defineRelations({ match, stage, tournamentDay }, (r) => ({
  match: {
    tournamentDay: r.one.tournamentDay({ from: r.match.day, to: r.tournamentDay.date, optional: false }),
    stage: r.one.stage({ from: r.match.stageId, to: r.stage.id, optional: false })
  },
  tournamentDay: {
    stage: r.one.stage({ from: r.tournamentDay.stageId, to: r.stage.id, optional: false }),
    matches: r.many.match({ from: r.tournamentDay.date, to: r.match.day })
  },
  stage: {
    tournamentDays: r.many.tournamentDay({ from: r.stage.id, to: r.tournamentDay.stageId }),
    matches: r.many.match({ from: r.stage.id, to: r.match.stageId })
  }
}))
