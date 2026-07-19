import { runFullSync } from '@/lib/sync';
import {
  claimSyncLock,
  releaseSyncLock,
  getSyncSchedule,
  recordSyncAttemptStart,
  recordSyncAttemptOutcome,
} from '@/lib/db/queries';
import type { SyncScheduleState } from '@/lib/db/queries';
import { isDemoMode } from '@/lib/demo';

/**
 * Optional scheduled PokéAPI re-sync (off by default — see Settings > System).
 *
 * Design: a single long-lived hourly poll, not a timer that gets
 * armed/disarmed when the toggle flips. Every tick re-reads the schedule
 * config from SQLite and asks "is a sync due right now?" — so a restart,
 * DST transition, or clock drift can never desync it from persisted state,
 * and flipping the toggle off simply means the next tick is a no-op (it
 * never touches an already-running sync — see claimSyncLock).
 */

export const FREQUENCY_DAYS = { weekly: 7, monthly: 30 } as const;

/** After a failed scheduled attempt, wait at least this long before trying again. */
export const FAILURE_BACKOFF_MS = 6 * 60 * 60 * 1000;

/** Hard ceiling on scheduled attempts per calendar day (UTC), regardless of failures. */
export const MAX_ATTEMPTS_PER_DAY = 2;

/** How often the scheduler checks whether a run is due. Cheap — just reads one SQLite row. */
export const POLL_INTERVAL_MS = 60 * 60 * 1000;

/** Give the server a moment to finish booting before the first check. */
const INITIAL_DELAY_MS = 30 * 1000;

/**
 * Pure decision function — no I/O, so it's fully unit-testable without a
 * database or fake timers. `now` is injectable for deterministic tests.
 */
export function isSyncDue(state: SyncScheduleState, now: Date = new Date()): boolean {
  if (!state.enabled) return false;

  const intervalMs = FREQUENCY_DAYS[state.frequency] * 24 * 60 * 60 * 1000;
  const sinceSuccessMs = state.lastSuccessAt
    ? now.getTime() - new Date(state.lastSuccessAt).getTime()
    : Number.POSITIVE_INFINITY;
  if (sinceSuccessMs < intervalMs) return false;

  if (state.lastAttemptStatus === 'failure' && state.lastAttemptAt) {
    const sinceAttemptMs = now.getTime() - new Date(state.lastAttemptAt).getTime();
    if (sinceAttemptMs < FAILURE_BACKOFF_MS) return false;
  }

  const today = now.toISOString().slice(0, 10);
  if (state.attemptsTodayDate === today && state.attemptsToday >= MAX_ATTEMPTS_PER_DAY) {
    return false;
  }

  return true;
}

/**
 * Runs one scheduler poll: check whether a re-sync is due and, if so, run it.
 * Safe to call directly in tests — it's the same function the interval below
 * invokes on every tick.
 */
export async function runScheduledCheck(now: Date = new Date()): Promise<void> {
  // Defense in depth: initScheduler() already refuses to arm the interval
  // that calls this, but this guard keeps the function itself inert too.
  if (isDemoMode()) return;

  let schedule;
  try {
    schedule = getSyncSchedule();
  } catch (err) {
    console.error('[scheduler] Failed to read schedule config:', err);
    return;
  }

  if (!isSyncDue(schedule, now)) return;

  // Shared coordinator with the manual sync route — if a manual sync (or,
  // in theory, an overlapping tick) is already running, skip this tick and
  // let the next hourly check re-evaluate. Never aborts an in-flight sync.
  // The returned owner token is required to release: if THIS run overstays
  // the stale-claim timeout and its claim gets stolen, our release below
  // no-ops instead of clearing the thief's (i.e. the new owner's) lock.
  const lockToken = claimSyncLock('scheduled');
  if (!lockToken) return;

  try {
    // Revalidate UNDER the lock: the eligibility read above raced with any
    // concurrent writes — a toggle-off PUT, or a manual sync completing —
    // that may have landed between that read and the claim. Only this
    // post-claim read is authoritative; if it says disabled or no longer
    // due, release and skip without recording an attempt.
    const fresh = getSyncSchedule();
    if (!isSyncDue(fresh, now)) return;

    // Record the attempt BEFORE the long fetch (pessimistically marked as a
    // failure until proven otherwise). If the container crashes/OOMs
    // mid-sync there is still an attempt on record, so after restart the 6h
    // failure backoff + daily cap hold instead of an immediate
    // stale-lock-reclaim + full PokéAPI refetch loop.
    recordSyncAttemptStart(now);

    console.log('[scheduler] Starting scheduled PokéAPI refresh sync...');
    const result = await runFullSync(() => {}, { refresh: true, trigger: 'scheduled' });
    recordSyncAttemptOutcome(result.status === 'error' ? 'failure' : 'success', now);
    console.log(`[scheduler] Scheduled sync finished with status=${result.status}`);
  } catch (err) {
    // No outcome write needed: recordSyncAttemptStart already persisted a
    // pessimistic 'failure' attempt, which is exactly the truth here.
    console.error('[scheduler] Scheduled sync threw:', err);
  } finally {
    releaseSyncLock(lockToken);
  }
}

let armed = false;

/**
 * Arms the scheduler's poll loop. Call exactly once, from the server
 * lifecycle hook (src/instrumentation.ts) — never from a route or page
 * import, which would re-run lazily on first request and could arm the
 * interval more than once.
 *
 * Inert when DEMO_MODE=true: the public demo never runs a background
 * refetch (and its 300MB memory budget has no room for one).
 */
export function initScheduler(): void {
  if (isDemoMode()) {
    console.log('[scheduler] DEMO_MODE=true — scheduled re-sync disabled.');
    return;
  }
  if (armed) return;
  armed = true;

  console.log(`[scheduler] Poll loop armed — checking every ${POLL_INTERVAL_MS / 60_000}m for a due re-sync.`);
  const timer = setTimeout(() => {
    void runScheduledCheck();
    setInterval(() => {
      void runScheduledCheck();
    }, POLL_INTERVAL_MS).unref?.();
  }, INITIAL_DELAY_MS);
  timer.unref?.();
}
