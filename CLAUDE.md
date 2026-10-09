# All Chat

Public companion site for Worlds 2026 (Oct 15 – Nov 14, 2026). Two modules, no accounts, no rooms: the **Quote Wall**, a tournament-wide wall of quotes voted day by day and stage by stage, and **Tab Out**, a quick-play arcade for the pauses. A guest identity (nickname + signed cookie) is enough to submit, vote and play.

- Founding brief: `docs/brief.md` (vision, scope, stack, data model, timeline, risks). The brief predates the naming: "Pause Arcade" there means Tab Out.
- Glossary: `CONTEXT.md`. Use its vocabulary in code, issues and docs.
- Decisions: `docs/adr/`.
- Plan: the GitHub issue labelled `wayfinder:map` is the index of decisions and open tickets (link in `README.md`).

## Working rules

- **Boundary rule.** React components call oRPC procedures and nothing else. oRPC handlers are thin: validate, resolve the identity, `yield*` a service. All logic lives in Effect services, which never import oRPC (see ADR-0001).
- **Ship order.** Quote Wall before Oct 15, Tab Out before Oct 23. The arcade must not eat the wall's budget.
- **Moving targets.** oRPC v2 is beta, `@orpc/experimental-effect` is experimental, Effect v4 is new. Pin exact versions; keep anything touching them in one folder.

## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues, driven with the `gh` CLI; external PRs are not a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage labels are used verbatim: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` at the repo root and ADRs in `docs/adr/`. See `docs/agents/domain.md`.
