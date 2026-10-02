import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('better-auth/cookies', () => ({ getSessionCookie: vi.fn(() => 'session') }));

function request(path: string, method = 'GET', ip = '192.0.2.1') {
  return new NextRequest(`http://localhost${path}`, { method, headers: { 'x-forwarded-for': ip } });
}

async function loadProxy(demo: boolean) {
  vi.resetModules();
  process.env.DEMO_MODE = demo ? 'true' : 'false';
  return (await import('./proxy')).proxy;
}

beforeEach(() => { delete process.env.DEMO_MODE; });

describe('demo API guard', () => {
  it.each([
    ['POST', '/api/sync'],
    ['PUT', '/api/sync/schedule'],
    ['PUT', '/api/settings'],
    ['POST', '/api/setup'],
  ])('%s %s returns the demo error', async (method, path) => {
    const proxy = await loadProxy(true);
    const response = proxy(request(path, method));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'This action is disabled in demo mode.' });
  });

  it('allows GET on every blocked mutation path', async () => {
    const proxy = await loadProxy(true);
    for (const path of ['/api/sync', '/api/sync/schedule', '/api/settings', '/api/setup']) {
      const response = proxy(request(path));
      expect(response.status).toBe(200);
      expect(response.headers.get('x-middleware-next')).toBe('1');
    }
  });
});

describe('schedule rate tier', () => {
  it('allows three schedule writes per minute and throttles the fourth', async () => {
    const proxy = await loadProxy(false);
    const statuses = Array.from({ length: 4 }, () => proxy(request('/api/sync/schedule', 'PUT', '192.0.2.2')));
    expect(statuses.map(response => response.status)).toEqual([200, 200, 200, 429]);
    expect(statuses[3].headers.get('Retry-After')).toBe('20');
    expect(await statuses[3].json()).toEqual({ error: 'Too many requests. Please try again later.' });
  });
});
