import { PgClient } from "@effect/sql-pg"
import * as PgDrizzle from "drizzle-orm/effect-postgres"
import { Config, Context, Layer, type Effect } from "effect"

export type Database = Effect.Success<ReturnType<typeof PgDrizzle.makeWithDefaults>>

/** The Drizzle database, reached through Drizzle's Effect integration (ADR-0004). */
export class Db extends Context.Service<Db, Database>()("allchat/Db") {
  static readonly layer = Layer.effect(Db, PgDrizzle.makeWithDefaults()).pipe(
    Layer.provide(PgClient.layerConfig({ url: Config.Redacted("DATABASE_URL") }))
  )
}
