import { Config, Context, Data, Effect, Layer, Redacted, Schema } from "effect"

// The lolesports persisted gateway: unofficial and undocumented, but it is what
// lolesports.com itself reads. Only schedule data is used (map: schedule data reopened,
// live game data stays out of scope).
const gateway = "https://esports-api.lolesports.com/persisted/gw"

export const worldsLeagueId = "98767975604431411"

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

export class LolEsportsError extends Data.TaggedError("LolEsportsError")<{ readonly cause: unknown }> {}

export class LolEsports extends Context.Service<
  LolEsports,
  { readonly getSchedule: (pageToken?: string) => Effect.Effect<SchedulePage["data"]["schedule"], LolEsportsError> }
>()("allchat/LolEsports") {
  static readonly layer = Layer.effect(
    LolEsports,
    Effect.gen(function* () {
      const apiKey = yield* Config.Redacted("LOL_API_KEY")
      const decode = Schema.decodeUnknownEffect(SchedulePage)

      const getSchedule = (pageToken?: string) =>
        Effect.tryPromise({
          try: async (signal) => {
            const url = new URL(`${gateway}/getSchedule`)
            url.searchParams.set("hl", "en-US")
            url.searchParams.set("leagueId", worldsLeagueId)
            if (pageToken) url.searchParams.set("pageToken", pageToken)
            const res = await fetch(url, { headers: { "x-api-key": Redacted.value(apiKey) }, signal })
            if (!res.ok) throw new Error(`getSchedule ${res.status}`)
            return (await res.json()) as unknown
          },
          catch: (cause) => new LolEsportsError({ cause })
        }).pipe(
          Effect.flatMap((json) => decode(json).pipe(Effect.mapError((cause) => new LolEsportsError({ cause })))),
          Effect.map((page) => page.data.schedule)
        )

      return { getSchedule }
    })
  )
}
