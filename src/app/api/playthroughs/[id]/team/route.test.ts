import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth-helpers', () => ({ requireUserIdFromRequest: vi.fn() }));
vi.mock('@/lib/db/queries', () => ({
  getPlaythrough: vi.fn(), getTeamMembers: vi.fn(), addTeamMember: vi.fn(),
  getNextTeamSlot: vi.fn(), getPokemonById: vi.fn(),
}));

import { requireUserIdFromRequest } from '@/lib/auth-helpers';
import { getPlaythrough, getTeamMembers } from '@/lib/db/queries';
import { GET, POST } from './route';

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const get = () => new Request('http://localhost/api/playthroughs/1/team');
const post = (body: unknown) => new Request('http://localhost/api/playthroughs/1/team', { method: 'POST', body: JSON.stringify(body) });

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(requireUserIdFromRequest).mockResolvedValue('user-1');
  vi.mocked(getPlaythrough).mockReturnValue({ id: 1 } as ReturnType<typeof getPlaythrough>);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('team route errors', () => {
  it('GET rejects invalid playthrough IDs with 400', async () => {
    const response = await GET(get(), params('invalid'));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid playthrough ID' });
    expect(getPlaythrough).not.toHaveBeenCalled();
  });

  it('POST rejects invalid team member data with 400', async () => {
    const response = await POST(post({ pokemonId: 0 }), params('1'));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain('pokemonId:');
    expect(getPlaythrough).not.toHaveBeenCalled();
  });

  it('GET returns 404 for an absent playthrough', async () => {
    vi.mocked(getPlaythrough).mockReturnValue(undefined);
    const response = await GET(get(), params('1'));
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Playthrough not found' });
    expect(getTeamMembers).not.toHaveBeenCalled();
  });

  it('GET returns 500 when the team query fails', async () => {
    vi.mocked(getTeamMembers).mockImplementation(() => { throw new Error('database unavailable'); });
    const response = await GET(get(), params('1'));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Failed to fetch team' });
  });
});
