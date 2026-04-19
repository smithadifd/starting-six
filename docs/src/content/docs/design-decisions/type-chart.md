---
title: Hardcoded type chart
description: Why the Gen 9 18×18 type effectiveness matrix lives in source code rather than being fetched from PokéAPI, and what to change if Game Freak ever updates it.
---

Starting Six ships with the full Gen 9 type effectiveness matrix inlined at `src/lib/analysis/typeChart.ts`. PokéAPI does expose type data, but the app never fetches it. This page explains the structure of that file and why a static constant is the right tool here.

## What the file contains

`typeChart.ts` declares `CHART` as a `Record<PokemonType, Record<PokemonType, number>>` — a nested object keyed first by attacking type, then by defending type. Every cell is one of four multipliers: `0` (no effect), `0.5` (not very effective), `1` (neutral), or `2` (super effective). The comment at the top of the file makes this explicit: `CHART[attacking][defending] = multiplier (0, 0.5, 1, or 2)`.

The 18 types — `normal`, `fire`, `water`, `electric`, `grass`, `ice`, `fighting`, `poison`, `ground`, `flying`, `psychic`, `bug`, `rock`, `ghost`, `dragon`, `dark`, `steel`, `fairy` — are not defined in this file. They come from `POKEMON_TYPES`, a `PokemonType[]` exported from `src/types/index.ts`. The type union and the ordered array both live there; `typeChart.ts` imports both.

The file exports three things:

- `getEffectiveness(attackType, defType1, defType2?)` — returns the combined multiplier for one attacking type against a defender with one or two types. Dual-type multiplication happens here.
- `getDefensiveProfile(defType1, defType2?)` — runs `getEffectiveness` for all 18 attacking types and returns a full `Record<PokemonType, number>` profile for a given defender.
- `TYPE_CHART` — the raw `CHART` constant, re-exported under a public name.

There are no move-level exceptions coded into the chart. Freeze-Dry's water interaction, for example, is a property of the move itself, not the type matchup system. The chart captures the pure type-vs-type rules.

## Why hardcoded instead of PokéAPI

**The chart barely changes.** It has shifted three times across roughly 25 years of mainline games: once at Gen 2 (Steel and Dark added), once at Gen 6 (Fairy added, Steel lost some resistances). Nothing since. Fetching and caching a table that moves this rarely just adds infrastructure for no gain.

**Analysis is a pure function.** The analysis modules under `src/lib/analysis/` take team data in and produce results out — no database reads, no network calls. Having the chart as a constant in source code preserves that purity. A version that loads the chart from a database or HTTP response introduces a failure mode (stale data, network error, schema drift) where none needs to exist.

**The app is already cache-first.** PokéAPI data for species, moves, and abilities is bulk-synced into SQLite before the UI ever runs. The type chart fits that architecture even better — it doesn't need a sync step at all. It just is.

**Editing it is a one-line diff.** If a new type appears, you add a row and a column to the object literal, add the new string to `POKEMON_TYPES` in `src/types/index.ts`, and you're done. That is strictly less work than updating a DB migration, re-running sync, and verifying the result.

**It's easy to test.** Because `CHART` is a module-level constant, any test that imports `getEffectiveness` or `getDefensiveProfile` works with a known, deterministic chart. No mocking, no fixtures, no database setup.

## How the chart is consumed

Two files in `src/lib/analysis/` import from `typeChart.ts`:

**`defense.ts`** imports `getDefensiveProfile` and uses it inside `analyzeDefense`. For each team member it calls `getDefensiveProfile` with that member's one or two types, then tallies across all 18 attacking types how many members are weak (`mult > 1`), resistant (`mult < 1`), or immune (`mult === 0`). The returned `DefenseResult` includes `byType` (the per-type tallies), `sharedWeaknesses` (attacking types where three or more team members are weak), and `uncoveredTypes` (attacking types that no member resists or is immune to).

**`offense.ts`** imports `getEffectiveness` and uses it inside `analyzeOffense`. For each team member it collects the types of that member's damaging moves (status moves and zero-power moves are skipped), then checks each move type against all 18 defending types. If `getEffectiveness` returns `> 1`, that defending type is marked covered. The returned `OffenseResult` includes `coverage` (per defending type: whether it's covered and which team members cover it), `uncoveredTypes`, and `coveragePercent` as a fraction between 0 and 1.

The chart is one lookup deep in both cases. Neither file needs to know about dual-type multiplication — `typeChart.ts` handles that in `getEffectiveness`.

## Maintenance

There are two realistic scenarios where this file would need an edit:

**A new type is introduced.** Add the new type string to the `PokemonType` union and `POKEMON_TYPES` array in `src/types/index.ts`. Then add a new row to `CHART` for the new attacking type, and add one new key to every existing row for the new defending type. TypeScript will tell you exactly which rows are missing the new key before you can build.

**An existing matchup changes.** Find the cell at `CHART[attackingType][defendingType]` and change the value. One line.

Neither event has happened since Gen 6 in 2013. The maintenance burden is low enough that the right response is a note in this file, not an automated sync.

---

For what `analyzeDefense` and `analyzeOffense` actually compute and how those results surface in the UI, see [Analysis engine](/starting-six/features/analysis-engine/).

For why the app doesn't fetch type data (or any other data) from PokéAPI at runtime, see [Bulk sync vs. live API](/starting-six/design-decisions/bulk-sync/).
