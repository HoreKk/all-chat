import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { client, orpc } from "../rpc/client.ts"

export const Route = createFileRoute("/")({
  loader: () => client.calendar.overview(),
  component: Home
})

// All calendar times are shown in Paris time (map: Time).
const paris = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Paris",
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit"
})
const parisDay = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short" })
const formatDay = (date: string) => parisDay.format(new Date(`${date}T00:00:00Z`))

function Home() {
  const initialData = Route.useLoaderData()
  // Refreshes every minute, in step with the schedule sync while a match is live.
  const { data } = useQuery({ ...orpc.calendar.overview.queryOptions(), initialData, refetchInterval: 60_000 })
  const { nextMatch, stages } = data

  return (
    <main>
      <header>
        <h1>All Chat</h1>
        <p className="lede">Worlds 2026 · Oct 15 – Nov 14</p>
      </header>

      <section aria-labelledby="next-match">
        <h2 id="next-match">{nextMatch?.state === "inProgress" ? "Live now" : "Next match"}</h2>
        {nextMatch ? (
          <article className="match">
            <p className="when">
              {nextMatch.dayLabel ?? nextMatch.day} · {paris.format(nextMatch.startsAt)} Paris
            </p>
            <p className="teams">
              <span title={nextMatch.team1Name}>{nextMatch.team1Code}</span>
              {nextMatch.state === "inProgress" ? (
                <span className="score">
                  {nextMatch.team1Wins} – {nextMatch.team2Wins}
                </span>
              ) : (
                <span className="vs">vs</span>
              )}
              <span title={nextMatch.team2Name}>{nextMatch.team2Code}</span>
            </p>
            <p className="format">Best of {nextMatch.bestOf}</p>
          </article>
        ) : (
          <p>No upcoming match.</p>
        )}
      </section>

      <section aria-labelledby="stages">
        <h2 id="stages">Stages</h2>
        <ol className="stages">
          {stages.map((s) => (
            <li key={s.id} aria-current={s.id === nextMatch?.stageId ? "step" : undefined}>
              <span className="stage-name">{s.name}</span>
              <span className="stage-dates">
                {s.startsOn === s.endsOn ? formatDay(s.startsOn) : `${formatDay(s.startsOn)} – ${formatDay(s.endsOn)}`}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </main>
  )
}
