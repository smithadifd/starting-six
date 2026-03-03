import { describe, it, expect } from 'vitest';
import { apiSuccess, apiError, apiNotFound, apiUnauthorized, apiValidationError } from './api';

describe('apiSuccess', () => {
  it('returns 200 status', () => {
    const res = apiSuccess({ id: 1 });
    expect(res.status).toBe(200);
  });

  it('body has { data: value }', async () => {
    const res = apiSuccess({ id: 1 });
    const body = await res.json();
    expect(body).toEqual({ data: { id: 1 } });
  });

  it('with meta includes meta in body', async () => {
    const res = apiSuccess([1, 2], { total: 2 });
    const body = await res.json();
    expect(body).toEqual({ data: [1, 2], meta: { total: 2 } });
  });

  it('without meta does not include meta key', async () => {
    const res = apiSuccess('ok');
    const body = await res.json();
    expect(body).toEqual({ data: 'ok' });
    expect('meta' in body).toBe(false);
  });
});

describe('apiError', () => {
  it('default status is 500', () => {
    const res = apiError('Something broke');
    expect(res.status).toBe(500);
  });

  it('body has { error: message }', async () => {
    const res = apiError('Something broke');
    const body = await res.json();
    expect(body).toEqual({ error: 'Something broke' });
  });

  it('custom status is respected', () => {
    const res = apiError('Forbidden', 403);
    expect(res.status).toBe(403);
  });
});

describe('apiNotFound', () => {
  it('returns 404 status', () => {
    const res = apiNotFound();
    expect(res.status).toBe(404);
  });

  it('default message is "Resource not found"', async () => {
    const res = apiNotFound();
    const body = await res.json();
    expect(body).toEqual({ error: 'Resource not found' });
  });

  it('custom resource name', async () => {
    const res = apiNotFound('Playthrough');
    const body = await res.json();
    expect(body).toEqual({ error: 'Playthrough not found' });
  });
});

describe('apiUnauthorized', () => {
  it('returns 401 status', () => {
    const res = apiUnauthorized();
    expect(res.status).toBe(401);
  });

  it('body has { error: "Authentication required" }', async () => {
    const res = apiUnauthorized();
    const body = await res.json();
    expect(body).toEqual({ error: 'Authentication required' });
  });
});

describe('apiValidationError', () => {
  it('returns 400 status', () => {
    const res = apiValidationError('Invalid input');
    expect(res.status).toBe(400);
  });

  it('body has { error: message }', async () => {
    const res = apiValidationError('Invalid input');
    const body = await res.json();
    expect(body).toEqual({ error: 'Invalid input' });
  });
});
