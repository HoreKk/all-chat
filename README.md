# All Chat

A public companion site for Worlds 2026 (Oct 15 – Nov 14, 2026). Two modules, no accounts, no rooms to set up:

- **Quote Wall** — submit the lines everyone just heard; vote daily, then per stage, then once for the whole tournament. Public pages for every day, every stage and the hall of fame. Ships before the play-ins (Oct 15).
- **Tab Out** — tap *Play* during a pause and you are in a two-minute quiz with whoever is around, built from the wall's quotes. Ships before the Swiss stage (Oct 23).

## Status

Map charted on 2026-10-09: 30 tickets, frontier open. The plan lives on the issue tracker as a wayfinder map: [All Chat — wayfinder map](https://github.com/HoreKk/all-chat/issues/1) indexes the decisions made so far and points at the open tickets.

## Run locally

Node 24 (`.node-version`), pnpm and Docker.

```bash
cp .env.example .env   # then fill LOL_API_KEY (LOL_TOURNAMENTS defaults to worlds_2026)
pnpm install
pnpm db:up             # Postgres 17 on localhost:5433
pnpm db:push           # apply the schema (no migrations yet)
pnpm db:seed           # first schedule sync: stages, tournament days, matches
pnpm dev               # http://localhost:3000
```

`pnpm db:studio` opens Drizzle Studio, which is also the admin console (ADR-0005). `pnpm db:seed --reset` empties a local database first.

## Documents

- [Founding brief](docs/brief.md)
- [Glossary](CONTEXT.md)
- [Decision records](docs/adr/)
- [Agent conventions](docs/agents/)
