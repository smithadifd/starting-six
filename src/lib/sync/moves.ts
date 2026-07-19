import { sql } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { moves, pokemonMoves, pokemon } from '@/lib/db/schema';
import { fetchUrl, fetchBatch } from '@/lib/pokeapi/client';
import type { MoveResponse } from '@/lib/pokeapi/types';
import type { ProgressCallback, StageResult, PokemonJunctionData } from './types';

/**
 * Stage 6: Fetch move details and create pokemon_moves junctions.
 * When `refresh` is true, skips the "already populated" short-circuit and
 * UPSERTs `moves` (by `pokeapiId`) instead of insert-only. The
 * `pokemon_moves` junction has no mutable payload beyond the
 * (pokemonId, moveId) pair itself, so it stays insert-or-ignore even in
 * refresh mode — that already picks up newly-learned moves.
 */
export async function syncMoves(
  junctions: PokemonJunctionData[],
  onProgress: ProgressCallback,
  refresh = false,
): Promise<StageResult> {
  const db = getDb();

  const existingMoves = db.select({ count: sql<number>`count(*)` }).from(moves).get()?.count ?? 0;
  const existingJunctions = db.select({ count: sql<number>`count(*)` }).from(pokemonMoves).get()?.count ?? 0;

  if (existingMoves > 0 && existingJunctions > 0 && !refresh) {
    return { stage: 6, name: 'Moves', processed: existingMoves, failed: 0, skipped: true };
  }

  // Collect unique move PokéAPI IDs
  const uniqueMoveIds = new Set<number>();
  for (const j of junctions) {
    for (const m of j.moves) {
      uniqueMoveIds.add(m.pokeapiId);
    }
  }

  const moveIds = Array.from(uniqueMoveIds);
  const total = moveIds.length;
  onProgress(6, 'Moves', 0, total);

  let failed = 0;

  // Fetch move details
  if (refresh || existingMoves === 0) {
    const details = await fetchBatch(
      moveIds,
      async (id) => {
        try {
          return await fetchUrl<MoveResponse>(`https://pokeapi.co/api/v2/move/${id}/`);
        } catch (err) {
          console.error(`Failed to fetch move ${id}:`, err);
          failed++;
          return null;
        }
      },
      (processed) => onProgress(6, 'Moves', processed, total),
    );

    // Insert moves
    db.transaction(() => {
      for (const move of details) {
        if (!move) continue;
        const englishEffect = move.effect_entries.find((e) => e.language.name === 'en');
        const values = {
          pokeapiId: move.id,
          slug: move.name,
          name: move.name
            .split('-')
            .filter(Boolean)
            .map((w) => w[0].toUpperCase() + w.slice(1))
            .join(' '),
          type: move.type.name,
          damageClass: move.damage_class.name,
          power: move.power,
          accuracy: move.accuracy,
          pp: move.pp ?? 0,
          effectShort: englishEffect?.short_effect ?? null,
        };
        const insert = db.insert(moves).values(values);
        if (refresh) {
          insert.onConflictDoUpdate({ target: moves.pokeapiId, set: values }).run();
        } else {
          insert.onConflictDoNothing().run();
        }
      }
    });
  }

  // Create pokemon_moves junctions
  if ((refresh || existingJunctions === 0) && junctions.length > 0) {
    // Build lookup maps
    const moveIdMap = new Map<number, number>();
    const allMoves = db.select({ id: moves.id, pokeapiId: moves.pokeapiId }).from(moves).all();
    for (const m of allMoves) {
      moveIdMap.set(m.pokeapiId, m.id);
    }

    const pokemonIdMap = new Map<number, number>();
    const allPokemon = db.select({ id: pokemon.id, pokeapiId: pokemon.pokeapiId }).from(pokemon).all();
    for (const p of allPokemon) {
      pokemonIdMap.set(p.pokeapiId, p.id);
    }

    db.transaction(() => {
      for (const j of junctions) {
        const pokemonDbId = pokemonIdMap.get(j.pokemonPokeapiId);
        if (!pokemonDbId) continue;
        for (const m of j.moves) {
          const moveDbId = moveIdMap.get(m.pokeapiId);
          if (!moveDbId) continue;
          db.insert(pokemonMoves)
            .values({
              pokemonId: pokemonDbId,
              moveId: moveDbId,
            })
            .onConflictDoNothing()
            .run();
        }
      }
    });
  }

  return {
    stage: 6,
    name: 'Moves',
    processed: moveIds.length - failed,
    failed,
    skipped: false,
  };
}
