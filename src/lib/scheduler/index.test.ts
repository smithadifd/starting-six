import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SyncScheduleState } from '@/lib/db/queries';

vi.mock('@/lib/sync', () => ({
  runFullSync: vi.fn(),
}));

vi.mock('@/lib/db/queries', () => ({
  claimSyncLock: vi.fn(),
  releaseSyncLock: vi.fn(),
  getSyncSchedule: vi.fn(),
  recordSyncAttemptStart: vi.fn(),
  recordSyncAttemptOutcome: vi.fn(),
}));

vi.mock('@/lib/demo', () => ({
  isDemoMode: vi.fn(() => false),
}));

import { runFullSync } from '@/lib/sync';
import {
  claimSyncLock,
  releaseSyncLock,
  getSyncSchedule,
  recordSyncAttemptStart,
  recordSyncAttemptOutcome,
} from '@/lib/db/queries';
import { isDemoMode } from '@/lib/demo';
import { isSyncDue, runScheduledCheck, FAILURE_BACKOFF_MS } from './index';

const LOCK_TOKEN = 'test-owner-token-1234';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-07-18T12:00:00.000Z');

function state(overrides: Partial<SyncScheduleState> = {}): SyncScheduleState {
  return {
    enabled: true,
    frequency: 'weekly',
    lastAttemptAt: null,
    lastAttemptStatus: null,
    lastSuccessAt: null,
    attemptsToday: 0,
    attemptsTodayDate: null,
    ...overrides,
  };
}

function isoBefore(ms: number): string {
  return new Date(NOW.getTime() - ms).toISOString();
}

// ===========================================
// isSyncDue — pure decision function
// ===========================================

describe('isSyncDue', () => {
  it('toggle off never fires, even if wildly overdue', () => {
    const s = state({ enabled: false, lastSuccessAt: isoBefore(365 * DAY_MS) });
    expect(isSyncDue(s, NOW)).toBe(false);
  });

  it('toggle on, never run before (lastSuccessAt null) → due', () => {
    const s = state({ enabled: true, lastSuccessAt: null });
    expect(isSyncDue(s, NOW)).toBe(true);
  });

  it('weekly: 3 days since last success → not due', () => {
    const s = state({ frequency: 'weekly', lastSuccessAt: isoBefore(3 * DAY_MS) });
    expect(isSyncDue(s, NOW)).toBe(false);
  });

  it('weekly: exactly 6.9 days since last success → not due', () => {
    const s = state({ frequency: 'weekly', lastSuccessAt: isoBefore(6.9 * DAY_MS) });
    expect(isSyncDue(s, NOW)).toBe(false);
  });

  it('weekly: 8 days since last success → due', () => {
    const s = state({ frequency: 'weekly', lastSuccessAt: isoBefore(8 * DAY_MS) });
    expect(isSyncDue(s, NOW)).toBe(true);
  });

  it('monthly: 10 days since last success → not due', () => {
    const s = state({ frequency: 'monthly', lastSuccessAt: isoBefore(10 * DAY_MS) });
    expect(isSyncDue(s, NOW)).toBe(false);
  });

  it('monthly: 31 days since last success → due', () => {
    const s = state({ frequency: 'monthly', lastSuccessAt: isoBefore(31 * DAY_MS) });
    expect(isSyncDue(s, NOW)).toBe(true);
  });

  it('restart scenario: persisted state says overdue → still due after a fresh (post-restart) evaluation', () => {
    // isSyncDue is pure — it never depends on in-memory continuity, so a
    // "restart" is just re-evaluating against the same persisted state.
    const s = state({ frequency: 'weekly', lastSuccessAt: isoBefore(10 * DAY_MS) });
    expect(isSyncDue(s, NOW)).toBe(true);
  });

  it('restart scenario: persisted state says not-due → still waits after a fresh (post-restart) evaluation', () => {
    const s = state({ frequency: 'weekly', lastSuccessAt: isoBefore(2 * DAY_MS) });
    expect(isSyncDue(s, NOW)).toBe(false);
  });

  it('runs once: right after a success, the very next tick is not due yet', () => {
    // Simulates the state written by a successful attempt (start + success outcome) and
    // asks whether the next poll tick (same instant) would re-fire.
    const s = state({ frequency: 'weekly', lastSuccessAt: NOW.toISOString() });
    expect(isSyncDue(s, NOW)).toBe(false);
  });

  it('failure backoff: overdue but failed 2h ago → still in the 6h backoff window', () => {
    const s = state({
      lastSuccessAt: isoBefore(30 * DAY_MS),
      lastAttemptAt: isoBefore(2 * 60 * 60 * 1000),
      lastAttemptStatus: 'failure',
    });
    expect(isSyncDue(s, NOW)).toBe(false);
  });

  it('failure backoff: overdue and failed just over 6h ago → backoff has cleared', () => {
    const s = state({
      lastSuccessAt: isoBefore(30 * DAY_MS),
      lastAttemptAt: isoBefore(FAILURE_BACKOFF_MS + 1000),
      lastAttemptStatus: 'failure',
    });
    expect(isSyncDue(s, NOW)).toBe(true);
  });

  it('a prior success attempt does not trigger the failure backoff', () => {
    const s = state({
      lastSuccessAt: isoBefore(30 * DAY_MS),
      lastAttemptAt: isoBefore(60 * 1000),
      lastAttemptStatus: 'success',
    });
    // lastSuccessAt itself is what's overdue, and a 'success' attempt status
    // never gates on the backoff window (only 'failure' does).
    expect(isSyncDue(s, NOW)).toBe(true);
  });

  it('daily cap: already attempted twice today → no third attempt today, even overdue', () => {
    const s = state({
      lastSuccessAt: isoBefore(30 * DAY_MS),
      attemptsToday: 2,
      attemptsTodayDate: NOW.toISOString().slice(0, 10),
    });
    expect(isSyncDue(s, NOW)).toBe(false);
  });

  it('daily cap resets on a new day', () => {
    const s = state({
      lastSuccessAt: isoBefore(30 * DAY_MS),
      attemptsToday: 2,
      attemptsTodayDate: '2026-07-17', // yesterday relative to NOW
    });
    expect(isSyncDue(s, NOW)).toBe(true);
  });
});

