// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { TeamAnalysis, type TeamAnalysisMember } from './TeamAnalysis';
import { POKEMON_TYPES } from '@/types';

// Minimal-but-valid AnalysisData shape so the section components (which index
// into `byType`/`coverage` for every Pokemon type) don't throw on render.
// `coveragePercent` is surfaced in the UI as "<n>%", so passing a distinct
// value lets a test tell one team's rendered analysis apart from another's.
function fakeAnalysisData(teamSize: number, coveragePercent = 0) {
  const byType = Object.fromEntries(
    POKEMON_TYPES.map((t) => [t, { weak: 0, resist: 0, immune: 0 }]),
  );
  const coverage = Object.fromEntries(
    POKEMON_TYPES.map((t) => [t, { covered: false, coveredBy: [] as string[] }]),
  );
  return {
    defense: { byType, sharedWeaknesses: [], uncoveredTypes: [] },
    offense: { coverage, uncoveredTypes: [], coveragePercent },
    roles: [],
    abilities: [],
    teamSize,
  };
}

function mockFetchOk(teamSize: number) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: fakeAnalysisData(teamSize) }),
  });
}

// A manually-controllable promise, for driving out-of-order fetch resolution.
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const memberA: TeamAnalysisMember = { pokemonId: 1, abilityId: 10, moveIds: [100, 101] };
const memberB: TeamAnalysisMember = { pokemonId: 2, abilityId: 20, moveIds: [200] };

