---
title: Playthroughs & Team Builder
description: Create a playthrough, add members to the six active slots, and use the bench to swap team members in and out.
---

A playthrough is a named team tied to a specific game. Each playthrough has up to six active members, numbered slots 1 through 6, plus an unbounded bench for everyone else.

## Create a playthrough

From the dashboard, click "New playthrough," pick the game you're playing, and give the run a name. The game you choose determines which Pokemon are available — the browser is filtered to that game's dex, so a Scarlet/Violet run won't surface Pokemon that aren't in Paldea.

## Add a team member

Open an empty slot and the Pokemon browser modal appears. Search or filter down to the Pokemon you want, then pick it. Once added, you can assign four moves (learned by that Pokemon), one ability drawn from its available abilities, and one Tera type from the eighteen type options. If the active team is already full, new members land on the bench automatically.

## Bench and swap

Active members hold a slot number between 1 and 6. Benched members live in the same `team_members` table but have `slot` set to `null`, so the bench has no size cap. Swapping a bench member into the active six hits `POST /api/playthroughs/[id]/team/swap`, which atomically moves the slot value from the active row to the benched row in a single transaction — the previously active Pokemon becomes benched, the incoming one takes its slot.

No data is lost when a Pokemon is benched. Moves, ability, Tera type, and nickname all stay attached to the row. See the [Bench/Swap Data Model](/starting-six/design-decisions/bench-swap/) for why the schema uses a nullable slot instead of a separate bench table.

## Deleting a member

Benching is non-destructive — it sets `slot` to `null` and keeps the row. Deleting is destructive — `DELETE /api/playthroughs/[id]/team/[memberId]` removes the `team_members` row outright, taking the assigned moves, ability, and Tera type with it. Use bench when you might bring the Pokemon back; delete when you won't.

## Analysis

The Analysis panel reads the six active members (slots 1-6) and runs type coverage across their moves and typing. See [Analysis Engine](/starting-six/features/analysis-engine/) for how scores are calculated.
