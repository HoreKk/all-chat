import { Card, Container, Heading, HStack, List, Text } from "@chakra-ui/react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import type { ReactNode } from "react"
import { client, orpc } from "@/rpc/client.ts"

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
    <Container as="main" maxW="40rem" px="4" pt="10" pb="16">
      <header>
        <Heading as="h1" size="3xl" letterSpacing="tight">
          All Chat
        </Heading>
        <Text mt="1" color="fg.muted">
          Worlds 2026 · Oct 15 – Nov 14
        </Text>
      </header>

      <section aria-labelledby="next-match">
        <SectionHeading id="next-match">{nextMatch?.state === "inProgress" ? "Live now" : "Next match"}</SectionHeading>
        {nextMatch ? (
          <Card.Root as="article" bg="bg.panel" rounded="xl">
            <Card.Body p="5">
              <Text color="fg.muted" textStyle="sm">
                {nextMatch.dayLabel ?? nextMatch.day} · {paris.format(nextMatch.startsAt)} Paris
              </Text>
              <HStack justify="center" align="baseline" gap="4" my="4" fontSize="2rem" fontWeight="bold">
                <span title={nextMatch.team1Name}>{nextMatch.team1Code}</span>
                {nextMatch.state === "inProgress" ? (
                  <Text as="span" color="accent" fontVariantNumeric="tabular-nums">
                    {nextMatch.team1Wins} – {nextMatch.team2Wins}
                  </Text>
                ) : (
                  <Text as="span" textStyle="md" fontWeight="normal" color="fg.muted">
                    vs
                  </Text>
                )}
                <span title={nextMatch.team2Name}>{nextMatch.team2Code}</span>
              </HStack>
              <Text color="fg.muted" textStyle="sm">
                Best of {nextMatch.bestOf}
              </Text>
            </Card.Body>
          </Card.Root>
        ) : (
          <Text>No upcoming match.</Text>
        )}
      </section>

      <section aria-labelledby="stages">
        <SectionHeading id="stages">Stages</SectionHeading>
        <List.Root as="ol" listStyle="none" borderTopWidth="1px">
          {stages.map((s) => {
            const current = s.id === nextMatch?.stageId
            return (
              <List.Item
                key={s.id}
                aria-current={current ? "step" : undefined}
                display="flex"
                justifyContent="space-between"
                gap="4"
                py="3"
                borderBottomWidth="1px"
              >
                <Text as="span" color={current ? "accent" : undefined} fontWeight={current ? "semibold" : undefined}>
                  {s.name}
                </Text>
                <Text as="span" color="fg.muted" fontVariantNumeric="tabular-nums">
                  {s.startsOn === s.endsOn ? formatDay(s.startsOn) : `${formatDay(s.startsOn)} – ${formatDay(s.endsOn)}`}
                </Text>
              </List.Item>
            )
          })}
        </List.Root>
      </section>
    </Container>
  )
}

function SectionHeading({ id, children }: { id: string; children: ReactNode }) {
  return (
    <Heading id={id} as="h2" textStyle="xs" textTransform="uppercase" letterSpacing="wider" color="fg.muted" mt="10" mb="3">
      {children}
    </Heading>
  )
}
