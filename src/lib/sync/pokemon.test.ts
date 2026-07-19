import { describe, it, expect, vi, beforeEach } from 'vitest';
import type BetterSqlite3 from 'better-sqlite3';
import { createTestDb } from '@/lib/db/test-helpers';

// Mock the db module to inject a fresh in-memory test database per test —
// same pattern as src/lib/db/queries.test.ts. Harmless no-op for the pure
// getFormName/buildDisplayName tests below, which never touch the DB.
vi.mock('@/lib/db', () => ({
  getDb: vi.fn(),
  schema: {},
}));

import { getDb } from '@/lib/db';
import { getFormName, buildDisplayName, syncPokemonForms } from './pokemon';
import type { SpeciesMetadata } from './types';

// ===========================================
// getFormName
// ===========================================

describe('getFormName', () => {
  it('base form (slug === speciesName) returns null', () => {
    expect(getFormName('pikachu', 'pikachu')).toBeNull();
  });

  it('Alolan form', () => {
    expect(getFormName('raichu-alola', 'raichu')).toBe('Alolan');
  });

  it('Galarian form', () => {
    expect(getFormName('zigzagoon-galar', 'zigzagoon')).toBe('Galarian');
  });

  it('Hisuian form', () => {
    expect(getFormName('growlithe-hisui', 'growlithe')).toBe('Hisuian');
  });

  it('Paldean form', () => {
    expect(getFormName('tauros-paldea-combat', 'tauros')).toBe('Paldea Combat');
  });

  it('non-regional form title-cased', () => {
    expect(getFormName('wormadam-plant', 'wormadam')).toBe('Plant');
  });

  it('multi-word non-regional form', () => {
    expect(getFormName('rotom-heat', 'rotom')).toBe('Heat');
  });

  it('slug with no suffix after species returns null', () => {
    // Edge case: pokemonSlug has speciesName as prefix but nothing after the dash
    expect(getFormName('pikachu', 'pikachu')).toBeNull();
  });
});

// ===========================================
// buildDisplayName
// ===========================================

describe('buildDisplayName', () => {
  it('null formName returns species name as-is', () => {
    expect(buildDisplayName('Pikachu', null)).toBe('Pikachu');
  });

  it('Alolan form', () => {
    expect(buildDisplayName('Raichu', 'Alolan')).toBe('Raichu (Alolan)');
  });

  it('Galarian form', () => {
    expect(buildDisplayName('Zigzagoon', 'Galarian')).toBe('Zigzagoon (Galarian)');
  });

  it('non-regional form', () => {
    expect(buildDisplayName('Rotom', 'Heat')).toBe('Rotom (Heat)');
  });
});

// ===========================================
// syncPokemonForms — refresh (UPSERT) semantics
// ===========================================
//
// This is the safety-critical stage for the scheduled re-sync: `pokemon.id`
// must never change under a refresh, because team_members.pokemon_id is a
// foreign key into it. A truncate-and-reinsert (or a delete+insert upsert)
// would silently orphan every saved team.

function getSqlite(db: ReturnType<typeof createTestDb>): BetterSqlite3.Database {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (db as any).$client;
}

const PIKACHU_SPECIES_MAP: Map<number, SpeciesMetadata> = new Map([
  [
    25,
    {
      speciesId: 25,
      englishName: 'Pikachu',
      generation: 1,
      isLegendary: false,
      isMythical: false,
      isBaby: false,
      varieties: [{ isDefault: true, pokemonUrl: 'https://pokeapi.co/api/v2/pokemon/25/' }],
    },
  ],
]);

