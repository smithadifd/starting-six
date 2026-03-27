import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';

// ===========================================
// PokéAPI Data Tables
// ===========================================

/**
 * One row per form/variant.
 * Alolan Raichu is a separate row from base Raichu.
 */
export const pokemon = sqliteTable('pokemon', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  pokeapiId: integer('pokeapi_id').unique().notNull(),
  speciesId: integer('species_id').notNull(),
  slug: text('slug').unique().notNull(), // e.g. 'raichu-alola'
  name: text('name').notNull(), // Display name: 'Raichu (Alolan)'
  speciesName: text('species_name').notNull(), // 'Raichu'
  formName: text('form_name'), // 'Alolan', 'Galarian', null for base
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(true),
  typeOne: text('type_one').notNull(),
  typeTwo: text('type_two'),
  statHp: integer('stat_hp').notNull().default(0),
  statAtk: integer('stat_atk').notNull().default(0),
  statDef: integer('stat_def').notNull().default(0),
  statSpAtk: integer('stat_sp_atk').notNull().default(0),
  statSpDef: integer('stat_sp_def').notNull().default(0),
  statSpd: integer('stat_spd').notNull().default(0),
  bst: integer('bst').notNull().default(0),
  spriteDefault: text('sprite_default'), // GitHub raw URL
  spriteShiny: text('sprite_shiny'), // GitHub raw URL
  generation: integer('generation').notNull().default(1), // 1-9
  isLegendary: integer('is_legendary', { mode: 'boolean' }).notNull().default(false),
  isMythical: integer('is_mythical', { mode: 'boolean' }).notNull().default(false),
  isBaby: integer('is_baby', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const abilities = sqliteTable('abilities', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  pokeapiId: integer('pokeapi_id').unique().notNull(),
  slug: text('slug').unique().notNull(),
  name: text('name').notNull(),
  effectShort: text('effect_short'),
  effectFull: text('effect_full'),
  isNotable: integer('is_notable', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const pokemonAbilities = sqliteTable('pokemon_abilities', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  pokemonId: integer('pokemon_id').references(() => pokemon.id, { onDelete: 'cascade' }).notNull(),
  abilityId: integer('ability_id').references(() => abilities.id, { onDelete: 'cascade' }).notNull(),
  slot: integer('slot').notNull(), // 1-3
  isHidden: integer('is_hidden', { mode: 'boolean' }).notNull().default(false),
}, (table) => ({
  pokemonSlotIdx: uniqueIndex('pokemon_ability_slot_idx').on(table.pokemonId, table.slot),
}));

export const moves = sqliteTable('moves', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  pokeapiId: integer('pokeapi_id').unique().notNull(),
  slug: text('slug').unique().notNull(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  damageClass: text('damage_class').notNull(), // 'physical' | 'special' | 'status'
  power: integer('power'),
  accuracy: integer('accuracy'),
  pp: integer('pp').notNull().default(0),
  effectShort: text('effect_short'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const pokemonMoves = sqliteTable('pokemon_moves', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  pokemonId: integer('pokemon_id').references(() => pokemon.id, { onDelete: 'cascade' }).notNull(),
  moveId: integer('move_id').references(() => moves.id, { onDelete: 'cascade' }).notNull(),
}, (table) => ({
  pokemonMoveIdx: uniqueIndex('pokemon_move_idx').on(table.pokemonId, table.moveId),
}));

export const versionGroups = sqliteTable('version_groups', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  pokeapiId: integer('pokeapi_id').unique().notNull(),
  slug: text('slug').unique().notNull(),
  name: text('name').notNull(),
  generation: integer('generation').notNull(),
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

/**
 * Links species to version groups (game dex entries).
 * Uses speciesId (not pokemonId) so forms aren't duplicated.
 */
export const gamePokemon = sqliteTable('game_pokemon', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  versionGroupId: integer('version_group_id').references(() => versionGroups.id, { onDelete: 'cascade' }).notNull(),
  speciesId: integer('species_id').notNull(),
  dexNumber: integer('dex_number').notNull(),
}, (table) => ({
  versionSpeciesIdx: uniqueIndex('version_species_idx').on(table.versionGroupId, table.speciesId),
}));

// ===========================================
// User Data Tables
// ===========================================

export const playthroughs = sqliteTable('playthroughs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  versionGroupId: integer('version_group_id').references(() => versionGroups.id).notNull(),
  notes: text('notes'),
  isCompleted: integer('is_completed', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const teamMembers = sqliteTable('team_members', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  playthroughId: integer('playthrough_id').references(() => playthroughs.id, { onDelete: 'cascade' }).notNull(),
  pokemonId: integer('pokemon_id').references(() => pokemon.id).notNull(),
  slot: integer('slot'), // 1-6 for active team, null for bench
  nickname: text('nickname'),
  abilityId: integer('ability_id').references(() => abilities.id),
  teraType: text('tera_type'), // User-specified Gen 9 mechanic, one of 18 type strings
  moveOneId: integer('move_one_id').references(() => moves.id),
  moveTwoId: integer('move_two_id').references(() => moves.id),
  moveThreeId: integer('move_three_id').references(() => moves.id),
  moveFourId: integer('move_four_id').references(() => moves.id),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
}, (table) => ({
  playthroughSlotIdx: uniqueIndex('playthrough_slot_idx').on(table.playthroughId, table.slot),
}));

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(), // JSON-encoded values
  description: text('description'),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const syncLog = sqliteTable('sync_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  source: text('source').notNull(), // 'pokeapi'
  status: text('status').notNull(), // 'running', 'success', 'partial', 'error'
  itemsProcessed: integer('items_processed').default(0),
  itemsAttempted: integer('items_attempted').default(0),
  itemsFailed: integer('items_failed').default(0),
  errorMessage: text('error_message'),
  startedAt: text('started_at').notNull().default(sql`(datetime('now'))`),
  completedAt: text('completed_at'),
});

// ===========================================
// Better Auth Tables (snake_case, integer timestamps)
// ===========================================

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
});

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
});

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp_ms' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp_ms' }),
  scope: text('scope'),
  idToken: text('id_token'),
  password: text('password'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
});

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
});