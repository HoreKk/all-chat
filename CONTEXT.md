# All Chat

A public companion site for Worlds 2026: a tournament-wide Quote Wall voted day by day and stage by stage, and Tab Out, a quick-play arcade that fills the pauses when the game is not on. No accounts, no rooms, no friend groups.

## Language

### Product

**All Chat**:
The product as a whole: the public site holding the Quote Wall and Tab Out.
_Avoid_: the app, the companion, Worlds 2026 project

**Quote Wall**:
The asynchronous module: the public, tournament-wide collection of quotes and their ballots.
_Avoid_: feed, board, the wall app

**Tab Out**:
The live module: quick multiplayer games played during pauses.
_Avoid_: Pause Arcade, the arcade app, mini-games (that is a kind of game, not the module)

### Core

**Identity**:
A guest participant: a nickname plus an opaque id, minted on a person's first submit, vote or play. There is no account.
_Avoid_: user, account, member, visitor

**Admin**:
The developer, acting through Drizzle Studio on the database: corrects matches, hides quotes and merges duplicates. Not an identity; v0 has no admin flag or admin procedures (ADR-0005).
_Avoid_: moderator, owner

**Tournament**:
Worlds 2026 as a whole, Oct 15 – Nov 14, 2026; the scope of the tournament ballot.
_Avoid_: event, competition, Worlds (alone, in code)

**Stage**:
One of the five phases of the tournament: Play-Ins, Swiss, Quarterfinals, Semifinals, Finals; one lolesports schedule block each.
_Avoid_: phase, round (reserved for Tab Out), bracket

**Tournament day**:
A calendar day with matches, belonging to one stage; the Quote Wall's unit of organisation.
_Avoid_: match day, game day, day (alone, when ambiguous)

**Match**:
A scheduled series between two teams on a tournament day (e.g. "T1 vs G2"), mirrored from the lolesports schedule; its opponents read "TBD" until the bracket decides them. It belongs to the tournament day of its Paris start time minus 12 hours.
_Avoid_: game (reserved for Tab Out), series, fixture

**Calendar**:
The set of stages, tournament days and matches, all mirrored from the lolesports schedule by the schedule sync: matches as published, stages and tournament days derived from them.
_Avoid_: schedule (reserved for the lolesports feed), fixtures

**Schedule sync**:
The polling fiber that mirrors the Worlds schedule from lolesports into the calendar. Schedule data only, never live game data.
_Avoid_: scheduler (reserved for the ballot lifecycle fiber), import, scraper

### Quote Wall

**Quote**:
A line someone said during the tournament, submitted by an identity against a tournament day and optionally a match, with an optional "who said it" and team tag.
_Avoid_: post, submission, entry

**Hidden quote**:
A quote the admin has removed from the wall and from ballots without deleting it.
_Avoid_: deleted quote, banned quote

**Duplicate**:
A quote that repeats a line already on the wall; the admin merges duplicates into one quote.

**Ballot**:
A vote held over a set of candidates within a scope, open between an opening and a closing time. There are three scopes: day, stage, tournament.
_Avoid_: poll, election, contest, voting round

**Day ballot**:
The ballot over every visible quote of one tournament day, open from the day's first match until the next tournament day's first match starts. Its winner is the Quote of the day.

**Stage ballot**:
The ballot over a stage's daily winners (and possibly runners-up), open once the stage ends and closing when the next stage's first match starts. Its winner is the Quote of the stage.

**Tournament ballot**:
The ballot over the five stage winners, open for 72 hours after the final. Its winner is the Quote of Worlds 2026.

**Candidate**:
A quote eligible on a ballot. Day ballots' candidates are implicit (every visible quote of the day); stage and tournament ballots list theirs explicitly, each with where it was seeded from.
_Avoid_: nominee, option, entry

**Vote**:
One identity's single choice on one ballot. One vote per identity per ballot.
_Avoid_: like, upvote

**Tally**:
The count of votes per candidate on a ballot, shown only once the ballot has closed.
_Avoid_: results, score (reserved for Tab Out), count

**Runner-up**:
A quote placing right behind the winner on a day ballot; a possible seed for the stage ballot.

**Quote of the day / Quote of the stage / Quote of Worlds 2026**:
The winner of a day ballot, a stage ballot, or the tournament ballot.
_Avoid_: best quote, top quote

**Hall of fame**:
The public page listing every ballot winner: each day's, each stage's, and the tournament's.
_Avoid_: winners page, results page

**Submit rate limit**:
The cap on how many quotes one identity may submit over a period.

### Tab Out

**Pause**:
A break in the broadcast, between games of a match or between matches; the moment Tab Out is for.
_Avoid_: break, downtime, intermission

**Game**:
One play session of a mini-game between players: five rounds, each with a timer, ending with a scoreboard. A game is public, invite or solo.
_Avoid_: match (reserved for the calendar), session, party

**Mini-game**:
A kind of game. The quote quiz in v0; champion-name typeracer and splash-art guess are later candidates.
_Avoid_: game mode (that is public / invite / solo)

**Round**:
One question of a game: shown, answered before the timer runs out, then scored.
_Avoid_: turn, question (reserved for the quiz question itself), stage (reserved for the tournament)

**Player**:
An identity taking part in a game.
_Avoid_: participant, member, user

**Queue**:
The matchmaking waiting line that quick-play players enter. A game forms when two to eight are waiting, or ten seconds after the first arrival.
_Avoid_: pool, waiting room, lobby (reserved for invites)

**Quick play**:
Joining a public game through the queue with a single tap.
_Avoid_: public play, matchmaking (that is the mechanism, not the action)

**Lobby**:
A private, invite-only pre-game space created by a host and shared as a link; its game starts when the host starts it.
_Avoid_: room (explicitly not a feature), group, party

**Host**:
The player who created a lobby and is the only one who can start its game.
_Avoid_: owner, leader

**Public game / Invite game / Solo game**:
The three game modes: formed from the queue; formed from a lobby; played alone against the day's median score after ten seconds alone in the queue.

**Median score**:
The median of the day's game scores; the opponent in a solo game.
_Avoid_: ghost, bot, average

**Quiz question**:
A question generated from a quote on the wall with answer options. Kinds: who said it, which match, finish the quote.
_Avoid_: prompt, item, card

**Question bank**:
The set of quiz questions derivable from the wall at a given moment; never stored, always derived.

**Score**:
The points a player earns across a game's rounds.
_Avoid_: points (as a noun for the total), tally (reserved for ballots)

**Scoreboard**:
The ranking of players within one game, after each round and at the end.
_Avoid_: leaderboard (reserved for cross-game rankings), standings

**Leaderboard**:
The ranking of identities by nickname across finished games over a period: today, this stage, whole tournament.
_Avoid_: ranking, scoreboard, hall of fame (reserved for the Quote Wall)

**Game result**:
One player's outcome in a finished game: score, answered, correct.
_Avoid_: stats, record