// ===========================================
// runScheduledCheck — orchestration around isSyncDue
// ===========================================

describe('runScheduledCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isDemoMode).mockReturnValue(false);
    vi.mocked(claimSyncLock).mockReturnValue(LOCK_TOKEN);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('toggle off cancels the pending schedule: no claim, no sync, even when wildly overdue', async () => {
    vi.mocked(getSyncSchedule).mockReturnValue(state({ enabled: false, lastSuccessAt: isoBefore(365 * DAY_MS) }));

    await runScheduledCheck(NOW);

    expect(claimSyncLock).not.toHaveBeenCalled();
    expect(runFullSync).not.toHaveBeenCalled();
  });

  it('not due: no claim, no sync', async () => {
    vi.mocked(getSyncSchedule).mockReturnValue(state({ lastSuccessAt: isoBefore(1 * DAY_MS) }));

    await runScheduledCheck(NOW);

    expect(claimSyncLock).not.toHaveBeenCalled();
    expect(runFullSync).not.toHaveBeenCalled();
  });

  it('due + claim succeeds: invokes the same runFullSync code path as manual, with refresh + scheduled trigger', async () => {
    vi.mocked(getSyncSchedule).mockReturnValue(state({ lastSuccessAt: null }));
    vi.mocked(runFullSync).mockResolvedValue({ status: 'success', stages: [], totalProcessed: 10, totalFailed: 0 });

    await runScheduledCheck(NOW);

    expect(claimSyncLock).toHaveBeenCalledWith('scheduled');
    expect(runFullSync).toHaveBeenCalledTimes(1);
    const [, options] = vi.mocked(runFullSync).mock.calls[0];
    expect(options).toEqual({ refresh: true, trigger: 'scheduled' });
    expect(recordSyncAttemptStart).toHaveBeenCalledWith(NOW);
    expect(recordSyncAttemptOutcome).toHaveBeenCalledWith('success', NOW);
    expect(releaseSyncLock).toHaveBeenCalledTimes(1);
  });

  it('OWNER TOKEN: releases with exactly the token the claim returned', async () => {
    vi.mocked(getSyncSchedule).mockReturnValue(state({ lastSuccessAt: null }));
    vi.mocked(runFullSync).mockResolvedValue({ status: 'success', stages: [], totalProcessed: 10, totalFailed: 0 });

    await runScheduledCheck(NOW);

    expect(releaseSyncLock).toHaveBeenCalledWith(LOCK_TOKEN);
  });

  it('CRASH-SAFE ORDER: the attempt is recorded BEFORE the sync starts, not after it returns', async () => {
    vi.mocked(getSyncSchedule).mockReturnValue(state({ lastSuccessAt: null }));
    vi.mocked(runFullSync).mockResolvedValue({ status: 'success', stages: [], totalProcessed: 10, totalFailed: 0 });

    await runScheduledCheck(NOW);

    const startOrder = vi.mocked(recordSyncAttemptStart).mock.invocationCallOrder[0];
    const syncOrder = vi.mocked(runFullSync).mock.invocationCallOrder[0];
    expect(startOrder).toBeLessThan(syncOrder);
  });

  it('REVALIDATION: toggle-off lands between the eligibility read and the claim → releases and skips, no sync, no attempt burned', async () => {
    // First read (pre-claim eligibility): enabled + overdue. Second read
    // (post-claim revalidation): a concurrent PUT turned the toggle off.
    vi.mocked(getSyncSchedule)
      .mockReturnValueOnce(state({ lastSuccessAt: null }))
      .mockReturnValueOnce(state({ enabled: false, lastSuccessAt: null }));

    await runScheduledCheck(NOW);

    expect(claimSyncLock).toHaveBeenCalledTimes(1);
    expect(getSyncSchedule).toHaveBeenCalledTimes(2); // the post-claim re-read happened
    expect(runFullSync).not.toHaveBeenCalled();
    expect(recordSyncAttemptStart).not.toHaveBeenCalled(); // a skipped tick costs no attempt
    expect(releaseSyncLock).toHaveBeenCalledWith(LOCK_TOKEN); // claimed, so it must release
  });

  it('REVALIDATION: no-longer-due (e.g. a manual sync succeeded while we raced to claim) → releases and skips', async () => {
    vi.mocked(getSyncSchedule)
      .mockReturnValueOnce(state({ lastSuccessAt: isoBefore(8 * DAY_MS) })) // stale read: overdue
      .mockReturnValueOnce(state({ lastSuccessAt: NOW.toISOString() })); // fresh read: just synced

    await runScheduledCheck(NOW);

    expect(runFullSync).not.toHaveBeenCalled();
    expect(recordSyncAttemptStart).not.toHaveBeenCalled();
    expect(releaseSyncLock).toHaveBeenCalledWith(LOCK_TOKEN);
  });

  it('due but another sync already holds the claim: does not run, does not release a lock it never held', async () => {
    vi.mocked(getSyncSchedule).mockReturnValue(state({ lastSuccessAt: null }));
    vi.mocked(claimSyncLock).mockReturnValue(null);

    await runScheduledCheck(NOW);

    expect(runFullSync).not.toHaveBeenCalled();
    expect(releaseSyncLock).not.toHaveBeenCalled();
  });

  it('sync completes with status "error": outcome recorded as failure (drives backoff)', async () => {
    vi.mocked(getSyncSchedule).mockReturnValue(state({ lastSuccessAt: null }));
    vi.mocked(runFullSync).mockResolvedValue({ status: 'error', stages: [], totalProcessed: 0, totalFailed: 5 });

    await runScheduledCheck(NOW);

    expect(recordSyncAttemptStart).toHaveBeenCalledWith(NOW);
    expect(recordSyncAttemptOutcome).toHaveBeenCalledWith('failure', NOW);
    expect(releaseSyncLock).toHaveBeenCalledTimes(1);
  });

  it('sync completes with status "partial": outcome recorded as success (some data landed)', async () => {
    vi.mocked(getSyncSchedule).mockReturnValue(state({ lastSuccessAt: null }));
    vi.mocked(runFullSync).mockResolvedValue({ status: 'partial', stages: [], totalProcessed: 8, totalFailed: 2 });

    await runScheduledCheck(NOW);

    expect(recordSyncAttemptOutcome).toHaveBeenCalledWith('success', NOW);
  });

  it('runFullSync throws: the pessimistic start record already marked the failure — no outcome write, lock still released', async () => {
    vi.mocked(getSyncSchedule).mockReturnValue(state({ lastSuccessAt: null }));
    vi.mocked(runFullSync).mockRejectedValue(new Error('network exploded'));

    await runScheduledCheck(NOW);

    expect(recordSyncAttemptStart).toHaveBeenCalledWith(NOW); // attempt on record BEFORE the throw
    expect(recordSyncAttemptOutcome).not.toHaveBeenCalled(); // start's 'failure' is already the truth
    expect(releaseSyncLock).toHaveBeenCalledWith(LOCK_TOKEN);
  });

  it('DEMO_MODE=true refuses to run even when due (defense in depth alongside initScheduler)', async () => {
    vi.mocked(isDemoMode).mockReturnValue(true);
    vi.mocked(getSyncSchedule).mockReturnValue(state({ lastSuccessAt: null }));

    await runScheduledCheck(NOW);

    expect(getSyncSchedule).not.toHaveBeenCalled();
    expect(claimSyncLock).not.toHaveBeenCalled();
    expect(runFullSync).not.toHaveBeenCalled();
  });
});

