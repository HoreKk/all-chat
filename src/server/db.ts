import { PgClient } from "@effect/sql-pg"
import * as PgDrizzle from "drizzle-orm/effect-postgres"
import { Config, Context, Layer, type Effect } from "effect"
import { relations } from "../db/relations.ts"

const makeDatabase = PgDrizzle.makeWithDefaults({ relations })

export type Database = Effect.Success<typeof makeDatabase>

/** The Drizzle database, reached through Drizzle's Effect integration (ADR-0004). */
export class Db extends Context.Service<Db, Database>()("allchat/Db") {
  static readonly layer = Layer.effect(Db, makeDatabase).pipe(
    Layer.provide(PgClient.layerConfig({ url: Config.Redacted("DATABASE_URL") }))
  )
}
