---
title: Analysis engine internals
description: Pure function design, type chart data shape, role classification thresholds, and how the five analysis modules are assembled by the API route.
---

The five files under `src/lib/analysis/` have no database imports, no network calls, and no mutable state. Each exports a function that takes plain data in and returns a result out. The API route at `src/app/api/playthroughs/[id]/analysis/route.ts` does the only database work: it batch-fetches Pokemon stats, moves, and abilities, builds the plain-object inputs, and passes them to the analysis functions one at a time.

That boundary is what makes each module testable without fixtures, mocks, or schema setup -- every module has a co-located `*.test.ts` that exercises it with inline data. If you need to trace a computed result, start in `src/lib/analysis/`; if you need to know where the data comes from, start in the route.

For what these results look like in the UI, see [Analysis engine](/starting-six/features/analysis-engine/). For why the type chart is a static constant rather than a PokéAPI fetch, see [Hardcoded type chart](/starting-six/design-decisions/type-chart/).

## typeChart.ts

The core of the type system is `CHART: Record<PokemonType, Record<PokemonType, number>>`. The outer key is the attacking type, the inner key is the defending type, and the value is one of four multipliers: `0` (immune), `0.5` (not very effective), `1` (neutral), or `2` (super effective). The file comment makes the access pattern explicit: `CHART[attacking][defending] = multiplier`.

Two functions are exported alongside the raw constant:

- `getEffectiveness(attackType, defType1, defType2?)` -- returns the combined multiplier for one attacking type against a one- or two-type defender. Dual-type multiplication is handled here: each defending type is looked up separately and the results are multiplied.
- `getDefensiveProfile(defType1, defType2?)` -- iterates all 18 types from `POKEMON_TYPES` and calls `getEffectiveness` for each, returning a full `Record<PokemonType, number>` profile for a given defender.

The raw constant is also re-exported as `TYPE_CHART` for callers that want direct access.

`POKEMON_TYPES` and the `PokemonType` union are not defined in this file -- they come from `src/types/index.ts`. `typeChart.ts` imports both; the set of 18 types lives in exactly one place.

## defense.ts

`analyzeDefense` takes an array of `{ typeOne, typeTwo }` objects and returns `DefenseResult`.

For each of the 18 attacking types it accumulates three counters: `weak` (multiplier `> 1`), `resist` (multiplier `< 1`), `immune` (multiplier `=== 0`). It calls `getDefensiveProfile` for each team member, so dual-type interactions are resolved before any counting happens.

Two derived lists come from those counters:

- `sharedWeaknesses` -- attacking types where `byType[t].weak >= 3`. Three or more members weak to the same type is the threshold.
- `uncoveredTypes` -- attacking types where `byType[t].resist === 0 && byType[t].immune === 0`. No member resists or is immune.

The full `byType` map (all 18 types with all three counts) is also in the result for the per-type UI breakdown.

## offense.ts

`analyzeOffense` takes an array of `{ name, moves[] }` objects. Each move carries `type`, `damageClass`, and `power`.

Status moves (`damageClass === 'status'`) and zero-or-null-power moves are skipped. For every remaining move type, `getEffectiveness` is called against each of the 18 defending types. A result `> 1` marks that defending type as covered and records the team member's name in `coveredBy`.

The return shape is `OffenseResult`:

- `coverage` -- per defending type: `{ covered: boolean, coveredBy: string[] }`
- `uncoveredTypes` -- defending types no team move hits super-effectively
- `coveragePercent` -- `coveredCount / 18`, a fraction between 0 and 1

"Covered" means strictly super-effective. Neutral coverage does not qualify. The offense pass calls `getEffectiveness` with only a single defending type argument, so it treats each of the 18 types as a standalone defender rather than accounting for dual-type defender combinations.

## roles.ts

`classifyRole` takes a single Pokemon's base stats and assigns it one or more roles from a fixed set of nine: `Physical Sweeper`, `Special Sweeper`, `Mixed Attacker`, `Physical Wall`, `Special Wall`, `Tank`, `Support`, `Glass Cannon`, and `Balanced`.

The thresholds are hardcoded in the function body:

```text
highAtk    statAtk >= 100
highSpAtk  statSpAtk >= 100
highSpd    statSpd >= 90
highDef    statDef >= 100
highSpDef  statSpDef >= 100
highHp     statHp >= 90
lowDef     statDef < 70 && statSpDef < 70
```

Role conditions:

```text
Physical Sweeper  highAtk && highSpd && !highSpAtk
Special Sweeper   highSpAtk && highSpd && !highAtk
Mixed Attacker    highAtk && highSpAtk
Physical Wall     highDef && highHp && !highSpDef
Special Wall      highSpDef && highHp && !highDef
Tank              highDef && highSpDef
Glass Cannon      (highAtk || highSpAtk) && lowDef
Support           !highAtk && !highSpAtk && (highDef || highSpDef || highHp)
Balanced          fallback when no other role matches
```

A single Pokemon can carry multiple role tags simultaneously. `analyzeRoles` maps `classifyRole` over the team and returns an array of `RoleResult` objects, each with `name`, `roles`, and `bst`.

## abilities.ts

`analyzeAbilities` filters the team's abilities down to those worth surfacing. An ability passes if either its `isNotable` field is `true` in the database, or its slug appears in the module-level `TEAM_NOTABLE_SLUGS` set.

That set contains 28 slugs: `intimidate`, `drought`, `drizzle`, `sand-stream`, `snow-warning`, `levitate`, `magic-bounce`, `prankster`, `regenerator`, `multiscale`, `sturdy`, `magic-guard`, `unaware`, `mold-breaker`, `adaptability`, `protean`, `libero`, `huge-power`, `pure-power`, `speed-boost`, `guts`, `technician`, `contrary`, `serene-grace`, `electric-surge`, `grassy-surge`, `misty-surge`, and `psychic-surge`.

Each result is an `AbilityHighlight`: `{ pokemonName, abilityName, effect }`. The `effect` string is `effectShort` from the database; if that field is null, the fallback string is `'No description available'`.

There is no text-pattern parsing -- the filter is purely slug-based. Abilities absent from `TEAM_NOTABLE_SLUGS` and not DB-flagged are excluded regardless of competitive significance. Extending coverage means adding to that set or setting `isNotable = true` on the ability row.

## How the route assembles all of this

`GET /api/playthroughs/[id]/analysis` does all the database work upfront. It fetches active team members, then batch-fetches full `pokemon` rows (for base stats) and `abilities` rows (for `isNotable`) via `inArray` queries. It builds four typed arrays -- `defenseInput`, `offenseInput`, `rolesInput`, `abilitiesInput` -- and calls the four analysis functions in sequence. The response is `{ defense, offense, roles, abilities, teamSize }`.

Nothing in the analysis layer touches the database. The route constructs the inputs; the five functions compute from them.
