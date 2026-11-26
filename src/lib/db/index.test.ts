import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type BetterSqlite3 from 'better-sqlite3';
import { getTableConfig } from 'drizzle-orm/sqlite-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as schema from './schema';

interface StoredTableRows {
  name: string;
  rows: unknown[];
}

function expectCompleteSchema(sqlite: BetterSqlite3.Database) {
  const tables = sqlite.prepare("SELECT name FROM sqlite_schema WHERE type = 'table'")
    .all() as { name: string }[];
  const tableNames = tables.map(({ name }) => name);

  for (const table of Object.values(schema)) {
    const { name, columns } = getTableConfig(table);
    expect(tableNames, `missing table ${name}`).toContain(name);

    const storedColumns = sqlite.prepare('SELECT name FROM pragma_table_info(?)')
      .all(name) as { name: string }[];
    const columnNames = storedColumns.map(({ name }) => name);
    for (const column of columns) {
      expect(columnNames, `missing column ${name}.${column.name}`).toContain(column.name);
    }
  }
}

function seedUserData(sqlite: BetterSqlite3.Database) {
  sqlite.exec(`
    INSERT INTO user (id, name, email, email_verified, image, created_at, updated_at)
      VALUES ('trainer', 'Trainer', 'trainer@example.com', 1, 'avatar.png', 1000, 2000);
    INSERT INTO version_groups (id, pokeapi_id, slug, name, generation)
      VALUES (1, 1, 'red-blue', 'Red / Blue', 1);
    INSERT INTO pokemon (id, pokeapi_id, species_id, slug, name, species_name, type_one)
      VALUES (1, 25, 25, 'pikachu', 'Pikachu', 'Pikachu', 'electric');
    INSERT INTO playthroughs (id, user_id, name, version_group_id, notes, is_completed)
      VALUES (1, 'trainer', 'First run', 1, 'Keep this run', 1);
    INSERT INTO team_members (id, playthrough_id, pokemon_id, slot, nickname, tera_type)
      VALUES (1, 1, 1, 1, 'Sparky', 'electric');
    INSERT INTO settings (key, value, description)
      VALUES ('current-game', '1', 'Keep this preference');
  `);
}

function readStoredRows(sqlite: BetterSqlite3.Database) {
  return Object.values(schema).map((table) => {
    const { name } = getTableConfig(table);
    return {
      name,
      rows: sqlite.prepare(`SELECT * FROM "${name}" ORDER BY rowid`).all(),
    };
  });
}

function expectStoredRows(sqlite: BetterSqlite3.Database, stored: StoredTableRows[]) {
  for (const { name, rows } of stored) {
    expect(
      sqlite.prepare(`SELECT * FROM "${name}" ORDER BY rowid`).all(),
      `${name} rows must survive initialization`,
    ).toEqual(rows);
  }
}

describe('production schema initialization', () => {
  let directory: string;
  let clients: BetterSqlite3.Database[];

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'starting-six-schema-'));
    clients = [];
    vi.stubEnv('DATABASE_URL', join(directory, 'boot.db'));
  });

  afterEach(() => {
    for (const sqlite of clients) {
      if (sqlite.open) sqlite.close();
    }
    vi.unstubAllEnvs();
    vi.resetModules();
    rmSync(directory, { recursive: true });
  });

  async function boot() {
    vi.resetModules();
    // A static import would retain the singleton instead of exercising a new process boot.
    const { getDb } = await import('./index');
    const database = getDb();
    clients.push(database.$client);
    return database.$client;
  }

  it('boots a fresh file with every table and column declared by Drizzle', async () => {
    const sqlite = await boot();
    expectCompleteSchema(sqlite);
  });

  it('preserves stored user data and the complete schema after a new module boots the same file', async () => {
    const first = await boot();
    seedUserData(first);
    const stored = readStoredRows(first);
    first.close();

    const rebooted = await boot();
    expectCompleteSchema(rebooted);
    expectStoredRows(rebooted, stored);
  });

  it('preserves rows without duplicates when ensureSchema runs twice on an open database', async () => {
    const sqlite = await boot();
    seedUserData(sqlite);
    const stored = readStoredRows(sqlite);
    // Load the initializer from the module instance used by this boot.
    const { ensureSchema } = await import('./index');

    ensureSchema(sqlite);
    expectCompleteSchema(sqlite);
    expectStoredRows(sqlite, stored);

    ensureSchema(sqlite);
    expectCompleteSchema(sqlite);
    expectStoredRows(sqlite, stored);
  });
});
