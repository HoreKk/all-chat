// Bootstraps a fresh database with one schedule sync: stages, tournament days and matches, all
// derived from the lolesports schedule. The sync is an idempotent upsert, so rerunning is safe.
// Later changes come from the polling fiber; anything wrong is fixed by hand in Drizzle Studio (`pnpm db:studio`).
//
//   pnpm db:seed            everything (today: the calendar scope)
//   pnpm db:seed:calendar   the calendar scope only: stages, tournament days, matches
//   ... --reset             empty the tables first (drizzle-seed `reset`), local databases only
import { drizzle } from "drizzle-orm/node-postgres"
import { reset } from "drizzle-seed"
import { Effect } from "effect"
import * as schema from "../src/db/schema.ts"
import { ServicesLayer } from "../src/server/layers.ts"
import { ScheduleSync } from "../src/server/schedule-sync.ts"

const args = process.argv.slice(2)
const scopes = new Set(args.filter((a) => !a.startsWith("--")))
const all = scopes.size === 0
const url = process.env.DATABASE_URL
if (!url) throw new Error("DATABASE_URL is not set")

if (args.includes("--reset")) {
  const host = new URL(url).hostname
  if (host !== "localhost" && host !== "127.0.0.1") throw new Error(`--reset refused on ${host}: local databases only`)
  const db = drizzle(url)
  await reset(db, schema)
  await db.$client.end()
  console.log("reset: tables emptied")
}

const calendar = Effect.gen(function* () {
  const { upserted } = yield* (yield* ScheduleSync).syncOnce
  yield* Effect.logInfo(`calendar: ${upserted} matches synced from lolesports, with their stages and tournament days`)
})

if (all || scopes.has("calendar")) {
  await Effect.runPromise(calendar.pipe(Effect.provide(ServicesLayer)))
}
