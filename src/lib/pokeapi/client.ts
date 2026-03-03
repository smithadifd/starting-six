import type { PaginatedResponse } from './types';

const BASE_URL = 'https://pokeapi.co/api/v2';
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 100;
const MAX_RETRIES = 3;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function extractIdFromUrl(url: string): number {
  const parts = url.replace(/\/$/, '').split('/');
  return parseInt(parts[parts.length - 1], 10);
}

async function fetchWithRetry<T>(url: string): Promise<T> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return (await res.json()) as T;
    } catch (err) {
      if (attempt === MAX_RETRIES - 1) throw err;
      await delay(1000 * Math.pow(2, attempt));
    }
  }
  throw new Error('Unreachable');
}

export async function fetchAllPages<T = { name: string; url: string }>(
  endpoint: string,
): Promise<T[]> {
  const all: T[] = [];
  let url: string | null = `${BASE_URL}/${endpoint}?limit=100`;
  while (url) {
    const page: PaginatedResponse<T> = await fetchWithRetry(url);
    all.push(...page.results);
    url = page.next;
  }
  return all;
}

export async function fetchOne<T>(endpoint: string): Promise<T> {
  return fetchWithRetry<T>(`${BASE_URL}/${endpoint}`);
}

export async function fetchUrl<T>(url: string): Promise<T> {
  return fetchWithRetry<T>(url);
}

export async function fetchBatch<T, R>(
  items: T[],
  fetcher: (item: T) => Promise<R>,
  onProgress?: (processed: number) => void,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const settled = await Promise.allSettled(batch.map(fetcher));
    for (const result of settled) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      }
    }
    onProgress?.(Math.min(i + BATCH_SIZE, items.length));
    if (i + BATCH_SIZE < items.length) {
      await delay(BATCH_DELAY_MS);
    }
  }
  return results;
}
