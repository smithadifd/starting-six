---
title: Analysis Engine
description: Defensive coverage, offensive coverage, role distribution, and notable abilities — what the panel reports and how to read it.
---

The analysis engine takes the six active team members for a playthrough and computes four views: defensive coverage, offensive coverage, role distribution, and notable abilities. The analysis modules under `src/lib/analysis/` are pure functions with no database imports — given the same team input, they always produce the same output. The API route assembles the inputs from the DB and hands them off.

## Defensive coverage

`analyzeDefense` walks each of the 18 attacking types and tallies, per type, how many team members are weak (2x+), resistant (0.5x-), or immune (0x). It flags `sharedWeaknesses` when three or more members are weak to the same attacking type, and `uncoveredTypes` when no member resists or is immune. Effectiveness lookups go through `getDefensiveProfile` in `src/lib/analysis/typeChart.ts`, which encodes the Gen 9 chart as `CHART[attacking][defending]`. Source: `src/lib/analysis/defense.ts`.

## Offensive coverage

`analyzeOffense` looks at each team member's damaging moves — anything with `damageClass !== 'status'` and `power > 0` — and records which of the 18 defending types those moves hit for more than 1x. Status moves and zero-power moves are skipped. The result lists `coveredBy` (the team members whose moves cover each type), `uncoveredTypes`, and a `coveragePercent` between 0 and 1. Source: `src/lib/analysis/offense.ts`.

## Role distribution

`classifyRole` buckets each member into one or more of nine roles based on base stats: `Physical Sweeper`, `Special Sweeper`, `Mixed Attacker`, `Physical Wall`, `Special Wall`, `Tank`, `Support`, `Glass Cannon`, and `Balanced`. The thresholds are hardcoded: Atk/SpAtk/Def/SpDef `>= 100` count as "high", Spd `>= 90`, HP `>= 90`, and "low defense" means both Def and SpDef `< 70`. A Pokémon can carry multiple role tags; if none match, it falls back to `Balanced`. Source: `src/lib/analysis/roles.ts`.

## Notable abilities

`analyzeAbilities` filters the team's abilities to those either flagged `isNotable` in the database or matching a curated slug set — entries like `intimidate`, `drought`, `drizzle`, `sand-stream`, `regenerator`, `multiscale`, `magic-bounce`, `prankster`, `protean`, `libero`, `huge-power`, `speed-boost`, and the terrain surges. Each highlight returns the Pokémon name, ability name, and short effect. Source: `src/lib/analysis/abilities.ts`.

## How the panel is served

The UI fetches `GET /api/playthroughs/[id]/analysis`, which returns `defense`, `offense`, `roles`, `abilities`, and `teamSize` in a single response. The panel is collapsed by default on the playthrough page.
