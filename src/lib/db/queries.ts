import { eq, like, and, inArray, sql } from 'drizzle-orm';
import { getDb } from './index';
import {
  pokemon,
  abilities,
  pokemonAbilities,
  moves,
  pokemonMoves,
  versionGroups,
  gamePokemon,
  syncLog,
  settings,
} from './schema';

// ===========================================
// Pokémon queries
// ===========================================

export interface PokemonFilters {
  search?: string;
  typeFilter?: string;
  generation?: number;
  versionGroupId?: number;
  page?: number;
  pageSize?: number;
}

export function getPokemon(filters: PokemonFilters = {}) {
  const db = getDb();
  const { search, typeFilter, generation, versionGroupId, page = 1, pageSize = 48 } = filters;

  const conditions = [];

  if (search) {
    conditions.push(like(pokemon.name, `%${search}%`));
  }
  if (typeFilter) {
    conditions.push(
      sql`(${pokemon.typeOne} = ${typeFilter} OR ${pokemon.typeTwo} = ${typeFilter})`
    );
  }
  if (generation) {
    conditions.push(eq(pokemon.generation, generation));
  }

  // Filter by version group (game dex)
  if (versionGroupId) {
    const speciesInGame = db
      .select({ speciesId: gamePokemon.speciesId })
      .from(gamePokemon)
      .where(eq(gamePokemon.versionGroupId, versionGroupId))
      .all()
      .map((r) => r.speciesId);

    if (speciesInGame.length > 0) {
      conditions.push(inArray(pokemon.speciesId, speciesInGame));
    } else {
      return { pokemon: [], total: 0 };
    }
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (page - 1) * pageSize;

  const rows = db
    .select()
    .from(pokemon)
    .where(where)
    .orderBy(pokemon.pokeapiId)
    .limit(pageSize)
    .offset(offset)
    .all();

  const countRow = db
    .select({ count: sql<number>`count(*)` })
    .from(pokemon)
    .where(where)
    .get();

  return { pokemon: rows, total: countRow?.count ?? 0 };
}

export function getPokemonBySlug(slug: string) {
  const db = getDb();
  return db.select().from(pokemon).where(eq(pokemon.slug, slug)).get();
}

export function getPokemonAbilities(pokemonId: number) {
  const db = getDb();
  return db
    .select({
      slot: pokemonAbilities.slot,
      isHidden: pokemonAbilities.isHidden,
      ability: abilities,
    })
    .from(pokemonAbilities)
    .innerJoin(abilities, eq(pokemonAbilities.abilityId, abilities.id))
    .where(eq(pokemonAbilities.pokemonId, pokemonId))
    .orderBy(pokemonAbilities.slot)
    .all();
}

export function getPokemonMoves(pokemonId: number) {
  const db = getDb();
  return db
    .select({ move: moves })
    .from(pokemonMoves)
    .innerJoin(moves, eq(pokemonMoves.moveId, moves.id))
    .where(eq(pokemonMoves.pokemonId, pokemonId))
    .orderBy(moves.name)
    .all();
}

// ===========================================
// Version group / game queries
// ===========================================

export function getVersionGroups() {
  const db = getDb();
  return db.select().from(versionGroups).orderBy(versionGroups.displayOrder).all();
}

// ===========================================
// Sync log queries
// ===========================================

export function getRecentSyncLogs(limit = 20) {
  const db = getDb();
  return db
    .select()
    .from(syncLog)
    .orderBy(sql`${syncLog.startedAt} DESC`)
    .limit(limit)
    .all();
}

export function createSyncLog(source: string) {
  const db = getDb();
  const result = db
    .insert(syncLog)
    .values({ source, status: 'running' })
    .returning({ id: syncLog.id })
    .get();
  return result?.id ?? 0;
}

export function updateSyncLog(
  id: number,
  update: {
    status: string;
    itemsProcessed?: number;
    itemsAttempted?: number;
    itemsFailed?: number;
    errorMessage?: string;
  }
) {
  const db = getDb();
  db.update(syncLog)
    .set({ ...update, completedAt: new Date().toISOString() })
    .where(eq(syncLog.id, id))
    .run();
}

// ===========================================
// Settings queries
// ===========================================

export function getSetting(key: string): string | null {
  const db = getDb();
  const row = db.select().from(settings).where(eq(settings.key, key)).get();
  return row?.value ?? null;
}

export function getAllSettings(): Record<string, string> {
  const db = getDb();
  const rows = db.select().from(settings).all();
  const result: Record<string, string> = {};
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}

export function setSetting(key: string, value: string, description?: string) {
  const db = getDb();
  db.insert(settings)
    .values({ key, value, description })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: sql`(datetime('now'))` } })
    .run();
}

// ===========================================
// Sync status helpers
// ===========================================

export function getSyncCounts() {
  const db = getDb();
  const pokemonCount = db.select({ count: sql<number>`count(*)` }).from(pokemon).get()?.count ?? 0;
  const movesCount = db.select({ count: sql<number>`count(*)` }).from(moves).get()?.count ?? 0;
  const abilitiesCount = db.select({ count: sql<number>`count(*)` }).from(abilities).get()?.count ?? 0;
  const versionGroupsCount = db.select({ count: sql<number>`count(*)` }).from(versionGroups).get()?.count ?? 0;
  return { pokemon: pokemonCount, moves: movesCount, abilities: abilitiesCount, versionGroups: versionGroupsCount };
}