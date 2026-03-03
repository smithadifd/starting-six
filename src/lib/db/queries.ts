import { eq, like, and, inArray, sql, desc } from 'drizzle-orm';
import { getDb } from './index';
import {
  pokemon,
  abilities,
  pokemonAbilities,
  moves,
  pokemonMoves,
  versionGroups,
  gamePokemon,
  playthroughs,
  teamMembers,
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
// Playthrough queries
// ===========================================

export function getPlaythroughs(userId: string) {
  const db = getDb();
  return db
    .select({
      id: playthroughs.id,
      name: playthroughs.name,
      isCompleted: playthroughs.isCompleted,
      notes: playthroughs.notes,
      createdAt: playthroughs.createdAt,
      updatedAt: playthroughs.updatedAt,
      versionGroupId: playthroughs.versionGroupId,
      gameName: versionGroups.name,
    })
    .from(playthroughs)
    .leftJoin(versionGroups, eq(playthroughs.versionGroupId, versionGroups.id))
    .where(eq(playthroughs.userId, userId))
    .orderBy(desc(playthroughs.createdAt))
    .all();
}

export function getPlaythrough(id: number, userId: string) {
  const db = getDb();
  return db
    .select({
      id: playthroughs.id,
      name: playthroughs.name,
      isCompleted: playthroughs.isCompleted,
      notes: playthroughs.notes,
      versionGroupId: playthroughs.versionGroupId,
      createdAt: playthroughs.createdAt,
      updatedAt: playthroughs.updatedAt,
      gameName: versionGroups.name,
    })
    .from(playthroughs)
    .leftJoin(versionGroups, eq(playthroughs.versionGroupId, versionGroups.id))
    .where(and(eq(playthroughs.id, id), eq(playthroughs.userId, userId)))
    .get();
}

export function createPlaythrough(data: {
  userId: string;
  name: string;
  versionGroupId: number;
  notes?: string;
}) {
  const db = getDb();
  return db
    .insert(playthroughs)
    .values(data)
    .returning()
    .get();
}

export function updatePlaythrough(
  id: number,
  userId: string,
  data: { name?: string; notes?: string | null; isCompleted?: boolean; versionGroupId?: number }
) {
  const db = getDb();
  return db
    .update(playthroughs)
    .set({ ...data, updatedAt: sql`(datetime('now'))` })
    .where(and(eq(playthroughs.id, id), eq(playthroughs.userId, userId)))
    .returning()
    .get();
}

export function deletePlaythrough(id: number, userId: string) {
  const db = getDb();
  return db
    .delete(playthroughs)
    .where(and(eq(playthroughs.id, id), eq(playthroughs.userId, userId)))
    .run();
}

// ===========================================
// Team member queries
// ===========================================

export interface TeamMemberWithDetails {
  id: number;
  slot: number;
  nickname: string | null;
  teraType: string | null;
  pokemon: {
    id: number;
    name: string;
    slug: string;
    typeOne: string;
    typeTwo: string | null;
    spriteDefault: string | null;
    pokeapiId: number;
  };
  ability: { id: number; name: string; slug: string; effectShort: string | null } | null;
  moves: Array<{
    slot: number;
    move: {
      id: number;
      name: string;
      slug: string;
      type: string;
      damageClass: string;
      power: number | null;
      accuracy: number | null;
      pp: number;
    };
  }>;
}

export function getTeamMembers(playthroughId: number): TeamMemberWithDetails[] {
  const db = getDb();

  const rows = db
    .select({
      id: teamMembers.id,
      slot: teamMembers.slot,
      nickname: teamMembers.nickname,
      teraType: teamMembers.teraType,
      pokemonId: teamMembers.pokemonId,
      abilityId: teamMembers.abilityId,
      moveOneId: teamMembers.moveOneId,
      moveTwoId: teamMembers.moveTwoId,
      moveThreeId: teamMembers.moveThreeId,
      moveFourId: teamMembers.moveFourId,
    })
    .from(teamMembers)
    .where(eq(teamMembers.playthroughId, playthroughId))
    .orderBy(teamMembers.slot)
    .all();

  return rows
    .map((row) => {
      const poke = db.select().from(pokemon).where(eq(pokemon.id, row.pokemonId)).get();
      if (!poke) return null; // Orphaned team member — pokemon was deleted

      const abil = row.abilityId
        ? db.select().from(abilities).where(eq(abilities.id, row.abilityId)).get() ?? null
        : null;

      const moveSlots: Array<{ slot: number; moveId: number | null }> = [
        { slot: 1, moveId: row.moveOneId },
        { slot: 2, moveId: row.moveTwoId },
        { slot: 3, moveId: row.moveThreeId },
        { slot: 4, moveId: row.moveFourId },
      ];

      const memberMoves = moveSlots
        .filter((ms) => ms.moveId !== null)
        .map((ms) => {
          const move = db.select().from(moves).where(eq(moves.id, ms.moveId!)).get();
          return move ? { slot: ms.slot, move } : null;
        })
        .filter((m): m is NonNullable<typeof m> => m !== null);

      return {
        id: row.id,
        slot: row.slot,
        nickname: row.nickname,
        teraType: row.teraType,
        pokemon: {
          id: poke.id,
          name: poke.name,
          slug: poke.slug,
          typeOne: poke.typeOne,
          typeTwo: poke.typeTwo,
          spriteDefault: poke.spriteDefault,
          pokeapiId: poke.pokeapiId,
        },
        ability: abil ? { id: abil.id, name: abil.name, slug: abil.slug, effectShort: abil.effectShort } : null,
        moves: memberMoves,
      };
    })
    .filter((m): m is NonNullable<typeof m> => m !== null);
}

export function addTeamMember(data: {
  playthroughId: number;
  pokemonId: number;
  slot: number;
  nickname?: string;
  abilityId?: number;
  teraType?: string;
  moveOneId?: number;
  moveTwoId?: number;
  moveThreeId?: number;
  moveFourId?: number;
}) {
  const db = getDb();
  return db.insert(teamMembers).values(data).returning().get();
}

export function updateTeamMember(
  id: number,
  data: {
    nickname?: string | null;
    abilityId?: number | null;
    teraType?: string | null;
    moveOneId?: number | null;
    moveTwoId?: number | null;
    moveThreeId?: number | null;
    moveFourId?: number | null;
  }
) {
  const db = getDb();
  return db
    .update(teamMembers)
    .set({ ...data, updatedAt: sql`(datetime('now'))` })
    .where(eq(teamMembers.id, id))
    .returning()
    .get();
}

export function removeTeamMember(id: number) {
  const db = getDb();
  db.delete(teamMembers).where(eq(teamMembers.id, id)).run();
}

export function getNextTeamSlot(playthroughId: number): number | null {
  const db = getDb();
  const existing = db
    .select({ slot: teamMembers.slot })
    .from(teamMembers)
    .where(eq(teamMembers.playthroughId, playthroughId))
    .all()
    .map((r) => r.slot);

  for (let s = 1; s <= 6; s++) {
    if (!existing.includes(s)) return s;
  }
  return null; // Team is full
}

export function getPokemonById(id: number) {
  const db = getDb();
  return db.select().from(pokemon).where(eq(pokemon.id, id)).get();
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