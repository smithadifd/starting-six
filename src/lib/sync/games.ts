import { sql } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { versionGroups, gamePokemon } from '@/lib/db/schema';
import { fetchAllPages, fetchUrl, extractIdFromUrl, fetchBatch } from '@/lib/pokeapi/client';
import type { VersionGroupResponse, PokedexResponse, NamedAPIResource } from '@/lib/pokeapi/types';
import type { ProgressCallback, StageResult } from './types';

const VERSION_GROUP_NAMES: Record<string, string> = {
  'red-blue': 'Red / Blue',
  'yellow': 'Yellow',
  'gold-silver': 'Gold / Silver',
  'crystal': 'Crystal',
  'ruby-sapphire': 'Ruby / Sapphire',
  'emerald': 'Emerald',
  'firered-leafgreen': 'FireRed / LeafGreen',
  'diamond-pearl': 'Diamond / Pearl',
  'platinum': 'Platinum',
  'heartgold-soulsilver': 'HeartGold / SoulSilver',
  'black-white': 'Black / White',
  'black-2-white-2': 'Black 2 / White 2',
  'x-y': 'X / Y',
  'omega-ruby-alpha-sapphire': 'Omega Ruby / Alpha Sapphire',
  'sun-moon': 'Sun / Moon',
  'ultra-sun-ultra-moon': 'Ultra Sun / Ultra Moon',
  'lets-go-pikachu-lets-go-eevee': "Let's Go Pikachu / Eevee",
  'sword-shield': 'Sword / Shield',
  'the-isle-of-armor': 'The Isle of Armor',
  'the-crown-tundra': 'The Crown Tundra',
  'brilliant-diamond-and-shining-pearl': 'Brilliant Diamond / Shining Pearl',
  'legends-arceus': 'Legends: Arceus',
  'scarlet-violet': 'Scarlet / Violet',
  'the-teal-mask': 'The Teal Mask',
  'the-indigo-disk': 'The Indigo Disk',
  'colosseum': 'Colosseum',
  'xd': 'XD: Gale of Darkness',
};

function formatVersionGroupName(slug: string): string {
  return (
    VERSION_GROUP_NAMES[slug] ??
    slug
      .split('-')
      .filter(Boolean)
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join(' ')
  );
}

/**
 * Stage 1: Sync version groups (game titles).
 */
export async function syncVersionGroups(onProgress: ProgressCallback): Promise<StageResult> {
  const db = getDb();
  const existing = db.select({ count: sql<number>`count(*)` }).from(versionGroups).get()?.count ?? 0;
  if (existing > 0) {
    return { stage: 1, name: 'Version Groups', processed: existing, failed: 0, skipped: true };
  }

  const list = await fetchAllPages('version-group');
  const total = list.length;
  onProgress(1, 'Version Groups', 0, total);

  const details = await fetchBatch<NamedAPIResource, VersionGroupResponse>(
    list,
    (item) => fetchUrl<VersionGroupResponse>(item.url),
    (processed) => onProgress(1, 'Version Groups', processed, total),
  );

  db.transaction(() => {
    for (const vg of details) {
      const generation = extractIdFromUrl(vg.generation.url);
      db.insert(versionGroups)
        .values({
          pokeapiId: vg.id,
          slug: vg.name,
          name: formatVersionGroupName(vg.name),
          generation,
          displayOrder: vg.order,
        })
        .onConflictDoNothing()
        .run();
    }
  });

  return { stage: 1, name: 'Version Groups', processed: details.length, failed: 0, skipped: false };
}

/**
 * Stage 2: Sync game dexes (which species appear in which games).
 */
export async function syncGameDexes(onProgress: ProgressCallback): Promise<StageResult> {
  const db = getDb();
  const existing = db.select({ count: sql<number>`count(*)` }).from(gamePokemon).get()?.count ?? 0;
  if (existing > 0) {
    return { stage: 2, name: 'Game Dexes', processed: existing, failed: 0, skipped: true };
  }

  // Get all version groups from our DB
  const vgs = db.select().from(versionGroups).all();

  // Collect all unique pokedex URLs across all version groups
  // First fetch version group details to get their pokedexes
  const vgDetails = await fetchBatch<typeof vgs[number], { dbId: number; pokedexes: NamedAPIResource[] }>(
    vgs,
    async (vg) => {
      const detail = await fetchUrl<VersionGroupResponse>(
        `https://pokeapi.co/api/v2/version-group/${vg.pokeapiId}/`,
      );
      return { dbId: vg.id, pokedexes: detail.pokedexes };
    },
  );

  // Flatten: each pokedex fetch linked to a version group DB ID
  const dexFetches: { vgDbId: number; dexUrl: string }[] = [];
  for (const vg of vgDetails) {
    for (const dex of vg.pokedexes) {
      dexFetches.push({ vgDbId: vg.dbId, dexUrl: dex.url });
    }
  }

  const total = dexFetches.length;
  onProgress(2, 'Game Dexes', 0, total);

  const allEntries: { vgDbId: number; speciesId: number; dexNumber: number }[] = [];

  const dexResults = await fetchBatch(
    dexFetches,
    async (df) => {
      const dex = await fetchUrl<PokedexResponse>(df.dexUrl);
      return { vgDbId: df.vgDbId, entries: dex.pokemon_entries };
    },
    (p) => onProgress(2, 'Game Dexes', p, total),
  );

  for (const result of dexResults) {
    for (const entry of result.entries) {
      const speciesId = extractIdFromUrl(entry.pokemon_species.url);
      allEntries.push({ vgDbId: result.vgDbId, speciesId, dexNumber: entry.entry_number });
    }
  }

  // Bulk insert in a transaction
  db.transaction(() => {
    for (const entry of allEntries) {
      db.insert(gamePokemon)
        .values({
          versionGroupId: entry.vgDbId,
          speciesId: entry.speciesId,
          dexNumber: entry.dexNumber,
        })
        .onConflictDoNothing()
        .run();
    }
  });

  return { stage: 2, name: 'Game Dexes', processed: allEntries.length, failed: 0, skipped: false };
}
