import { describe, it, expect, vi, beforeEach } from 'vitest';
import type BetterSqlite3 from 'better-sqlite3';
import { createTestDb } from './test-helpers';

// Mock the db module to inject test database
vi.mock('@/lib/db', () => ({
  getDb: vi.fn(),
  schema: {},
}));

import { getDb } from '@/lib/db';
import {
  getNextTeamSlot,
  getSyncSchedule,
  setSyncSchedule,
  recordSyncAttempt,
  claimSyncLock,
  releaseSyncLock,
  createSyncLog,
} from './queries';

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

// ===========================================
// Scheduled re-sync config + attempt bookkeeping
// ===========================================

describe('getSyncSchedule / setSyncSchedule', () => {
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    db = createTestDb();
    vi.mocked(getDb).mockReturnValue(db as ReturnType<typeof getDb>);
  });

  it('toggle default off: no row yet returns enabled=false, weekly, no history', () => {
    expect(getSyncSchedule()).toEqual({
      enabled: false,
      frequency: 'weekly',
      lastAttemptAt: null,
      lastAttemptStatus: null,
      lastSuccessAt: null,
      attemptsToday: 0,
      attemptsTodayDate: null,
    });
  });

  it('setSyncSchedule creates the row on first use and persists enabled + frequency', () => {
    setSyncSchedule(true, 'monthly');
    const schedule = getSyncSchedule();
    expect(schedule.enabled).toBe(true);
    expect(schedule.frequency).toBe('monthly');
  });

  it('setSyncSchedule is idempotent — a second call updates the same singleton row, not a duplicate', () => {
    setSyncSchedule(true, 'weekly');
    setSyncSchedule(false, 'monthly');
    expect(getSyncSchedule()).toMatchObject({ enabled: false, frequency: 'monthly' });
  });

  it('toggling enabled does not clobber attempt history recorded earlier', () => {
    recordSyncAttempt('success', new Date('2026-07-01T00:00:00.000Z'));
    setSyncSchedule(true, 'weekly');
    expect(getSyncSchedule().lastSuccessAt).toBe('2026-07-01T00:00:00.000Z');
  });
});

describe('recordSyncAttempt', () => {
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    db = createTestDb();
    vi.mocked(getDb).mockReturnValue(db as ReturnType<typeof getDb>);
  });

  it('first success: sets lastAttemptAt, lastAttemptStatus, lastSuccessAt, and attemptsToday=1', () => {
    const now = new Date('2026-07-18T12:00:00.000Z');
    recordSyncAttempt('success', now);
    expect(getSyncSchedule()).toMatchObject({
      lastAttemptAt: now.toISOString(),
      lastAttemptStatus: 'success',
      lastSuccessAt: now.toISOString(),
      attemptsToday: 1,
      attemptsTodayDate: '2026-07-18',
    });
  });

  it('first failure: sets lastAttemptStatus=failure but leaves lastSuccessAt null', () => {
    const now = new Date('2026-07-18T12:00:00.000Z');
    recordSyncAttempt('failure', now);
    expect(getSyncSchedule()).toMatchObject({
      lastAttemptStatus: 'failure',
      lastSuccessAt: null,
      attemptsToday: 1,
    });
  });

  it('a later failure does not erase an earlier success timestamp', () => {
    recordSyncAttempt('success', new Date('2026-07-11T00:00:00.000Z'));
    recordSyncAttempt('failure', new Date('2026-07-18T00:00:00.000Z'));
    expect(getSyncSchedule()).toMatchObject({
      lastSuccessAt: '2026-07-11T00:00:00.000Z',
      lastAttemptStatus: 'failure',
      lastAttemptAt: '2026-07-18T00:00:00.000Z',
    });
  });

  it('a second attempt the same day increments attemptsToday', () => {
    const morning = new Date('2026-07-18T08:00:00.000Z');
    const evening = new Date('2026-07-18T20:00:00.000Z');
    recordSyncAttempt('failure', morning);
    recordSyncAttempt('failure', evening);
    expect(getSyncSchedule()).toMatchObject({ attemptsToday: 2, attemptsTodayDate: '2026-07-18' });
  });

  it('an attempt on a new day resets the daily counter to 1', () => {
    recordSyncAttempt('failure', new Date('2026-07-17T23:00:00.000Z'));
    recordSyncAttempt('failure', new Date('2026-07-17T23:30:00.000Z'));
    recordSyncAttempt('failure', new Date('2026-07-18T01:00:00.000Z'));
    expect(getSyncSchedule()).toMatchObject({ attemptsToday: 1, attemptsTodayDate: '2026-07-18' });
  });
});

// ===========================================
// Sync lock — mutual exclusion + stale-claim recovery
// ===========================================

describe('claimSyncLock / releaseSyncLock', () => {
  let db: ReturnType<typeof createTestDb>;
  let sqlite: BetterSqlite3.Database;

  beforeEach(() => {
    db = createTestDb();
    sqlite = getSqlite(db);
    vi.mocked(getDb).mockReturnValue(db as ReturnType<typeof getDb>);
  });

  it('first claim on a fresh database succeeds (creates the singleton row)', () => {
    expect(claimSyncLock('manual')).toBe(true);
  });

  it('a second claim while one is already held is rejected, regardless of source', () => {
    expect(claimSyncLock('manual')).toBe(true);
    expect(claimSyncLock('scheduled')).toBe(false);
    expect(claimSyncLock('manual')).toBe(false);
  });

  it('releaseSyncLock frees the lock for the next claimant', () => {
    expect(claimSyncLock('manual')).toBe(true);
    releaseSyncLock();
    expect(claimSyncLock('scheduled')).toBe(true);
  });

  it('releaseSyncLock is safe to call even when no claim is held', () => {
    expect(() => releaseSyncLock()).not.toThrow();
  });

  it('a stale claim (older than the timeout) is reclaimable — container restart mid-sync self-heals', () => {
    expect(claimSyncLock('manual')).toBe(true);
    // Simulate a claim from 45 minutes ago (past the 30-minute staleness window),
    // as if the container crashed mid-sync and never released the lock.
    sqlite.exec(`UPDATE sync_lock SET claimed_at = datetime('now', '-45 minutes') WHERE id = 1`);
    expect(claimSyncLock('scheduled')).toBe(true);
  });

  it('a fresh (non-stale) claim is NOT reclaimable', () => {
    expect(claimSyncLock('manual')).toBe(true);
    sqlite.exec(`UPDATE sync_lock SET claimed_at = datetime('now', '-5 minutes') WHERE id = 1`);
    expect(claimSyncLock('scheduled')).toBe(false);
  });
});

// ===========================================
// createSyncLog — trigger column (manual vs scheduled)
// ===========================================

describe('createSyncLog trigger', () => {
  let db: ReturnType<typeof createTestDb>;
  let sqlite: BetterSqlite3.Database;

  beforeEach(() => {
    db = createTestDb();
    sqlite = getSqlite(db);
    vi.mocked(getDb).mockReturnValue(db as ReturnType<typeof getDb>);
  });

  it('defaults to manual when no trigger is passed (backward compatible)', () => {
    const id = createSyncLog('pokeapi');
    const row = sqlite.prepare('SELECT trigger FROM sync_log WHERE id = ?').get(id) as { trigger: string };
    expect(row.trigger).toBe('manual');
  });

  it('records scheduled when passed explicitly', () => {
    const id = createSyncLog('pokeapi', 'scheduled');
    const row = sqlite.prepare('SELECT trigger FROM sync_log WHERE id = ?').get(id) as { trigger: string };
    expect(row.trigger).toBe('scheduled');
  });
});
