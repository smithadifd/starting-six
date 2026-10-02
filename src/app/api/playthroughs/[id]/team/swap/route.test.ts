import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth-helpers', () => ({ requireUserIdFromRequest: vi.fn() }));
vi.mock('@/lib/db/queries', () => ({ getPlaythrough: vi.fn(), swapTeamMember: vi.fn() }));

import { requireUserIdFromRequest } from '@/lib/auth-helpers';
import { getPlaythrough, swapTeamMember } from '@/lib/db/queries';
import { POST } from './route';

const context = { params: Promise.resolve({ id: '1' }) };
const req = (body: unknown) => new Request('http://localhost/api/playthroughs/1/team/swap', { method: 'POST', body: JSON.stringify(body) });

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(requireUserIdFromRequest).mockResolvedValue('user-1');
  vi.mocked(getPlaythrough).mockReturnValue({ id: 1 } as ReturnType<typeof getPlaythrough>);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('swap route errors', () => {
  it('rejects an out-of-range slot with 400', async () => {
    const response = await POST(req({ benchMemberId: 2, activeSlot: 7 }), context);
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain('activeSlot:');
    expect(swapTeamMember).not.toHaveBeenCalled();
  });

  it('returns 404 when the playthrough is absent', async () => {
    vi.mocked(getPlaythrough).mockReturnValue(undefined);
    const response = await POST(req({ benchMemberId: 2, activeSlot: 1 }), context);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Playthrough not found' });
    expect(swapTeamMember).not.toHaveBeenCalled();
  });

  it('returns a generic 500 response when the requested swap cannot be completed', async () => {
    vi.mocked(swapTeamMember).mockImplementation(() => { throw new Error('Bench member not found'); });
    const response = await POST(req({ benchMemberId: 2, activeSlot: 1 }), context);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Failed to swap team member' });
  });
});
