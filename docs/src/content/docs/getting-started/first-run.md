---
title: First Run & PokeAPI Sync
description: What happens on initial setup — the six sync stages, how long it takes, and how resumability works.
---

Starting Six ships with an empty database. After you create your account, the next thing to do is sync PokeAPI data into the local SQLite file. The sync takes roughly 15-25 minutes and only needs to run once per install.

## How to start the sync

Sign in and go to `/settings/system`. Click the sync button there to trigger `POST /api/sync`. The endpoint opens a Server-Sent Events stream and emits `progress`, `complete`, and `error` events; the settings page renders them in a live progress bar as each stage advances.

## What it syncs

The pipeline runs six stages in order, defined in `src/lib/sync/index.ts`:

1. **Version Groups** (`src/lib/sync/games.ts`) — fetches every game release from PokeAPI and writes the `version_groups` table.
2. **Game Dexes** (`src/lib/sync/games.ts`) — pulls each game's Pokedex and writes species-to-game links into `game_pokemon`.
3. **Species** (`src/lib/sync/pokemon.ts`) — fetches all species metadata in memory and hands a species map to stage 4; nothing is persisted in this stage directly.
4. **Pokemon Forms** (`src/lib/sync/pokemon.ts`) — resolves every form variant (base, regional, alternate) and writes the `pokemon` table, one row per form.
5. **Abilities** (`src/lib/sync/abilities.ts`) — fetches each unique ability referenced by the forms and writes the `abilities` and `pokemon_abilities` tables.
6. **Moves** (`src/lib/sync/moves.ts`) — fetches each unique move referenced by the forms and writes the `moves` and `pokemon_moves` tables.

## How long it takes

The PokeAPI client (`src/lib/pokeapi/client.ts`) fans out requests in batches of 10, with a 100ms delay between batches. On a typical home connection the full pipeline finishes in roughly 15-25 minutes. Individual requests that fail are retried up to three times with exponential backoff (1s, 2s, 4s); requests that still fail after retries are logged and counted as failed for that stage, but the pipeline continues.

## Resumability

Every stage checks the relevant table's row count before doing any network work. If rows already exist — for example, `version_groups` has entries, or both `abilities` and `pokemon_abilities` are populated — the stage returns `skipped: true` and the pipeline moves on. If a sync is interrupted partway through, restart it from `/settings/system` and it will pick up at the first unfinished stage.

## After the sync

From this point the app reads only from SQLite, so building teams, browsing Pokedex entries, and swapping team members are all local operations and do not hit PokeAPI. If new Pokemon, moves, or games are added upstream later, re-running the sync from `/settings/system` will fill in whatever is missing — stages with complete data stay skipped, and stages that need new rows will run again.
