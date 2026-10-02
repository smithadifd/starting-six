import { beforeEach, describe, expect, it, vi } from 'vitest';
import type BetterSqlite3 from 'better-sqlite3';
import { createTestDb } from '@/lib/db/test-helpers';

vi.mock('@/lib/db', () => ({ getDb: vi.fn(), schema: {} }));

import { getDb } from '@/lib/db';
import { syncMoves } from './moves';
import type { PokemonJunctionData } from './types';

function getSqlite(db: ReturnType<typeof createTestDb>): BetterSqlite3.Database {
  return db.$client;
}

const junctions: PokemonJunctionData[] = [
  { pokemonPokeapiId: 25, abilities: [], moves: [{ pokeapiId: 85 }, { pokeapiId: 98 }] },
  { pokemonPokeapiId: 26, abilities: [], moves: [{ pokeapiId: 85 }] },
];

function stubFetch(failedId?: number) {
  const fetchMock = vi.fn(async (url: string) => {
    const id = Number(url.match(/\/move\/(\d+)\/$/)?.[1]);
    if (id !== 85 && id !== 98) throw new Error(`Unexpected fetch: ${url}`);
    if (id === failedId) throw new Error(`Move ${id} unavailable`);
    return {
      ok: true,
      json: async () => ({
        id,
        name: id === 85 ? 'thunderbolt' : 'quick-attack',
        type: { name: id === 85 ? 'electric' : 'normal' },
        damage_class: { name: id === 85 ? 'special' : 'physical' },
        power: id === 85 ? 90 : 40,
        accuracy: 100,
        pp: id === 85 ? 15 : 30,
        effect_entries: [
          { language: { name: 'ja' }, short_effect: 'Japanese effect' },
          { language: { name: 'en' }, short_effect: 'English effect' },
        ],
      }),
    };
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('syncMoves', () => {
  let sqlite: BetterSqlite3.Database;

  beforeEach(() => {
    vi.restoreAllMocks();
    const db = createTestDb();
    sqlite = getSqlite(db);
    vi.mocked(getDb).mockReturnValue(db as ReturnType<typeof getDb>);
    sqlite.exec(`
      INSERT INTO pokemon (pokeapi_id, species_id, slug, name, species_name, type_one)
      VALUES (25, 25, 'pikachu', 'Pikachu', 'Pikachu', 'electric'),
             (26, 26, 'raichu', 'Raichu', 'Raichu', 'electric')
    `);
  });

  it('fetches unique move details and links each move to its Pokémon', async () => {
    const fetchMock = stubFetch();

    const result = await syncMoves(junctions, () => {});

    expect(result).toEqual({ stage: 6, name: 'Moves', processed: 2, failed: 0, skipped: false });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sqlite.prepare('SELECT pokeapi_id, name, type, damage_class, power, accuracy, pp, effect_short FROM moves ORDER BY pokeapi_id').all()).toEqual([
      { pokeapi_id: 85, name: 'Thunderbolt', type: 'electric', damage_class: 'special', power: 90, accuracy: 100, pp: 15, effect_short: 'English effect' },
      { pokeapi_id: 98, name: 'Quick Attack', type: 'normal', damage_class: 'physical', power: 40, accuracy: 100, pp: 30, effect_short: 'English effect' },
    ]);
    expect(sqlite.prepare(`
      SELECT p.pokeapi_id AS pokemon, m.pokeapi_id AS move
      FROM pokemon_moves pm JOIN pokemon p ON p.id = pm.pokemon_id
      JOIN moves m ON m.id = pm.move_id ORDER BY pokemon, move
    `).all()).toEqual([
      { pokemon: 25, move: 85 }, { pokemon: 25, move: 98 }, { pokemon: 26, move: 85 },
    ]);
  });

  it('skips a completed ordinary rerun without fetching or duplicating rows', async () => {
    stubFetch();
    await syncMoves(junctions, () => {});
    const fetchMock = stubFetch();

    const result = await syncMoves(junctions, () => {});

    expect(result).toEqual({ stage: 6, name: 'Moves', processed: 2, failed: 0, skipped: true });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sqlite.prepare('SELECT * FROM moves').all()).toHaveLength(2);
    expect(sqlite.prepare('SELECT * FROM pokemon_moves').all()).toHaveLength(3);
  });

  it('refreshes existing moves and ignores duplicate links', async () => {
    stubFetch();
    await syncMoves(junctions, () => {});
    const originalId = (sqlite.prepare('SELECT id FROM moves WHERE pokeapi_id = 85').get() as { id: number }).id;
    sqlite.prepare('UPDATE moves SET power = 1 WHERE pokeapi_id = 85').run();
    stubFetch();

    const result = await syncMoves(junctions, () => {}, true);

    expect(result.skipped).toBe(false);
    expect(sqlite.prepare('SELECT id, power FROM moves WHERE pokeapi_id = 85').get()).toEqual({ id: originalId, power: 90 });
    expect(sqlite.prepare('SELECT * FROM moves').all()).toHaveLength(2);
    expect(sqlite.prepare('SELECT * FROM pokemon_moves').all()).toHaveLength(3);
  });

  it('counts a failed fetch and creates links only for fetched moves', async () => {
    const fetchMock = stubFetch(98);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await syncMoves(junctions, () => {});

    expect(result).toEqual({ stage: 6, name: 'Moves', processed: 1, failed: 1, skipped: false });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(sqlite.prepare('SELECT pokeapi_id FROM moves').all()).toEqual([{ pokeapi_id: 85 }]);
    expect(sqlite.prepare('SELECT * FROM pokemon_moves').all()).toHaveLength(2);
  });

  it('reports stage, total, and completed fetch count', async () => {
    stubFetch();
    const onProgress = vi.fn();

    await syncMoves(junctions, onProgress);

    expect(onProgress.mock.calls).toEqual([[6, 'Moves', 0, 2], [6, 'Moves', 2, 2]]);
  });
});