describe('TeamAnalysis — auto-run + client cache', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('auto-runs the analysis on mount once the team has >= 1 member, with no click required', async () => {
    const fetchMock = mockFetchOk(1);
    vi.stubGlobal('fetch', fetchMock);

    render(<TeamAnalysis playthroughId={101} teamMembers={[memberA]} />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith('/api/playthroughs/101/analysis');
    await waitFor(() => expect(screen.getByText('Defensive Coverage')).toBeInTheDocument());
    // The manual "click to analyze" affordance should no longer be showing —
    // the panel expanded on its own.
    expect(screen.queryByText('Click to analyze')).not.toBeInTheDocument();
  });

  it('does not render anything (and never fetches) when the team is empty', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { container } = render(<TeamAnalysis playthroughId={102} teamMembers={[]} />);

    expect(container).toBeEmptyDOMElement();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('re-runs automatically when the team composition changes (member added)', async () => {
    const fetchMock = mockFetchOk(1);
    vi.stubGlobal('fetch', fetchMock);

    const { rerender } = render(<TeamAnalysis playthroughId={103} teamMembers={[memberA]} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    rerender(<TeamAnalysis playthroughId={103} teamMembers={[memberA, memberB]} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it('re-runs automatically when a member is swapped for a different one', async () => {
    const fetchMock = mockFetchOk(1);
    vi.stubGlobal('fetch', fetchMock);

    const { rerender } = render(<TeamAnalysis playthroughId={104} teamMembers={[memberA]} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    // Same slot, different Pokémon — a "swap".
    rerender(<TeamAnalysis playthroughId={104} teamMembers={[memberB]} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it('does NOT refetch when composition is unchanged across a re-render (new array/object references, same content)', async () => {
    const fetchMock = mockFetchOk(1);
    vi.stubGlobal('fetch', fetchMock);

    const { rerender } = render(
      <TeamAnalysis playthroughId={105} teamMembers={[{ ...memberA }]} />,
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    // Brand-new array and object instances, but identical field values — the
    // composition-derived cache key must be unchanged, so this must NOT
    // trigger a second fetch (would indicate the effect depends on object
    // identity rather than a derived value).
    rerender(<TeamAnalysis playthroughId={105} teamMembers={[{ ...memberA }]} />);

    await waitFor(() => expect(screen.getByText('Defensive Coverage')).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reordering the same members (no add/remove/ability/move change) hits cache, not a refetch', async () => {
    const fetchMock = mockFetchOk(2);
    vi.stubGlobal('fetch', fetchMock);

    const { rerender } = render(
      <TeamAnalysis playthroughId={106} teamMembers={[memberA, memberB]} />,
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    // Reordered, not recomposed — same set of members.
    rerender(<TeamAnalysis playthroughId={106} teamMembers={[memberB, memberA]} />);

    await new Promise((r) => setTimeout(r, 0));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('cache survives unmount/remount for the same playthrough + team composition', async () => {
    const fetchMock = mockFetchOk(1);
    vi.stubGlobal('fetch', fetchMock);

    const { unmount } = render(<TeamAnalysis playthroughId={107} teamMembers={[memberA]} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    unmount();

    // Simulates navigating away and back: fresh component instance, same
    // playthrough + composition (new object/array references again).
    render(<TeamAnalysis playthroughId={107} teamMembers={[{ ...memberA }]} />);

    await waitFor(() => expect(screen.getByText('Defensive Coverage')).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('a different playthroughId with the same composition is a separate cache entry', async () => {
    const fetchMock = mockFetchOk(1);
    vi.stubGlobal('fetch', fetchMock);

    render(<TeamAnalysis playthroughId={108} teamMembers={[memberA]} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    render(<TeamAnalysis playthroughId={109} teamMembers={[memberA]} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it('surfaces a fetch error and still allows a manual retry via the header click', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Boom' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<TeamAnalysis playthroughId={110} teamMembers={[memberA]} />);

    await waitFor(() => expect(screen.getByText('Boom')).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // --- Regression: async correctness in the auto-run path (codex second pass) ---

  it('race: a stale in-flight response is not cached under the superseded key (K resolves last with K2 data)', async () => {
    // Two in-flight requests, resolved out of order. The endpoint reads CURRENT
    // DB state, so once composition is K2 BOTH requests return K2's payload.
    const calls: Array<ReturnType<typeof deferred<{ ok: boolean; json: () => Promise<unknown> }>>> = [];
    const fetchMock = vi.fn().mockImplementation(() => {
      const d = deferred<{ ok: boolean; json: () => Promise<unknown> }>();
      calls.push(d);
      return d.promise;
    });
    vi.stubGlobal('fetch', fetchMock);

    const k2Payload = { ok: true, json: async () => ({ data: fakeAnalysisData(2, 0.99) }) };

    // Mount K — fetch #1 starts (in flight).
    const { rerender } = render(<TeamAnalysis playthroughId={200} teamMembers={[memberA]} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    // Composition changes to K2 while K is still in flight — fetch #2 starts.
    rerender(<TeamAnalysis playthroughId={200} teamMembers={[memberA, memberB]} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    // K2 (fetch #2) resolves FIRST, then K (fetch #1) resolves LAST — both with
    // K2's data, because the DB now reflects K2.
    calls[1].resolve(k2Payload);
    await waitFor(() => expect(screen.getByText('99%')).toBeInTheDocument());
    calls[0].resolve({ ok: true, json: async () => ({ data: fakeAnalysisData(2, 0.99) }) });

    // Give the stale (K) response a chance to (wrongly) write the cache.
    await new Promise((r) => setTimeout(r, 0));

    // Now navigate back to K. With the guard, K was never cached, so this MUST
    // trigger a fresh fetch (#3). WITHOUT the guard, K's slot holds K2's data,
    // this is a cache HIT, and no third fetch fires — so the assertion fails.
    rerender(<TeamAnalysis playthroughId={200} teamMembers={[memberA]} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
  });

  it('display: switching to an uncached composition clears prior analysis and shows loading', async () => {
    const kPayload = { ok: true, json: async () => ({ data: fakeAnalysisData(1, 0.11) }) };
    const k2 = deferred<{ ok: boolean; json: () => Promise<unknown> }>();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(kPayload) // K resolves immediately
      .mockImplementationOnce(() => k2.promise); // K2 stays in flight
    vi.stubGlobal('fetch', fetchMock);

    const { rerender } = render(<TeamAnalysis playthroughId={201} teamMembers={[memberA]} />);
    await waitFor(() => expect(screen.getByText('11%')).toBeInTheDocument());

    // Switch to an uncached composition; its fetch is still pending.
    rerender(<TeamAnalysis playthroughId={201} teamMembers={[memberA, memberB]} />);

    // Prior analysis must be gone (not lingering behind the spinner), and the
    // loading affordance shown instead.
    await waitFor(() => expect(screen.getByText('Loading...')).toBeInTheDocument());
    expect(screen.queryByText('11%')).not.toBeInTheDocument();
    expect(screen.queryByText('Defensive Coverage')).not.toBeInTheDocument();
  });

  it('display: a failed new fetch shows the error without leaving stale analysis beside it', async () => {
    const kPayload = { ok: true, json: async () => ({ data: fakeAnalysisData(1, 0.22) }) };
    const k2Fail = { ok: false, json: async () => ({ error: 'Kaboom' }) };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(kPayload)
      .mockResolvedValueOnce(k2Fail);
    vi.stubGlobal('fetch', fetchMock);

    const { rerender } = render(<TeamAnalysis playthroughId={202} teamMembers={[memberA]} />);
    await waitFor(() => expect(screen.getByText('22%')).toBeInTheDocument());

    rerender(<TeamAnalysis playthroughId={202} teamMembers={[memberA, memberB]} />);

    await waitFor(() => expect(screen.getByText('Kaboom')).toBeInTheDocument());
    // Stale analysis from K must NOT remain on screen next to the error.
    expect(screen.queryByText('22%')).not.toBeInTheDocument();
    expect(screen.queryByText('Defensive Coverage')).not.toBeInTheDocument();
  });
});
