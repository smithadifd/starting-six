import { sql } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { pokemon } from '@/lib/db/schema';
import { fetchAllPages, fetchUrl, extractIdFromUrl, fetchBatch } from '@/lib/pokeapi/client';
import type { PokemonSpeciesResponse, PokemonResponse, NamedAPIResource } from '@/lib/pokeapi/types';
import type { ProgressCallback, StageResult, SpeciesMetadata, PokemonJunctionData } from './types';

const FORM_REGIONAL: Record<string, string> = {
  'alola': 'Alolan',
  'galar': 'Galarian',
  'hisui': 'Hisuian',
  'paldea': 'Paldean',
};

function getFormName(pokemonSlug: string, speciesName: string): string | null {
  if (pokemonSlug === speciesName) return null;
  const suffix = pokemonSlug.slice(speciesName.length + 1);
  if (!suffix) return null;
  if (FORM_REGIONAL[suffix]) return FORM_REGIONAL[suffix];
  return suffix
    .split('-')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

function buildDisplayName(speciesEnglishName: string, formName: string | null): string {
  if (!formName) return speciesEnglishName;
  return `${speciesEnglishName} (${formName})`;
}

function extractStatValue(stats: PokemonResponse['stats'], statName: string): number {
  return stats.find((s) => s.stat.name === statName)?.base_stat ?? 0;
}

/**
 * Stage 3: Fetch all species metadata.
 * Returns a map of speciesId → metadata for stage 4.
 */
export async function syncSpecies(
  onProgress: ProgressCallback,
): Promise<{ result: StageResult; speciesMap: Map<number, SpeciesMetadata> }> {
  const list = await fetchAllPages('pokemon-species');
  const total = list.length;
  onProgress(3, 'Species', 0, total);

  const speciesMap = new Map<number, SpeciesMetadata>();
  let failed = 0;

  const details = await fetchBatch<NamedAPIResource, PokemonSpeciesResponse | null>(
    list,
    async (item) => {
      try {
        return await fetchUrl<PokemonSpeciesResponse>(item.url);
      } catch (err) {
        console.error(`Failed to fetch species ${item.name}:`, err);
        failed++;
        return null;
      }
    },
    (processed) => onProgress(3, 'Species', processed, total),
  );

  for (const species of details) {
    if (!species) continue;
    const englishName =
      species.names.find((n) => n.language.name === 'en')?.name ??
      species.name[0].toUpperCase() + species.name.slice(1);
    speciesMap.set(species.id, {
      speciesId: species.id,
      englishName,
      generation: extractIdFromUrl(species.generation.url),
      isLegendary: species.is_legendary,
      isMythical: species.is_mythical,
      isBaby: species.is_baby,
      varieties: species.varieties.map((v) => ({
        isDefault: v.is_default,
        pokemonUrl: v.pokemon.url,
      })),
    });
  }

  return {
    result: { stage: 3, name: 'Species', processed: speciesMap.size, failed, skipped: false },
    speciesMap,
  };
}

/**
 * Stage 4: Fetch pokemon form details and insert into DB.
 * Returns junction data for stages 5-6.
 */
export async function syncPokemonForms(
  speciesMap: Map<number, SpeciesMetadata>,
  onProgress: ProgressCallback,
): Promise<{ result: StageResult; junctions: PokemonJunctionData[] }> {
  const db = getDb();
  const existing = db.select({ count: sql<number>`count(*)` }).from(pokemon).get()?.count ?? 0;
  if (existing > 0) {
    return {
      result: { stage: 4, name: 'Pokémon Forms', processed: existing, failed: 0, skipped: true },
      junctions: [],
    };
  }

  // Collect all pokemon URLs from species varieties
  const pokemonFetches: { speciesId: number; pokemonUrl: string; isDefault: boolean }[] = [];
  for (const [speciesId, meta] of speciesMap) {
    for (const variety of meta.varieties) {
      pokemonFetches.push({ speciesId, pokemonUrl: variety.pokemonUrl, isDefault: variety.isDefault });
    }
  }

  const total = pokemonFetches.length;
  onProgress(4, 'Pokémon Forms', 0, total);

  const junctions: PokemonJunctionData[] = [];
  let failed = 0;

  const results = await fetchBatch(
    pokemonFetches,
    async (pf) => {
      try {
        const poke = await fetchUrl<PokemonResponse>(pf.pokemonUrl);
        return { ...pf, poke };
      } catch (err) {
        console.error(`Failed to fetch pokemon ${pf.pokemonUrl}:`, err);
        failed++;
        return null;
      }
    },
    (processed) => onProgress(4, 'Pokémon Forms', processed, total),
  );

  // Insert pokemon rows and collect junction data
  db.transaction(() => {
    for (const item of results) {
      if (!item) continue;
      const { speciesId, isDefault, poke } = item;
      const species = speciesMap.get(speciesId);
      if (!species) continue;

      const speciesSlug = poke.species.name;
      const actualFormName = getFormName(poke.name, speciesSlug);
      const displayName = buildDisplayName(species.englishName, actualFormName);

      const typeOne = poke.types.find((t) => t.slot === 1)?.type.name ?? 'normal';
      const typeTwo = poke.types.find((t) => t.slot === 2)?.type.name ?? null;

      const hp = extractStatValue(poke.stats, 'hp');
      const atk = extractStatValue(poke.stats, 'attack');
      const def = extractStatValue(poke.stats, 'defense');
      const spAtk = extractStatValue(poke.stats, 'special-attack');
      const spDef = extractStatValue(poke.stats, 'special-defense');
      const spd = extractStatValue(poke.stats, 'speed');

      db.insert(pokemon)
        .values({
          pokeapiId: poke.id,
          speciesId,
          slug: poke.name,
          name: displayName,
          speciesName: species.englishName,
          formName: actualFormName,
          isDefault,
          typeOne,
          typeTwo,
          statHp: hp,
          statAtk: atk,
          statDef: def,
          statSpAtk: spAtk,
          statSpDef: spDef,
          statSpd: spd,
          bst: hp + atk + def + spAtk + spDef + spd,
          spriteDefault: poke.sprites.front_default,
          spriteShiny: poke.sprites.front_shiny,
          generation: species.generation,
          isLegendary: species.isLegendary,
          isMythical: species.isMythical,
          isBaby: species.isBaby,
        })
        .onConflictDoNothing()
        .run();

      // Collect junction data
      junctions.push({
        pokemonPokeapiId: poke.id,
        abilities: poke.abilities.map((a) => ({
          pokeapiId: extractIdFromUrl(a.ability.url),
          slot: a.slot,
          isHidden: a.is_hidden,
        })),
        moves: poke.moves.map((m) => ({
          pokeapiId: extractIdFromUrl(m.move.url),
        })),
      });
    }
  });

  return {
    result: { stage: 4, name: 'Pokémon Forms', processed: results.filter(Boolean).length, failed, skipped: false },
    junctions,
  };
}
