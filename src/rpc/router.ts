import { CalendarOverview } from "@/db/entities.ts"
import { Calendar } from "@/server/calendar.ts"
import { base } from "./base.ts"

export const router = {
  calendar: {
    overview: base.output(CalendarOverview).effect(function* () {
      const calendar = yield* Calendar
      return yield* calendar.overview
    })
  }
}

export type Router = typeof router
