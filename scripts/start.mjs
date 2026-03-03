/**
 * Production startup script
 * Runs Drizzle migrations then starts the Next.js standalone server.
 */

import Database from 'better-sqlite3';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DB_PATH = process.env.DATABASE_URL || join(ROOT, 'data', 'starting-six.db');
const MIGRATIONS_DIR = join(ROOT, 'drizzle');

function runMigrations() {
  console.log('[startup] Running database migrations...');

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash TEXT NOT NULL,
      created_at NUMERIC
    )
  `);

  const journalPath = join(MIGRATIONS_DIR, 'meta', '_journal.json');
  if (!existsSync(journalPath)) {
    console.log('[startup] No migration journal found, skipping migrations');
    db.close();
    return;
  }

  const journal = JSON.parse(readFileSync(journalPath, 'utf-8'));
  const applied = new Set(
    db.prepare('SELECT hash FROM __drizzle_migrations').all().map((r) => r.hash)
  );

  let migrationsRan = 0;

  for (const entry of journal.entries) {
    const tag = entry.tag;
    if (applied.has(tag)) continue;

    const sqlPath = join(MIGRATIONS_DIR, `${tag}.sql`);
    if (!existsSync(sqlPath)) {
      console.error(`[startup] Migration file missing: ${tag}.sql`);
      process.exit(1);
    }

    const sqlContent = readFileSync(sqlPath, 'utf-8');

    if (entry.idx === 0) {
      const tableExists = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='pokemon'")
        .get();
      if (tableExists) {
        console.log(`[startup] Tables already exist, marking initial migration as applied: ${tag}`);
        db.prepare('INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)').run(tag, Date.now());
        continue;
      }
    }

    console.log(`[startup] Applying migration: ${tag}`);
    const statements = sqlContent.split('--> statement-breakpoint');
    const runAll = db.transaction(() => {
      for (const stmt of statements) {
        const trimmed = stmt.trim();
        if (trimmed) db.exec(trimmed);
      }
      db.prepare('INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)').run(tag, Date.now());
    });
    runAll();
    migrationsRan++;
  }

  db.close();
  console.log(migrationsRan > 0 ? `[startup] Applied ${migrationsRan} migration(s)` : '[startup] Database is up to date');
}

try {
  runMigrations();
} catch (error) {
  console.error('[startup] Migration failed:', error);
  process.exit(1);
}

console.log('[startup] Starting Next.js server...');
import('../server.js');