import { Layer } from "effect"
import { Calendar } from "./calendar.ts"
import { Db } from "./db.ts"
import { LolEsports } from "./lolesports.ts"
import { ScheduleSync } from "./schedule-sync.ts"

/** Every service, without the background fibers: what scripts (the seed) run against. */
export const ServicesLayer = Layer.mergeAll(Calendar.layer, ScheduleSync.layer).pipe(
  Layer.provideMerge(Layer.mergeAll(Db.layer, LolEsports.layer))
)

/** The app: services plus the schedule polling fiber. */
export const AppLayer = ScheduleSync.poller.pipe(Layer.provideMerge(ServicesLayer))
