import { describe, it, expect, vi } from 'vitest';
import { extractIdFromUrl, fetchBatch } from './client';

// ===========================================
// extractIdFromUrl
// ===========================================

describe('extractIdFromUrl', () => {
  it('parses pokemon URL with trailing slash', () => {
    expect(extractIdFromUrl('https://pokeapi.co/api/v2/pokemon/25/')).toBe(25);
  });

  it('parses ability URL with trailing slash', () => {
    expect(extractIdFromUrl('https://pokeapi.co/api/v2/ability/65/')).toBe(65);
  });

  it('handles URL without trailing slash', () => {
    expect(extractIdFromUrl('https://pokeapi.co/api/v2/pokemon/25')).toBe(25);
  });

  it('deeply nested path returns last segment', () => {
    expect(extractIdFromUrl('https://pokeapi.co/api/v2/move/100/')).toBe(100);
  });

  it('parses large IDs', () => {
    expect(extractIdFromUrl('https://pokeapi.co/api/v2/pokemon/10001/')).toBe(10001);
  });
});

// ===========================================
// fetchBatch
// ===========================================

describe('fetchBatch', () => {
  it('empty items array returns []', async () => {
    const result = await fetchBatch([], async () => 'value');
    expect(result).toEqual([]);
  });

  it('single item calls fetcher once', async () => {
    const fetcher = vi.fn(async (n: number) => n * 2);
    const result = await fetchBatch([5], fetcher);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(result).toEqual([10]);
  });

  it('processes all items across multiple batches', async () => {
    const items = Array.from({ length: 12 }, (_, i) => i);
    const fetcher = async (n: number) => n * 2;
    const result = await fetchBatch(items, fetcher);
    expect(result).toHaveLength(12);
    expect(result).toEqual(items.map((n) => n * 2));
  });

  it('calls onProgress with correct increments', async () => {
    const items = Array.from({ length: 15 }, (_, i) => i);
    const progress: number[] = [];
    await fetchBatch(
      items,
      async (n) => n,
      (processed) => progress.push(processed),
    );
    // BATCH_SIZE=10: first batch reports 10, second batch reports 15
    expect(progress).toEqual([10, 15]);
  });

  it('rejected promises are silently dropped', async () => {
    const items = [1, 2, 3];
    const fetcher = async (n: number) => {
      if (n === 2) throw new Error('fail');
      return n;
    };
    const result = await fetchBatch(items, fetcher);
    expect(result).toEqual([1, 3]);
  });

  it('all items fail returns empty array', async () => {
    const items = [1, 2, 3];
    const fetcher = async (_n: number): Promise<number> => {
      throw new Error('fail');
    };
    const result = await fetchBatch(items, fetcher);
    expect(result).toEqual([]);
  });
});
