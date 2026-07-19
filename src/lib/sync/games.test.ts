import { describe, it, expect, vi, beforeEach } from 'vitest';
import type BetterSqlite3 from 'better-sqlite3';
import { createTestDb } from '@/lib/db/test-helpers';

// Mock the db module to inject a fresh in-memory test database per test —
// same pattern as src/lib/db/queries.test.ts.
vi.mock('@/lib/db', () => ({
  getDb: vi.fn(),
  schema: {},
}));

import { getDb } from '@/lib/db';
import { syncVersionGroups } from './games';

function getSqlite(db: ReturnType<typeof createTestDb>): BetterSqlite3.Database {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (db as any).$client;
}

function jsonResponse(body: unknown) {
  return { ok: true, json: async () => body };
}

/**
 * Stubs the two PokéAPI calls `syncVersionGroups` makes: the paginated list,
 * then the detail fetch for the one version group in it. `order`/`generation`
 * are parameterized so refresh tests can prove an upsert actually picked up
 * fresh values.
 */
function stubFetch(order: number, generationId: number) {
  const fetchMock = vi.fn(async (url: string) => {
    if (url.includes('version-group?limit=100')) {
      return jsonResponse({
        count: 1,
        next: null,
        previous: null,
        results: [{ name: 'red-blue', url: 'https://pokeapi.co/api/v2/version-group/1/' }],
      });
    }
    if (url === 'https://pokeapi.co/api/v2/version-group/1/') {
      return jsonResponse({
        id: 1,
        name: 'red-blue',
        order,
        generation: { name: `generation-${generationId}`, url: `https://pokeapi.co/api/v2/generation/${generationId}/` },
        pokedexes: [],
      });
    }
    throw new Error(`Unexpected fetch: ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('syncVersionGroups refresh semantics', () => {
  let db: ReturnType<typeof createTestDb>;
  let sqlite: BetterSqlite3.Database;

  beforeEach(() => {
    vi.restoreAllMocks();
    db = createTestDb();
    sqlite = getSqlite(db);
    vi.mocked(getDb).mockReturnValue(db as ReturnType<typeof getDb>);
  });

  function seedExistingRow() {
    sqlite.exec(`
      INSERT INTO version_groups (id, pokeapi_id, slug, name, generation, display_order)
      VALUES (1, 1, 'red-blue', 'Red / Blue', 1, 1)
    `);
  }

  it('non-refresh (existing manual-sync behavior, unchanged): existing row → skipped, zero network calls', async () => {
    seedExistingRow();
    const fetchMock = stubFetch(99, 2);

    const result = await syncVersionGroups(() => {}, false);

    expect(result.skipped).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sqlite.prepare('SELECT * FROM version_groups').all()).toHaveLength(1);
  });

  it('refresh=true: existing row → NOT skipped, does real fetch work', async () => {
    seedExistingRow();
    const fetchMock = stubFetch(99, 2);

    const result = await syncVersionGroups(() => {}, true);

    expect(result.skipped).toBe(false);
    expect(fetchMock).toHaveBeenCalled();
  });

  it('refresh=true: UPSERTs the existing row in place — no duplicate, same primary key, fresh data applied', async () => {
    seedExistingRow();
    stubFetch(99, 2);

    await syncVersionGroups(() => {}, true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = sqlite.prepare('SELECT * FROM version_groups').all() as any[];
    expect(rows).toHaveLength(1); // never a duplicate insert
    expect(rows[0].id).toBe(1); // same row identity preserved
    expect(rows[0].display_order).toBe(99); // updated from the fresh fetch
    expect(rows[0].generation).toBe(2); // updated from the fresh fetch
  });

  it('refresh=true with no pre-existing rows still performs a normal first sync', async () => {
    const fetchMock = stubFetch(1, 1);

    const result = await syncVersionGroups(() => {}, true);

    expect(result.skipped).toBe(false);
    expect(fetchMock).toHaveBeenCalled();
    expect(sqlite.prepare('SELECT * FROM version_groups').all()).toHaveLength(1);
  });
});
