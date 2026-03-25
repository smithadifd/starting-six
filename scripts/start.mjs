/**
 * Production startup script
 * Runs Drizzle migrations then starts the Next.js standalone server.
 * In demo mode: copies seed DB if data volume is empty, then seeds demo user.
 */

import Database from 'better-sqlite3';
import { readFileSync, existsSync, copyFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DB_PATH = process.env.DATABASE_URL || join(ROOT, 'data', 'starting-six.db');
const MIGRATIONS_DIR = join(ROOT, 'drizzle');
const DEMO_MODE = process.env.DEMO_MODE === 'true';
const DEMO_SEED_PATH = join(ROOT, 'data', 'demo', 'demo-seed.db');

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

function seedDemoData() {
  if (!DEMO_MODE) return;

  // If DB doesn't exist or is empty, copy the seed DB
  const dataDir = dirname(DB_PATH);
  mkdirSync(dataDir, { recursive: true });

  if (!existsSync(DB_PATH) || isDatabaseEmpty()) {
    if (existsSync(DEMO_SEED_PATH)) {
      console.log('[startup] Demo mode: copying seed database...');
      copyFileSync(DEMO_SEED_PATH, DB_PATH);
    } else {
      console.log('[startup] Demo mode: no seed DB found at', DEMO_SEED_PATH);
    }
  }

  // Run demo seed script (creates user + playthroughs, skips if already exists)
  console.log('[startup] Demo mode: running seed script...');
  execSync(`node ${join(ROOT, 'scripts', 'seed-demo.mjs')}`, {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: DB_PATH },
  });
}

function isDatabaseEmpty() {
  try {
    const db = new Database(DB_PATH, { readonly: true });
    const row = db.prepare("SELECT COUNT(*) as count FROM pokemon").get();
    db.close();
    return (row?.count ?? 0) === 0;
  } catch {
    return true;
  }
}

try {
  if (DEMO_MODE) {
    seedDemoData();
  }
  runMigrations();
} catch (error) {
  console.error('[startup] Startup failed:', error);
  process.exit(1);
}

console.log('[startup] Starting Next.js server...');
import('../server.js');