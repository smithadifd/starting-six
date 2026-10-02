import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SyncScheduleState } from '@/lib/db/queries';

vi.mock('@/lib/auth-helpers', () => ({ requireUserIdFromRequest: vi.fn() }));
vi.mock('@/lib/db/queries', () => ({ getSyncSchedule: vi.fn(), setSyncSchedule: vi.fn() }));

import { requireUserIdFromRequest } from '@/lib/auth-helpers';
import { getSyncSchedule, setSyncSchedule } from '@/lib/db/queries';
import { GET, PUT } from './route';

const schedule: SyncScheduleState = {
  enabled: true, frequency: 'weekly', lastAttemptAt: null, lastAttemptStatus: null,
  lastSuccessAt: null, attemptsToday: 0, attemptsTodayDate: null,
};
const req = (body?: unknown) => new Request('http://localhost/api/sync/schedule', {
  method: body === undefined ? 'GET' : 'PUT',
  body: body === undefined ? undefined : JSON.stringify(body),
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(requireUserIdFromRequest).mockResolvedValue('user-1');
  vi.mocked(getSyncSchedule).mockReturnValue(schedule);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('schedule HTTP contract', () => {
  it.each(['GET', 'PUT'] as const)('%s requires authentication', async method => {
    vi.mocked(requireUserIdFromRequest).mockRejectedValue(new Error('no session'));
    const response = method === 'GET' ? await GET(req()) : await PUT(req({ enabled: true, frequency: 'weekly' }));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Authentication required' });
    expect(getSyncSchedule).not.toHaveBeenCalled();
    expect(setSyncSchedule).not.toHaveBeenCalled();
  });

  it('GET returns the persisted schedule in the data envelope', async () => {
    const response = await GET(req());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: schedule });
    expect(getSyncSchedule).toHaveBeenCalledOnce();
  });

  it.each([
    [{ enabled: true, frequency: 'daily' }, 'frequency:'],
    [{ enabled: 'true', frequency: 'weekly' }, 'enabled:'],
    [{ enabled: true }, 'frequency:'],
  ])('PUT rejects invalid schedule %j', async (body, field) => {
    const response = await PUT(req(body));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain(field);
    expect(setSyncSchedule).not.toHaveBeenCalled();
  });

  it('PUT rejects malformed JSON', async () => {
    const response = await PUT(new Request('http://localhost/api/sync/schedule', { method: 'PUT', body: '{' }));
    expect(response.status).toBe(400);
    expect(setSyncSchedule).not.toHaveBeenCalled();
  });

  it('PUT saves validated values and returns the stored schedule', async () => {
    const response = await PUT(req({ enabled: false, frequency: 'monthly' }));
    expect(response.status).toBe(200);
    expect(setSyncSchedule).toHaveBeenCalledExactlyOnceWith(false, 'monthly');
    expect(await response.json()).toEqual({ data: schedule });
  });

  it.each(['GET', 'PUT'] as const)('%s reports database errors', async method => {
    vi.mocked(getSyncSchedule).mockImplementation(() => { throw new Error('database unavailable'); });
    const response = method === 'GET' ? await GET(req()) : await PUT(req({ enabled: true, frequency: 'weekly' }));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: method === 'GET' ? 'Failed to read sync schedule' : 'Failed to save sync schedule' });
  });
});
