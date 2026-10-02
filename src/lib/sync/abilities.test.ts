import { beforeEach, describe, expect, it, vi } from 'vitest';
import type BetterSqlite3 from 'better-sqlite3';
import { createTestDb } from '@/lib/db/test-helpers';

vi.mock('@/lib/db', () => ({ getDb: vi.fn(), schema: {} }));

import { getDb } from '@/lib/db';
import { syncAbilities } from './abilities';
import type { PokemonJunctionData } from './types';

const junctions: PokemonJunctionData[] = [
  { pokemonPokeapiId: 25, abilities: [
    { pokeapiId: 9, slot: 1, isHidden: false },
    { pokeapiId: 31, slot: 3, isHidden: true },
  ], moves: [] },
  { pokemonPokeapiId: 26, abilities: [
    { pokeapiId: 9, slot: 1, isHidden: false },
  ], moves: [] },
];

function stubFetch(failId?: number) {
  const fetchMock = vi.fn(async (url: string) => {
    const match = /^https:\/\/pokeapi\.co\/api\/v2\/ability\/(9|31)\/$/.exec(url);
    if (!match) throw new Error(`Unexpected fetch: ${url}`);
    const id = Number(match[1]);
    if (id === failId) throw new Error(`Ability ${id} unavailable`);
    return {
      ok: true,
      json: async () => ({
        id,
        name: id === 9 ? 'static' : 'lightning-rod',
        effect_entries: [
          { effect: 'Ignored', short_effect: 'Ignored', language: { name: 'fr', url: '' } },
          { effect: `Full ${id}`, short_effect: `Short ${id}`, language: { name: 'en', url: '' } },
        ],
      }),
    };
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('syncAbilities', () => {
  let sqlite: BetterSqlite3.Database;

  beforeEach(() => {
    vi.restoreAllMocks();
    const db = createTestDb();
    sqlite = (db as unknown as { $client: BetterSqlite3.Database }).$client;
    vi.mocked(getDb).mockReturnValue(db as ReturnType<typeof getDb>);
    sqlite.exec(`
      INSERT INTO pokemon (id, pokeapi_id, species_id, slug, name, species_name, type_one)
      VALUES (101, 25, 25, 'pikachu', 'Pikachu', 'Pikachu', 'electric'),
             (102, 26, 26, 'raichu', 'Raichu', 'Raichu', 'electric')
    `);
  });

  it('creates one ability per unique ID and joins each Pokémon to its assigned slots', async () => {
    const fetchMock = stubFetch();

    const result = await syncAbilities(junctions, () => {});

    expect(result).toEqual({ stage: 5, name: 'Abilities', processed: 2, failed: 0, skipped: false });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sqlite.prepare('SELECT pokeapi_id, slug, name, effect_short, effect_full, is_notable FROM abilities ORDER BY pokeapi_id').all()).toEqual([
      { pokeapi_id: 9, slug: 'static', name: 'Static', effect_short: 'Short 9', effect_full: 'Full 9', is_notable: 0 },
      { pokeapi_id: 31, slug: 'lightning-rod', name: 'Lightning Rod', effect_short: 'Short 31', effect_full: 'Full 31', is_notable: 1 },
    ]);
    expect(sqlite.prepare(`
      SELECT p.pokeapi_id AS pokemon_id, a.pokeapi_id AS ability_id, pa.slot, pa.is_hidden
      FROM pokemon_abilities pa
      JOIN pokemon p ON p.id = pa.pokemon_id
      JOIN abilities a ON a.id = pa.ability_id
      ORDER BY p.pokeapi_id, pa.slot
    `).all()).toEqual([
      { pokemon_id: 25, ability_id: 9, slot: 1, is_hidden: 0 },
      { pokemon_id: 25, ability_id: 31, slot: 3, is_hidden: 1 },
      { pokemon_id: 26, ability_id: 9, slot: 1, is_hidden: 0 },
    ]);
  });

  it('skips a populated stage on a non-refresh rerun without fetching or duplicating rows', async () => {
    const fetchMock = stubFetch();
    await syncAbilities(junctions, () => {});
    fetchMock.mockClear();
    const onProgress = vi.fn();

    const result = await syncAbilities(junctions, onProgress);

    expect(result).toEqual({ stage: 5, name: 'Abilities', processed: 2, failed: 0, skipped: true });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(onProgress).not.toHaveBeenCalled();
    expect(sqlite.prepare('SELECT id FROM abilities').all()).toHaveLength(2);
    expect(sqlite.prepare('SELECT id FROM pokemon_abilities').all()).toHaveLength(3);
  });

  it('counts a failed ability fetch and leaves its junction absent while retaining successful rows', async () => {
    const fetchMock = stubFetch(31);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await syncAbilities(junctions, () => {});

    expect(result).toEqual({ stage: 5, name: 'Abilities', processed: 1, failed: 1, skipped: false });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(errorSpy).toHaveBeenCalledOnce();
    expect(sqlite.prepare('SELECT pokeapi_id FROM abilities').all()).toEqual([{ pokeapi_id: 9 }]);
    expect(sqlite.prepare('SELECT pokemon_id, slot FROM pokemon_abilities ORDER BY pokemon_id').all()).toEqual([
      { pokemon_id: 101, slot: 1 },
      { pokemon_id: 102, slot: 1 },
    ]);
  });

  it('reports the initial and completed counts for the unique ability IDs', async () => {
    stubFetch();
    const onProgress = vi.fn();

    await syncAbilities(junctions, onProgress);

    expect(onProgress.mock.calls).toEqual([
      [5, 'Abilities', 0, 2],
      [5, 'Abilities', 2, 2],
    ]);
  });
});