function stubPokemonDetailFetch(statHp: number) {
  const fetchMock = vi.fn(async (url: string) => {
    if (url === 'https://pokeapi.co/api/v2/pokemon/25/') {
      return {
        ok: true,
        json: async () => ({
          id: 25,
          name: 'pikachu',
          species: { name: 'pikachu', url: 'https://pokeapi.co/api/v2/pokemon-species/25/' },
          stats: [
            { base_stat: statHp, stat: { name: 'hp', url: '' } },
            { base_stat: 55, stat: { name: 'attack', url: '' } },
            { base_stat: 40, stat: { name: 'defense', url: '' } },
            { base_stat: 50, stat: { name: 'special-attack', url: '' } },
            { base_stat: 50, stat: { name: 'special-defense', url: '' } },
            { base_stat: 90, stat: { name: 'speed', url: '' } },
          ],
          types: [{ slot: 1, type: { name: 'electric' } }],
          abilities: [],
          moves: [],
          sprites: { front_default: 'https://example.com/pikachu.png', front_shiny: 'https://example.com/pikachu-shiny.png' },
        }),
      };
    }
    throw new Error(`Unexpected fetch: ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('syncPokemonForms refresh semantics', () => {
  let db: ReturnType<typeof createTestDb>;
  let sqlite: BetterSqlite3.Database;

  beforeEach(() => {
    vi.restoreAllMocks();
    db = createTestDb();
    sqlite = getSqlite(db);
    vi.mocked(getDb).mockReturnValue(db as ReturnType<typeof getDb>);
  });

  /** Seeds a pre-existing pokemon row plus a team_member that references it by FK. */
  function seedExistingPokemonWithTeamMember() {
    sqlite.exec(`
      INSERT INTO version_groups (id, pokeapi_id, slug, name, generation, display_order)
      VALUES (1, 1, 'red-blue', 'Red / Blue', 1, 1)
    `);
    sqlite.exec(`
      INSERT INTO playthroughs (id, user_id, name, version_group_id)
      VALUES (1, 'user1', 'Test Run', 1)
    `);
    sqlite.exec(`
      INSERT INTO pokemon (id, pokeapi_id, species_id, slug, name, species_name, type_one, stat_hp)
      VALUES (1, 25, 25, 'pikachu', 'Pikachu (stale)', 'Pikachu', 'electric', 1)
    `);
    sqlite.exec(`
      INSERT INTO team_members (id, playthrough_id, pokemon_id, slot)
      VALUES (1, 1, 1, 1)
    `);
  }

  it('non-refresh (existing manual-sync behavior, unchanged): existing rows → skipped, zero network calls', async () => {
    seedExistingPokemonWithTeamMember();
    const fetchMock = stubPokemonDetailFetch(99);

    const { result, junctions } = await syncPokemonForms(PIKACHU_SPECIES_MAP, () => {}, false);

    expect(result.skipped).toBe(true);
    expect(junctions).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refresh=true: UPSERTs the existing pokemon row — never truncates, never changes its id', async () => {
    seedExistingPokemonWithTeamMember();
    stubPokemonDetailFetch(35); // fresh stat_hp from PokéAPI, different from the stale seeded value of 1

    const { result } = await syncPokemonForms(PIKACHU_SPECIES_MAP, () => {}, true);

    expect(result.skipped).toBe(false);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = sqlite.prepare('SELECT * FROM pokemon').all() as any[];
    expect(rows).toHaveLength(1); // never duplicated, never truncated-then-reinserted
    expect(rows[0].id).toBe(1); // same primary key — this is what keeps the FK below valid
    expect(rows[0].stat_hp).toBe(35); // stale data actually got refreshed
    expect(rows[0].name).not.toBe('Pikachu (stale)'); // display name recomputed from fresh data
  });

  it('refresh=true: the pre-existing team_members FK reference survives the refresh untouched', async () => {
    seedExistingPokemonWithTeamMember();
    stubPokemonDetailFetch(35);

    await syncPokemonForms(PIKACHU_SPECIES_MAP, () => {}, true);

    const member = sqlite.prepare('SELECT pokemon_id FROM team_members WHERE id = 1').get() as { pokemon_id: number };
    expect(member.pokemon_id).toBe(1);

    // The FK still joins cleanly to the (now-refreshed) pokemon row.
    const joined = sqlite
      .prepare(
        `SELECT p.stat_hp FROM team_members tm JOIN pokemon p ON p.id = tm.pokemon_id WHERE tm.id = 1`,
      )
      .get() as { stat_hp: number };
    expect(joined.stat_hp).toBe(35);
  });

  it('refresh=true with no pre-existing rows still performs a normal first sync (insert path)', async () => {
    const fetchMock = stubPokemonDetailFetch(35);

    const { result, junctions } = await syncPokemonForms(PIKACHU_SPECIES_MAP, () => {}, true);

    expect(result.skipped).toBe(false);
    expect(fetchMock).toHaveBeenCalled();
    expect(junctions).toHaveLength(1);
    expect(sqlite.prepare('SELECT * FROM pokemon').all()).toHaveLength(1);
  });
});
