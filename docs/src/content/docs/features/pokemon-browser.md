---
title: Pokémon browser
description: Searchable, filterable grid of every Pokémon synced from PokéAPI, with a detail page covering stats, abilities, and the full learnset.
---

The Pokémon browser is a searchable, filterable grid of every Pokémon synced from PokéAPI. It exists because building a team requires surveying candidates — checking a Fairy-type's base stats, seeing what moves a Gen 4 physical sweeper learns, or comparing two options for a specific slot. The browser puts all of that a search away without leaving the app.

## What you can do

Three controls sit above the grid:

- **Name search** — debounced at 300ms, filters by substring match against the Pokémon's name.
- **Type filter** — dropdown covering all 18 types; matches either `typeOne` or `typeTwo`, so a Water/Flying Pokémon appears in both lists.
- **Generation filter** — narrows to a single generation (1–9). Generations map to `pokemon.generation` in the database.

Filters combine. Searching for "saur" with type Fire and Gen 1 selected will return only Pokémon whose name contains "saur", have Fire as a type, and belong to Gen 1. The result count updates as you type.

The grid loads 48 cards at a time. If there are more results, a "Load more" button appears at the bottom showing how many are already loaded versus the total. Each page appends to the existing list rather than replacing it.

## The grid

Each card shows the Pokémon's sprite, dex number, name, and type badges. Legendary and Mythical Pokémon get a small label. Cards link to the detail page at `/pokemon/[slug]`.

The grid is responsive: 2 columns on mobile, up to 5 on large screens.

When no data has been synced yet, the empty state prompts you to run a PokéAPI sync from Settings → System.

## Detail page

`/pokemon/[slug]` loads everything server-side via `getPokemonBySlug`, `getPokemonAbilities`, and `getPokemonMoves` — no client-side fetching. The page shows:

- **Sprite** with a type-colored radial glow behind it
- **Dex number** (for base-form Pokémon with `pokeapiId <= 10000`), name, and form label if applicable
- **Type badges** and generation number; Legendary, Mythical, or Baby tags if applicable
- **Base stats** — HP, Attack, Defense, Sp. Atk, Sp. Def, Speed — displayed as color-coded bars scaled to a 255 maximum, with a Base Stat Total (BST) row at the bottom. Bar color shifts from red (< 50) through orange and yellow to green (100–129) and blue (130+).
- **Abilities** — all ability slots including hidden abilities, each with a short effect description. Abilities flagged `isNotable` in the database are highlighted with a yellow border.
- **Learnset** — every move the Pokémon learns, in a filterable table. You can search by move name, filter by type, and filter by damage class (physical, special, status). Columns are move name, type, category, power, accuracy, and PP.

## The API layer

`GET /api/pokemon` backs the grid. Accepted query parameters:

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `search` | string | — | Substring match on name |
| `type` | string | — | Single type (e.g., `fire`) |
| `generation` | number | — | Generation number 1–9 |
| `versionGroupId` | number | — | Restrict to a game's regional dex |
| `page` | number | `1` | Page number |
| `pageSize` | number | `48` | Results per page |

The response wraps the data in `{ data, meta }` where `meta` includes `page`, `pageSize`, `total`, and `totalPages`.

The underlying query function is `getPokemon` in `src/lib/db/queries.ts`. The detail page uses `getPokemonBySlug` (lookup by slug string), `getPokemonAbilities`, and `getPokemonMoves` from the same file.

For the full route listing including the `/api/pokemon/[id]/moves` endpoint, see the [API routes reference](/starting-six/reference/api-routes/). For the `pokemon` table columns and related tables (`pokemon_abilities`, `pokemon_moves`), see the [database schema](/starting-six/architecture/database-schema/).
