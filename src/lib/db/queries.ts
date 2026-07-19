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
  syncSchedule,
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

export function createSyncLog(source: string, trigger: 'manual' | 'scheduled' = 'manual') {
  const db = getDb();
  const result = db
    .insert(syncLog)
    .values({ source, trigger, status: 'running' })
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
// Scheduled re-sync (config + due-date bookkeeping)
// ===========================================

export type SyncFrequency = 'weekly' | 'monthly';
export type SyncAttemptStatus = 'success' | 'failure';

export interface SyncScheduleState {
  enabled: boolean;
  frequency: SyncFrequency;
  lastAttemptAt: string | null;
  lastAttemptStatus: SyncAttemptStatus | null;
  lastSuccessAt: string | null;
  attemptsToday: number;
  attemptsTodayDate: string | null;
}

const DEFAULT_SYNC_SCHEDULE: SyncScheduleState = {
  enabled: false,
  frequency: 'weekly',
  lastAttemptAt: null,
  lastAttemptStatus: null,
  lastSuccessAt: null,
  attemptsToday: 0,
  attemptsTodayDate: null,
};

/** Reads the singleton schedule row, defaulting to "off" if it doesn't exist yet. */
export function getSyncSchedule(): SyncScheduleState {
  const db = getDb();
  const row = db.select().from(syncSchedule).where(eq(syncSchedule.id, 1)).get();
  if (!row) return DEFAULT_SYNC_SCHEDULE;
  return {
    enabled: row.enabled,
    frequency: row.frequency as SyncFrequency,
    lastAttemptAt: row.lastAttemptAt,
    lastAttemptStatus: row.lastAttemptStatus as SyncAttemptStatus | null,
    lastSuccessAt: row.lastSuccessAt,
    attemptsToday: row.attemptsToday,
    attemptsTodayDate: row.attemptsTodayDate,
  };
}

/** Updates the toggle + frequency. Creates the singleton row on first use. */
export function setSyncSchedule(enabled: boolean, frequency: SyncFrequency) {
  const db = getDb();
  db.insert(syncSchedule)
    .values({ id: 1, enabled, frequency })
    .onConflictDoUpdate({
      target: syncSchedule.id,
      set: { enabled, frequency, updatedAt: sql`(datetime('now'))` },
    })
    .run();
}

/**
 * Records the outcome of a scheduled attempt — always bumps `lastAttemptAt`
 * (used for the post-failure backoff window), bumps `lastSuccessAt` only on
 * success (the value the weekly/monthly "overdue" check is measured against),
 * and tracks a same-day attempt count so the scheduler never exceeds the
 * daily attempt cap. Creates the singleton row on first use.
 */
export function recordSyncAttempt(status: SyncAttemptStatus, now: Date = new Date()) {
  const db = getDb();
  const nowIso = now.toISOString();
  const today = nowIso.slice(0, 10);

  const current = getSyncSchedule();
  const attemptsToday = current.attemptsTodayDate === today ? current.attemptsToday + 1 : 1;
  const lastSuccessAt = status === 'success' ? nowIso : current.lastSuccessAt;

  db.insert(syncSchedule)
    .values({
      id: 1,
      enabled: current.enabled,
      frequency: current.frequency,
      lastAttemptAt: nowIso,
      lastAttemptStatus: status,
      lastSuccessAt,
      attemptsToday,
      attemptsTodayDate: today,
    })
    .onConflictDoUpdate({
      target: syncSchedule.id,
      set: {
        lastAttemptAt: nowIso,
        lastAttemptStatus: status,
        lastSuccessAt,
        attemptsToday,
        attemptsTodayDate: today,
        updatedAt: sql`(datetime('now'))`,
      },
    })
    .run();
}

// ===========================================
// Sync lock (mutual exclusion between manual + scheduled sync)
// ===========================================

export type SyncLockSource = 'manual' | 'scheduled';

// A claim older than 30 minutes is treated as abandoned (e.g. container
// restarted mid-sync) — a full sync normally finishes in 5-15 minutes per
// docs/architecture/sync-pipeline.md, so 30 is a generous margin. Kept as a
// plain SQL literal below rather than parameterized: it's a fixed constant,
// not user input.

/**
 * Atomically claims the sync lock for `source`. Returns true if the claim
 * succeeded (caller now owns exclusive access to the sync pipeline), false
 * if another sync currently holds an unexpired claim. Backed by a single
 * conditional UPDATE so it's safe under concurrent callers — no
 * module-local boolean, so a container restart mid-sync doesn't leave the
 * lock stuck (a stale claim past the timeout is reclaimable).
 */
export function claimSyncLock(source: SyncLockSource): boolean {
  const db = getDb();
  // Ensure the singleton row exists — first call on a fresh database.
  db.run(sql`INSERT INTO sync_lock (id, claimed_by, claimed_at) VALUES (1, NULL, NULL) ON CONFLICT (id) DO NOTHING`);
  const result = db.run(sql`
    UPDATE sync_lock
    SET claimed_by = ${source}, claimed_at = datetime('now')
    WHERE id = 1 AND (claimed_by IS NULL OR claimed_at < datetime('now', '-30 minutes'))
  `);
  return result.changes > 0;
}

/** Releases the sync lock. Safe to call even if no claim is held. */
export function releaseSyncLock(): void {
  const db = getDb();
  db.run(sql`UPDATE sync_lock SET claimed_by = NULL, claimed_at = NULL WHERE id = 1`);
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
  slot: number | null;
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

export function getTeamMembers(
  playthroughId: number,
  filter: 'all' | 'active' | 'benched' = 'all',
): TeamMemberWithDetails[] {
  const db = getDb();

  const conditions = [eq(teamMembers.playthroughId, playthroughId)];
  if (filter === 'active') {
    conditions.push(sql`${teamMembers.slot} IS NOT NULL`);
  } else if (filter === 'benched') {
    conditions.push(sql`${teamMembers.slot} IS NULL`);
  }

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
    .where(and(...conditions))
    .orderBy(sql`CASE WHEN ${teamMembers.slot} IS NULL THEN 1 ELSE 0 END, ${teamMembers.slot}, ${teamMembers.createdAt}`)
    .all();

  if (rows.length === 0) return [];

  // Batch fetch all referenced entities (4 queries instead of 37)
  const pokemonIds = [...new Set(rows.map((r) => r.pokemonId))];
  const abilityIds = [...new Set(
    rows.map((r) => r.abilityId).filter((id): id is number => id !== null),
  )];
  const moveIds = [...new Set(
    rows.flatMap((r) => [r.moveOneId, r.moveTwoId, r.moveThreeId, r.moveFourId])
      .filter((id): id is number => id !== null),
  )];

  const pokemonMap = new Map(
    db.select().from(pokemon).where(inArray(pokemon.id, pokemonIds)).all()
      .map((p) => [p.id, p]),
  );
  const abilityMap = new Map(
    abilityIds.length > 0
      ? db.select().from(abilities).where(inArray(abilities.id, abilityIds)).all()
        .map((a) => [a.id, a])
      : [],
  );
  const moveMap = new Map(
    moveIds.length > 0
      ? db.select().from(moves).where(inArray(moves.id, moveIds)).all()
        .map((m) => [m.id, m])
      : [],
  );

  return rows
    .map((row) => {
      const poke = pokemonMap.get(row.pokemonId);
      if (!poke) return null; // Orphaned team member — pokemon was deleted

      const abil = row.abilityId ? abilityMap.get(row.abilityId) ?? null : null;

      const moveSlots: Array<{ slot: number; moveId: number | null }> = [
        { slot: 1, moveId: row.moveOneId },
        { slot: 2, moveId: row.moveTwoId },
        { slot: 3, moveId: row.moveThreeId },
        { slot: 4, moveId: row.moveFourId },
      ];

      const memberMoves = moveSlots
        .filter((ms) => ms.moveId !== null)
        .map((ms) => {
          const move = moveMap.get(ms.moveId!);
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
  slot: number | null;
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
    .where(and(
      eq(teamMembers.playthroughId, playthroughId),
      sql`${teamMembers.slot} IS NOT NULL`,
    ))
    .all()
    .map((r) => r.slot!);

  for (let s = 1; s <= 6; s++) {
    if (!existing.includes(s)) return s;
  }
  return null; // Active team is full — will go to bench
}

export function swapTeamMember(
  playthroughId: number,
  benchMemberId: number,
  activeSlot: number,
) {
  const db = getDb();

  // Find the active member in this slot
  const activeMember = db
    .select({ id: teamMembers.id })
    .from(teamMembers)
    .where(and(
      eq(teamMembers.playthroughId, playthroughId),
      eq(teamMembers.slot, activeSlot),
    ))
    .get();

  // Find the bench member
  const benchMember = db
    .select({ id: teamMembers.id, slot: teamMembers.slot })
    .from(teamMembers)
    .where(and(
      eq(teamMembers.id, benchMemberId),
      eq(teamMembers.playthroughId, playthroughId),
    ))
    .get();

  if (!benchMember) throw new Error('Bench member not found');
  if (benchMember.slot !== null) throw new Error('Member is not on the bench');

  const now = sql`(datetime('now'))`;

  if (activeMember) {
    // Swap: bench the active member, activate the bench member
    // Clear the active slot first to avoid unique constraint violation
    db.update(teamMembers)
      .set({ slot: null, updatedAt: now })
      .where(eq(teamMembers.id, activeMember.id))
      .run();
  }

  // Move bench member to the active slot
  db.update(teamMembers)
    .set({ slot: activeSlot, updatedAt: now })
    .where(eq(teamMembers.id, benchMemberId))
    .run();
}

export function benchTeamMember(memberId: number, playthroughId: number) {
  const db = getDb();
  db.update(teamMembers)
    .set({ slot: null, updatedAt: sql`(datetime('now'))` })
    .where(and(eq(teamMembers.id, memberId), eq(teamMembers.playthroughId, playthroughId)))
    .run();
}

export function activateTeamMember(memberId: number, playthroughId: number, slot: number) {
  const db = getDb();
  db.update(teamMembers)
    .set({ slot, updatedAt: sql`(datetime('now'))` })
    .where(and(eq(teamMembers.id, memberId), eq(teamMembers.playthroughId, playthroughId)))
    .run();
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