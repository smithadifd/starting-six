import { sql } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { abilities, pokemonAbilities, pokemon } from '@/lib/db/schema';
import { fetchUrl, fetchBatch } from '@/lib/pokeapi/client';
import type { AbilityResponse } from '@/lib/pokeapi/types';
import type { ProgressCallback, StageResult, PokemonJunctionData } from './types';

// ~50 competitively notable abilities to flag
const NOTABLE_SLUGS = new Set([
  'intimidate', 'levitate', 'adaptability', 'protean', 'libero',
  'huge-power', 'pure-power', 'speed-boost', 'magic-guard', 'multiscale',
  'sturdy', 'mold-breaker', 'teravolt', 'turboblaze', 'prankster',
  'gale-wings', 'triage', 'regenerator', 'natural-cure', 'poison-heal',
  'magic-bounce', 'drought', 'drizzle', 'sand-stream', 'snow-warning',
  'electric-surge', 'grassy-surge', 'misty-surge', 'psychic-surge',
  'flash-fire', 'lightning-rod', 'storm-drain', 'water-absorb', 'volt-absorb',
  'motor-drive', 'sap-sipper', 'dry-skin', 'thick-fat', 'fur-coat',
  'ice-scales', 'filter', 'solid-rock', 'marvel-scale', 'wonder-guard',
  'disguise', 'shadow-tag', 'arena-trap', 'contrary', 'simple',
  'technician', 'skill-link', 'serene-grace', 'sheer-force', 'beast-boost',
  'unaware', 'iron-fist', 'tough-claws', 'pixilate', 'refrigerate', 'aerilate',
]);

/**
 * Stage 5: Fetch ability details and create pokemon_abilities junctions.
 */
export async function syncAbilities(
  junctions: PokemonJunctionData[],
  onProgress: ProgressCallback,
): Promise<StageResult> {
  const db = getDb();

  const existingAbilities = db.select({ count: sql<number>`count(*)` }).from(abilities).get()?.count ?? 0;
  const existingJunctions = db.select({ count: sql<number>`count(*)` }).from(pokemonAbilities).get()?.count ?? 0;

  if (existingAbilities > 0 && existingJunctions > 0) {
    return { stage: 5, name: 'Abilities', processed: existingAbilities, failed: 0, skipped: true };
  }

  // Collect unique ability PokéAPI IDs from junctions
  const uniqueAbilityIds = new Set<number>();
  for (const j of junctions) {
    for (const a of j.abilities) {
      uniqueAbilityIds.add(a.pokeapiId);
    }
  }

  const abilityIds = Array.from(uniqueAbilityIds);
  const total = abilityIds.length;
  onProgress(5, 'Abilities', 0, total);

  let failed = 0;

  // Fetch ability details
  if (existingAbilities === 0) {
    const details = await fetchBatch(
      abilityIds,
      async (id) => {
        try {
          return await fetchUrl<AbilityResponse>(`https://pokeapi.co/api/v2/ability/${id}/`);
        } catch (err) {
          console.error(`Failed to fetch ability ${id}:`, err);
          failed++;
          return null;
        }
      },
      (processed) => onProgress(5, 'Abilities', processed, total),
    );

    // Insert abilities
    db.transaction(() => {
      for (const ability of details) {
        if (!ability) continue;
        const englishEffect = ability.effect_entries.find((e) => e.language.name === 'en');
        db.insert(abilities)
          .values({
            pokeapiId: ability.id,
            slug: ability.name,
            name: ability.name
              .split('-')
              .filter(Boolean)
              .map((w) => w[0].toUpperCase() + w.slice(1))
              .join(' '),
            effectShort: englishEffect?.short_effect ?? null,
            effectFull: englishEffect?.effect ?? null,
            isNotable: NOTABLE_SLUGS.has(ability.name),
          })
          .onConflictDoNothing()
          .run();
      }
    });
  }

  // Create pokemon_abilities junctions
  if (existingJunctions === 0 && junctions.length > 0) {
    // Build lookup maps
    const abilityIdMap = new Map<number, number>();
    const allAbilities = db.select({ id: abilities.id, pokeapiId: abilities.pokeapiId }).from(abilities).all();
    for (const a of allAbilities) {
      abilityIdMap.set(a.pokeapiId, a.id);
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
        for (const a of j.abilities) {
          const abilityDbId = abilityIdMap.get(a.pokeapiId);
          if (!abilityDbId) continue;
          db.insert(pokemonAbilities)
            .values({
              pokemonId: pokemonDbId,
              abilityId: abilityDbId,
              slot: a.slot,
              isHidden: a.isHidden,
            })
            .onConflictDoNothing()
            .run();
        }
      }
    });
  }

  return {
    stage: 5,
    name: 'Abilities',
    processed: abilityIds.length - failed,
    failed,
    skipped: false,
  };
}
