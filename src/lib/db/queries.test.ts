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
  recordSyncAttemptStart,
  recordSyncAttemptOutcome,
  claimSyncLock,
  releaseSyncLock,
  createSyncLog,
} from './queries';
// Pure decision function — imported here (real, unmocked) for the
// crash-recovery integration tests: they assert that the state persisted by
// recordSyncAttemptStart alone is enough for the backoff to hold.
import { isSyncDue, FAILURE_BACKOFF_MS } from '@/lib/scheduler';

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
    recordSyncAttemptStart(new Date('2026-07-01T00:00:00.000Z'));
    recordSyncAttemptOutcome('success', new Date('2026-07-01T00:00:00.000Z'));
    setSyncSchedule(true, 'weekly');
    expect(getSyncSchedule().lastSuccessAt).toBe('2026-07-01T00:00:00.000Z');
  });
});

describe('recordSyncAttemptStart / recordSyncAttemptOutcome', () => {
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    db = createTestDb();
    vi.mocked(getDb).mockReturnValue(db as ReturnType<typeof getDb>);
  });

  it('start: sets lastAttemptAt + attemptsToday=1 and a PESSIMISTIC failure status before any sync work', () => {
    const now = new Date('2026-07-18T12:00:00.000Z');
    recordSyncAttemptStart(now);
    expect(getSyncSchedule()).toMatchObject({
      lastAttemptAt: now.toISOString(),
      lastAttemptStatus: 'failure',
      lastSuccessAt: null,
      attemptsToday: 1,
      attemptsTodayDate: '2026-07-18',
    });
  });

  it('start then success outcome: flips status to success and stamps lastSuccessAt', () => {
    const now = new Date('2026-07-18T12:00:00.000Z');
    const done = new Date('2026-07-18T12:20:00.000Z');
    recordSyncAttemptStart(now);
    recordSyncAttemptOutcome('success', done);
    expect(getSyncSchedule()).toMatchObject({
      lastAttemptAt: now.toISOString(), // start time preserved — the outcome never rewrites it
      lastAttemptStatus: 'success',
      lastSuccessAt: done.toISOString(),
      attemptsToday: 1,
    });
  });

  it('start then failure outcome: stays a failure and leaves lastSuccessAt null', () => {
    const now = new Date('2026-07-18T12:00:00.000Z');
    recordSyncAttemptStart(now);
    recordSyncAttemptOutcome('failure', now);
    expect(getSyncSchedule()).toMatchObject({
      lastAttemptStatus: 'failure',
      lastSuccessAt: null,
      attemptsToday: 1,
    });
  });

  it('a later failed attempt does not erase an earlier success timestamp', () => {
    recordSyncAttemptStart(new Date('2026-07-11T00:00:00.000Z'));
    recordSyncAttemptOutcome('success', new Date('2026-07-11T00:10:00.000Z'));
    recordSyncAttemptStart(new Date('2026-07-18T00:00:00.000Z'));
    recordSyncAttemptOutcome('failure', new Date('2026-07-18T00:10:00.000Z'));
    expect(getSyncSchedule()).toMatchObject({
      lastSuccessAt: '2026-07-11T00:10:00.000Z',
      lastAttemptStatus: 'failure',
      lastAttemptAt: '2026-07-18T00:00:00.000Z',
    });
  });

  it('a second attempt the same day increments attemptsToday (counted at START, not completion)', () => {
    recordSyncAttemptStart(new Date('2026-07-18T08:00:00.000Z'));
    recordSyncAttemptStart(new Date('2026-07-18T20:00:00.000Z'));
    expect(getSyncSchedule()).toMatchObject({ attemptsToday: 2, attemptsTodayDate: '2026-07-18' });
  });

  it('an attempt on a new day resets the daily counter to 1', () => {
    recordSyncAttemptStart(new Date('2026-07-17T23:00:00.000Z'));
    recordSyncAttemptStart(new Date('2026-07-17T23:30:00.000Z'));
    recordSyncAttemptStart(new Date('2026-07-18T01:00:00.000Z'));
    expect(getSyncSchedule()).toMatchObject({ attemptsToday: 1, attemptsTodayDate: '2026-07-18' });
  });

  it('outcome never touches the daily counter', () => {
    recordSyncAttemptStart(new Date('2026-07-18T08:00:00.000Z'));
    recordSyncAttemptOutcome('failure', new Date('2026-07-18T08:10:00.000Z'));
    recordSyncAttemptOutcome('failure', new Date('2026-07-18T08:11:00.000Z'));
    expect(getSyncSchedule()).toMatchObject({ attemptsToday: 1 });
  });

  it('CRASH RECOVERY: start recorded, sync crashes (no outcome, no release) → next tick within 6h is NOT due', () => {
    // The coordinator scenario: attempt bookkeeping lands BEFORE the fetch,
    // so a crash/OOM mid-sync still leaves a pessimistic failure attempt on
    // record — the restart loop cannot bypass the backoff by dying early.
    const start = new Date('2026-07-18T12:00:00.000Z');
    setSyncSchedule(true, 'weekly'); // enabled, and lastSuccessAt=null means overdue
    recordSyncAttemptStart(start);
    // ...container crashes here: no recordSyncAttemptOutcome, no releaseSyncLock.

    const twoHoursLater = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    expect(isSyncDue(getSyncSchedule(), twoHoursLater)).toBe(false); // backoff holds

    const pastBackoff = new Date(start.getTime() + FAILURE_BACKOFF_MS + 60 * 1000);
    expect(isSyncDue(getSyncSchedule(), pastBackoff)).toBe(true); // then recovers
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

  it('first claim on a fresh database succeeds and returns an owner token (creates the singleton row)', () => {
    const token = claimSyncLock('manual');
    expect(token).toBeTypeOf('string');
    expect(token!.length).toBeGreaterThan(0);
  });

  it('each successful claim gets a distinct owner token', () => {
    const t1 = claimSyncLock('manual');
    releaseSyncLock(t1!);
    const t2 = claimSyncLock('manual');
    expect(t2).not.toBeNull();
    expect(t2).not.toBe(t1);
  });

  it('a second claim while one is already held is rejected (null), regardless of source', () => {
    expect(claimSyncLock('manual')).not.toBeNull();
    expect(claimSyncLock('scheduled')).toBeNull();
    expect(claimSyncLock('manual')).toBeNull();
  });

  it('releaseSyncLock with the owner token frees the lock for the next claimant', () => {
    const token = claimSyncLock('manual');
    expect(token).not.toBeNull();
    releaseSyncLock(token!);
    expect(claimSyncLock('scheduled')).not.toBeNull();
  });

  it('releaseSyncLock with a WRONG token is a no-op — the lock stays held', () => {
    expect(claimSyncLock('manual')).not.toBeNull();
    releaseSyncLock('not-the-owner-token');
    expect(claimSyncLock('scheduled')).toBeNull();
  });

  it('releaseSyncLock is safe to call even when no claim is held', () => {
    expect(() => releaseSyncLock('any-token')).not.toThrow();
  });

  it('a stale claim (older than the timeout) is reclaimable — container restart mid-sync self-heals', () => {
    expect(claimSyncLock('manual')).not.toBeNull();
    // Simulate a claim from 45 minutes ago (past the 30-minute staleness window),
    // as if the container crashed mid-sync and never released the lock.
    sqlite.exec(`UPDATE sync_lock SET claimed_at = datetime('now', '-45 minutes') WHERE id = 1`);
    expect(claimSyncLock('scheduled')).not.toBeNull();
  });

  it('a fresh (non-stale) claim is NOT reclaimable', () => {
    expect(claimSyncLock('manual')).not.toBeNull();
    sqlite.exec(`UPDATE sync_lock SET claimed_at = datetime('now', '-5 minutes') WHERE id = 1`);
    expect(claimSyncLock('scheduled')).toBeNull();
  });

  it('OWNER-TOKEN SAFETY: steal-after-expiry, then the stale owner releases → the new owner\'s claim SURVIVES', () => {
    // The coordinator scenario: a slow sync exceeds the 30-minute staleness
    // window while still running. The scheduler steals the stale claim. The
    // original sync then finishes and calls release with ITS token — which
    // must NOT clear the new owner's lock, or a third sync could start
    // concurrently with the stolen-into sync.
    const staleOwnerToken = claimSyncLock('manual');
    expect(staleOwnerToken).not.toBeNull();

    // The manual sync overstays the timeout (still running, just slow).
    sqlite.exec(`UPDATE sync_lock SET claimed_at = datetime('now', '-45 minutes') WHERE id = 1`);

    // Scheduler steals the stale claim and becomes the new owner.
    const newOwnerToken = claimSyncLock('scheduled');
    expect(newOwnerToken).not.toBeNull();
    expect(newOwnerToken).not.toBe(staleOwnerToken);

    // The original (stale) owner finally finishes and releases with its token.
    releaseSyncLock(staleOwnerToken!);

    // The new owner's claim survived: a third claimant is still rejected...
    expect(claimSyncLock('manual')).toBeNull();
    // ...and the row still carries the new owner's identity, untouched.
    const row = sqlite.prepare('SELECT claimed_by, claim_token FROM sync_lock WHERE id = 1').get() as {
      claimed_by: string;
      claim_token: string;
    };
    expect(row.claimed_by).toBe('scheduled');
    expect(row.claim_token).toBe(newOwnerToken);

    // Only the new owner's token releases it.
    releaseSyncLock(newOwnerToken!);
    expect(claimSyncLock('manual')).not.toBeNull();
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
