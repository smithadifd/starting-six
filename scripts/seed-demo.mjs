/**
 * Demo seed script — creates demo user + 3 sample playthroughs with teams.
 * Run after demo-seed.db (PokéAPI data) is copied to the data volume.
 *
 * Usage: node scripts/seed-demo.mjs
 */

import Database from 'better-sqlite3';
import { randomBytes } from 'crypto';
import { scrypt } from '@noble/hashes/scrypt.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DB_PATH = process.env.DATABASE_URL || join(ROOT, 'data', 'starting-six.db');

function bytesToHex(bytes) {
  return Buffer.from(bytes).toString('hex');
}

function hashPassword(password) {
  const salt = randomBytes(16);
  const key = scrypt(password, salt, { N: 16384, r: 16, p: 1, dkLen: 64 });
  return `${bytesToHex(salt)}:${bytesToHex(key)}`;
}

function generateId() {
  return randomBytes(16).toString('hex');
}

function seed() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  // Check if demo user already exists
  const existing = db.prepare("SELECT id FROM user WHERE email = 'demo@example.com'").get();
  if (existing) {
    console.log('[seed-demo] Demo user already exists, skipping');
    db.close();
    return;
  }

  const now = Date.now();
  const userId = generateId();
  const accountId = generateId();
  const hashedPassword = hashPassword('demo1234!');

  const run = db.transaction(() => {
    // Create demo user
    db.prepare(`
      INSERT INTO user (id, name, email, email_verified, created_at, updated_at)
      VALUES (?, 'Demo User', 'demo@example.com', 1, ?, ?)
    `).run(userId, now, now);

    // Create account with password
    db.prepare(`
      INSERT INTO account (id, user_id, account_id, provider_id, password, created_at, updated_at)
      VALUES (?, ?, ?, 'credential', ?, ?, ?)
    `).run(accountId, userId, userId, hashedPassword, now, now);

    console.log('[seed-demo] Created demo user');

    // === Playthrough 1: Scarlet Nuzlocke (Gen 9) ===
    const p1Id = createPlaythrough(db, userId, 'Scarlet Nuzlocke', 25, false); // scarlet-violet
    addTeamMember(db, p1Id, 1204, 1, 'meowscarada', 'Whiskers');   // Meowscarada
    addTeamMember(db, p1Id, 1238, 2, 'ceruledge', 'Flameblade');   // Ceruledge
    addTeamMember(db, p1Id, 1289, 3, 'clodsire', 'Muddy');         // Clodsire
    addTeamMember(db, p1Id, 1293, 4, 'kingambit', null);           // Kingambit
    addTeamMember(db, p1Id, 1261, 5, 'tinkaton', 'Bonk');          // Tinkaton
    addTeamMember(db, p1Id, 1308, 6, 'baxcalibur', null);          // Baxcalibur
    console.log('[seed-demo] Created playthrough: Scarlet Nuzlocke');

    // === Playthrough 2: Kanto Classic (Gen 1) ===
    const p2Id = createPlaythrough(db, userId, 'Kanto Classic', 1, true); // red-blue
    addTeamMember(db, p2Id, 8, 1, 'charizard', 'Blaze');           // Charizard
    addTeamMember(db, p2Id, 38, 2, 'pikachu', 'Sparky');           // Pikachu
    addTeamMember(db, p2Id, 389, 3, 'gardevoir', null);            // Gardevoir
    addTeamMember(db, p2Id, 583, 4, 'garchomp', null);             // Garchomp
    console.log('[seed-demo] Created playthrough: Kanto Classic (4 members)');

    // === Playthrough 3: Violet Competitive (Gen 9) ===
    const p3Id = createPlaythrough(db, userId, 'Violet Competitive', 25, false); // scarlet-violet
    addTeamMember(db, p3Id, 1294, 1, 'great-tusk', null);          // Great Tusk
    addTeamMember(db, p3Id, 1312, 2, 'gholdengo', null);           // Gholdengo
    addTeamMember(db, p3Id, 1318, 3, 'iron-valiant', null);        // Iron Valiant
    addTeamMember(db, p3Id, 1288, 4, 'annihilape', null);          // Annihilape
    addTeamMember(db, p3Id, 1171, 5, 'dragapult', null);           // Dragapult
    addTeamMember(db, p3Id, 1024, 6, 'mimikyu-disguised', null);   // Mimikyu
    console.log('[seed-demo] Created playthrough: Violet Competitive');
  });

  run();
  db.close();
  console.log('[seed-demo] Seeding complete');
}

function createPlaythrough(db, userId, name, versionGroupId, isCompleted) {
  const result = db.prepare(`
    INSERT INTO playthroughs (user_id, name, version_group_id, is_completed, created_at, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(userId, name, versionGroupId, isCompleted ? 1 : 0);
  return result.lastInsertRowid;
}

function addTeamMember(db, playthroughId, pokemonId, slot, pokemonSlug, nickname) {
  // Look up a non-hidden ability for this Pokemon
  const ability = db.prepare(`
    SELECT ability_id FROM pokemon_abilities
    WHERE pokemon_id = ? AND is_hidden = 0
    ORDER BY slot LIMIT 1
  `).get(pokemonId);

  // Look up 4 offensive moves (prefer ones with power)
  const moves = db.prepare(`
    SELECT pm.move_id FROM pokemon_moves pm
    JOIN moves m ON m.id = pm.move_id
    WHERE pm.pokemon_id = ? AND m.power IS NOT NULL AND m.power > 0
    ORDER BY m.power DESC LIMIT 4
  `).all(pokemonId);

  db.prepare(`
    INSERT INTO team_members (
      playthrough_id, pokemon_id, slot, nickname, ability_id,
      move_one_id, move_two_id, move_three_id, move_four_id,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(
    playthroughId,
    pokemonId,
    slot,
    nickname,
    ability?.ability_id || null,
    moves[0]?.move_id || null,
    moves[1]?.move_id || null,
    moves[2]?.move_id || null,
    moves[3]?.move_id || null,
  );
}

seed();
