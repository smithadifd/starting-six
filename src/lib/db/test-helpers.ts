import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

/**
 * Creates a fresh in-memory SQLite database with the full schema.
 * Use in tests that need DB access — isolated per call, no cleanup needed.
 */
export function createTestDb() {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = true');

  // Same DDL as ensureSchema in src/lib/db/index.ts
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS pokemon (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pokeapi_id INTEGER NOT NULL UNIQUE,
      species_id INTEGER NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      species_name TEXT NOT NULL,
      form_name TEXT,
      is_default INTEGER NOT NULL DEFAULT 1,
      type_one TEXT NOT NULL,
      type_two TEXT,
      stat_hp INTEGER NOT NULL DEFAULT 0,
      stat_atk INTEGER NOT NULL DEFAULT 0,
      stat_def INTEGER NOT NULL DEFAULT 0,
      stat_sp_atk INTEGER NOT NULL DEFAULT 0,
      stat_sp_def INTEGER NOT NULL DEFAULT 0,
      stat_spd INTEGER NOT NULL DEFAULT 0,
      bst INTEGER NOT NULL DEFAULT 0,
      sprite_default TEXT,
      sprite_shiny TEXT,
      generation INTEGER NOT NULL DEFAULT 1,
      is_legendary INTEGER NOT NULL DEFAULT 0,
      is_mythical INTEGER NOT NULL DEFAULT 0,
      is_baby INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS abilities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pokeapi_id INTEGER NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      effect_short TEXT,
      effect_full TEXT,
      is_notable INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pokemon_abilities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pokemon_id INTEGER NOT NULL REFERENCES pokemon(id) ON DELETE CASCADE,
      ability_id INTEGER NOT NULL REFERENCES abilities(id) ON DELETE CASCADE,
      slot INTEGER NOT NULL,
      is_hidden INTEGER NOT NULL DEFAULT 0
    );
    CREATE UNIQUE INDEX IF NOT EXISTS pokemon_ability_slot_idx ON pokemon_abilities (pokemon_id, slot);

    CREATE TABLE IF NOT EXISTS moves (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pokeapi_id INTEGER NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      damage_class TEXT NOT NULL,
      power INTEGER,
      accuracy INTEGER,
      pp INTEGER NOT NULL DEFAULT 0,
      effect_short TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pokemon_moves (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pokemon_id INTEGER NOT NULL REFERENCES pokemon(id) ON DELETE CASCADE,
      move_id INTEGER NOT NULL REFERENCES moves(id) ON DELETE CASCADE
    );
    CREATE UNIQUE INDEX IF NOT EXISTS pokemon_move_idx ON pokemon_moves (pokemon_id, move_id);

    CREATE TABLE IF NOT EXISTS version_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pokeapi_id INTEGER NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      generation INTEGER NOT NULL,
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS game_pokemon (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version_group_id INTEGER NOT NULL REFERENCES version_groups(id) ON DELETE CASCADE,
      species_id INTEGER NOT NULL,
      dex_number INTEGER NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS version_species_idx ON game_pokemon (version_group_id, species_id);

    CREATE TABLE IF NOT EXISTS playthroughs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      version_group_id INTEGER NOT NULL REFERENCES version_groups(id),
      notes TEXT,
      is_completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS team_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      playthrough_id INTEGER NOT NULL REFERENCES playthroughs(id) ON DELETE CASCADE,
      pokemon_id INTEGER NOT NULL REFERENCES pokemon(id),
      slot INTEGER NOT NULL,
      nickname TEXT,
      ability_id INTEGER REFERENCES abilities(id),
      tera_type TEXT,
      move_one_id INTEGER REFERENCES moves(id),
      move_two_id INTEGER REFERENCES moves(id),
      move_three_id INTEGER REFERENCES moves(id),
      move_four_id INTEGER REFERENCES moves(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE UNIQUE INDEX IF NOT EXISTS playthrough_slot_idx ON team_members (playthrough_id, slot);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      status TEXT NOT NULL,
      items_processed INTEGER DEFAULT 0,
      items_attempted INTEGER DEFAULT 0,
      items_failed INTEGER DEFAULT 0,
      error_message TEXT,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS user (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      email_verified INTEGER NOT NULL DEFAULT 0,
      image TEXT,
      created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
      updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
    );

    CREATE TABLE IF NOT EXISTS session (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      expires_at INTEGER NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
      updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
    );

    CREATE TABLE IF NOT EXISTS account (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      account_id TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      access_token TEXT,
      refresh_token TEXT,
      access_token_expires_at INTEGER,
      refresh_token_expires_at INTEGER,
      scope TEXT,
      id_token TEXT,
      password TEXT,
      created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
      updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
    );

    CREATE TABLE IF NOT EXISTS verification (
      id TEXT PRIMARY KEY,
      identifier TEXT NOT NULL,
      value TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
      updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
    );
  `);

  return drizzle(sqlite, { schema });
}
