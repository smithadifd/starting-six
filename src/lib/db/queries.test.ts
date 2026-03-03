import { describe, it, expect, vi, beforeEach } from 'vitest';
import type BetterSqlite3 from 'better-sqlite3';
import { createTestDb } from './test-helpers';

// Mock the db module to inject test database
vi.mock('@/lib/db', () => ({
  getDb: vi.fn(),
  schema: {},
}));

import { getDb } from '@/lib/db';
import { getNextTeamSlot } from './queries';

function getSqlite(db: ReturnType<typeof createTestDb>): BetterSqlite3.Database {
  // Access the underlying better-sqlite3 instance
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (db as any).$client;
}

describe('getNextTeamSlot', () => {
  let db: ReturnType<typeof createTestDb>;
  let sqlite: BetterSqlite3.Database;

  beforeEach(() => {
    db = createTestDb();
    sqlite = getSqlite(db);
    vi.mocked(getDb).mockReturnValue(db as ReturnType<typeof getDb>);

    // Seed a version group and playthrough for team members
    sqlite.exec(
      `INSERT INTO version_groups (id, pokeapi_id, slug, name, generation, display_order) VALUES (1, 1, 'red-blue', 'Red / Blue', 1, 1)`
    );
    sqlite.exec(
      `INSERT INTO playthroughs (id, user_id, name, version_group_id) VALUES (1, 'user1', 'Test Run', 1)`
    );
    // Seed a pokemon for FK references
    sqlite.exec(
      `INSERT INTO pokemon (id, pokeapi_id, species_id, slug, name, species_name, type_one) VALUES (1, 25, 25, 'pikachu', 'Pikachu', 'Pikachu', 'electric')`
    );
  });

  function addMember(slot: number) {
    sqlite.exec(
      `INSERT INTO team_members (playthrough_id, pokemon_id, slot) VALUES (1, 1, ${slot})`
    );
  }

  it('no members yet returns 1', () => {
    expect(getNextTeamSlot(1)).toBe(1);
  });

  it('slot 1 taken returns 2', () => {
    addMember(1);
    expect(getNextTeamSlot(1)).toBe(2);
  });

  it('slots 1, 2 taken returns 3', () => {
    addMember(1);
    addMember(2);
    expect(getNextTeamSlot(1)).toBe(3);
  });

  it('slots 1-5 taken returns 6', () => {
    for (let s = 1; s <= 5; s++) addMember(s);
    expect(getNextTeamSlot(1)).toBe(6);
  });

  it('all 6 slots taken returns null (team full)', () => {
    for (let s = 1; s <= 6; s++) addMember(s);
    expect(getNextTeamSlot(1)).toBeNull();
  });

  it('gap at slot 2 (slots 1, 3 taken) returns 2', () => {
    addMember(1);
    addMember(3);
    expect(getNextTeamSlot(1)).toBe(2);
  });
});