// ===========================================
// initScheduler — arming, and DEMO-MODE inertness at arm time
// ===========================================
//
// Each test imports a fresh module instance (vi.resetModules + dynamic
// import) so the module-scoped "already armed" guard in src/lib/scheduler
// doesn't leak state between these two cases.

describe('initScheduler', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('DEMO_MODE=true: explicitly refuses to arm — no timer is ever scheduled', async () => {
    vi.resetModules();
    vi.doMock('@/lib/demo', () => ({ isDemoMode: () => true }));
    vi.doMock('@/lib/sync', () => ({ runFullSync: vi.fn() }));
    vi.doMock('@/lib/db/queries', () => ({
      claimSyncLock: vi.fn(),
      releaseSyncLock: vi.fn(),
      getSyncSchedule: vi.fn(),
      recordSyncAttemptStart: vi.fn(),
      recordSyncAttemptOutcome: vi.fn(),
    }));

    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    const { initScheduler } = await import('./index');

    initScheduler();

    expect(setTimeoutSpy).not.toHaveBeenCalled();
  });

  it('DEMO_MODE=false: arms the poll loop', async () => {
    vi.resetModules();
    vi.doMock('@/lib/demo', () => ({ isDemoMode: () => false }));
    vi.doMock('@/lib/sync', () => ({ runFullSync: vi.fn() }));
    vi.doMock('@/lib/db/queries', () => ({
      claimSyncLock: vi.fn(),
      releaseSyncLock: vi.fn(),
      getSyncSchedule: vi.fn(),
      recordSyncAttemptStart: vi.fn(),
      recordSyncAttemptOutcome: vi.fn(),
    }));

    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    const { initScheduler } = await import('./index');

    initScheduler();

    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
  });

  it('calling it twice in the same process only arms once (defensive against double-init)', async () => {
    vi.resetModules();
    vi.doMock('@/lib/demo', () => ({ isDemoMode: () => false }));
    vi.doMock('@/lib/sync', () => ({ runFullSync: vi.fn() }));
    vi.doMock('@/lib/db/queries', () => ({
      claimSyncLock: vi.fn(),
      releaseSyncLock: vi.fn(),
      getSyncSchedule: vi.fn(),
      recordSyncAttemptStart: vi.fn(),
      recordSyncAttemptOutcome: vi.fn(),
    }));

    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    const { initScheduler } = await import('./index');

    initScheduler();
    initScheduler();

    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
  });
});
