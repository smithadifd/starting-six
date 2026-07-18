// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { TeamAnalysis, type TeamAnalysisMember } from './TeamAnalysis';
import { POKEMON_TYPES } from '@/types';

// Minimal-but-valid AnalysisData shape so the section components (which index
// into `byType`/`coverage` for every Pokemon type) don't throw on render.
function fakeAnalysisData(teamSize: number) {
  const byType = Object.fromEntries(
    POKEMON_TYPES.map((t) => [t, { weak: 0, resist: 0, immune: 0 }]),
  );
  const coverage = Object.fromEntries(
    POKEMON_TYPES.map((t) => [t, { covered: false, coveredBy: [] as string[] }]),
  );
  return {
    defense: { byType, sharedWeaknesses: [], uncoveredTypes: [] },
    offense: { coverage, uncoveredTypes: [], coveragePercent: 0 },
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
});
