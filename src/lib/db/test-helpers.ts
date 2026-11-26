import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { vi } from 'vitest';
import type * as ProductionDb from './index';
import * as schema from './schema';

// Existing suites mock getDb; schema initialization must still use the real module.
const { ensureSchema } = await vi.importActual<typeof ProductionDb>('./index');

/**
 * Creates a fresh in-memory SQLite database with the full schema.
 * Use in tests that need DB access — isolated per call, no cleanup needed.
 */
export function createTestDb() {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = true');

  ensureSchema(sqlite);

  return drizzle(sqlite, { schema });
}
