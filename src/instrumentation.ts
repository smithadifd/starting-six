/**
 * Next.js server instrumentation hook — runs exactly once when the
 * production server process boots, before it starts handling requests.
 * https://nextjs.org/docs/app/guides/instrumentation
 *
 * This is the only safe place to arm the optional scheduled re-sync's
 * background poll (src/lib/scheduler). A route handler or page import would
 * be lazy (only run on first request, if ever) and could re-run on every
 * module reload, arming multiple overlapping intervals.
 */
export async function register() {
  // register() runs once per runtime — both the Node.js server runtime and
  // (if configured) the edge runtime. better-sqlite3, and therefore the
  // scheduler that depends on it, only exists in the Node.js runtime.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initScheduler } = await import('@/lib/scheduler');
    initScheduler();
  }
}
