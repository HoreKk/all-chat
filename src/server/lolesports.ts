import { Config, Context, Data, Effect, Layer, Redacted, Schema } from "effect"

// The lolesports persisted gateway: unofficial and undocumented, but it is what
// lolesports.com itself reads. Only schedule data is used (ADR-0005); live game data stays out of scope.
const gateway = "https://esports-api.lolesports.com/persisted/gw"

const Team = Schema.Struct({
  name: Schema.String,
  code: Schema.String,
  result: Schema.NullOr(Schema.Struct({ gameWins: Schema.Number }))
})

export const ScheduleEvent = Schema.Struct({
  startTime: Schema.String,
  state: Schema.Literals(["unstarted", "inProgress", "completed"]),
  type: Schema.String,
  blockName: Schema.optional(Schema.NullOr(Schema.String)),
  match: Schema.optional(
    Schema.Struct({
      id: Schema.String,
      teams: Schema.Array(Team),
      strategy: Schema.Struct({ count: Schema.Number })
    })
  )
})
export type ScheduleEvent = typeof ScheduleEvent.Type

const SchedulePage = Schema.Struct({
  data: Schema.Struct({
    schedule: Schema.Struct({
      pages: Schema.Struct({ older: Schema.NullOr(Schema.String), newer: Schema.NullOr(Schema.String) }),
      events: Schema.Array(ScheduleEvent)
    })
  })
})
export type SchedulePage = typeof SchedulePage.Type

const LeaguesPage = Schema.Struct({
  data: Schema.Struct({ leagues: Schema.Array(Schema.Struct({ id: Schema.String, slug: Schema.String })) })
})

const TournamentsPage = Schema.Struct({
  data: Schema.Struct({
    leagues: Schema.Array(
      Schema.Struct({
        tournaments: Schema.Array(
          Schema.Struct({ id: Schema.String, slug: Schema.String, startDate: Schema.String, endDate: Schema.String })
        )
      })
    )
  })
})

/** A lolesports tournament, e.g. `worlds_2026`; its dates are calendar dates as lolesports publishes them. */
export interface Tournament {
  readonly id: string
  readonly slug: string
  readonly leagueId: string
  readonly startDate: string
  readonly endDate: string
}

export class LolEsportsError extends Data.TaggedError("LolEsportsError")<{ readonly cause: unknown }> {}

export class LolEsports extends Context.Service<
  LolEsports,
  {
    /** Finds a tournament by slug, e.g. `worlds_2026`; `undefined` if no league has it. */
    readonly findTournament: (slug: string) => Effect.Effect<Tournament | undefined, LolEsportsError>
    readonly getSchedule: (
      leagueId: string,
      pageToken?: string
    ) => Effect.Effect<SchedulePage["data"]["schedule"], LolEsportsError>
  }
>()("allchat/LolEsports") {
  static readonly layer = Layer.effect(
    LolEsports,
    Effect.gen(function* () {
      const apiKey = yield* Config.Redacted("LOL_API_KEY")

      const get = <S extends Schema.Top>(path: string, params: Record<string, string | undefined>, schema: S) =>
        Effect.tryPromise({
          try: async (signal) => {
            const url = new URL(`${gateway}/${path}`)
            url.searchParams.set("hl", "en-US")
            for (const [key, value] of Object.entries(params)) if (value) url.searchParams.set(key, value)
            const res = await fetch(url, { headers: { "x-api-key": Redacted.value(apiKey) }, signal })
            if (!res.ok) throw new Error(`${path} ${res.status}`)
            return (await res.json()) as unknown
          },
          catch: (cause) => new LolEsportsError({ cause })
        }).pipe(
          Effect.flatMap((json) =>
            Schema.decodeUnknownEffect(schema)(json).pipe(Effect.mapError((cause) => new LolEsportsError({ cause })))
          )
        )

      // Tournaments listed without a leagueId carry no league id, so the lookup goes league by league:
      // first the leagues whose slug prefixes the tournament slug (`worlds` for `worlds_2026`), then the rest.
      const findTournament = (slug: string) =>
        Effect.gen(function* () {
          const leagues = (yield* get("getLeagues", {}, LeaguesPage)).data.leagues
          const likely = leagues.filter((l) => slug.startsWith(`${l.slug}_`))
          for (const league of [...likely, ...leagues.filter((l) => !likely.includes(l))]) {
            const page = yield* get("getTournamentsForLeague", { leagueId: league.id }, TournamentsPage)
            const found = page.data.leagues.flatMap((l) => l.tournaments).find((t) => t.slug === slug)
            if (found) return { ...found, leagueId: league.id }
          }
          return undefined
        })

      const getSchedule = (leagueId: string, pageToken?: string) =>
        get("getSchedule", { leagueId, pageToken }, SchedulePage).pipe(Effect.map((page) => page.data.schedule))

      return { findTournament, getSchedule }
    })
  )
}
