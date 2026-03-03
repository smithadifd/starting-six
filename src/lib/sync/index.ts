import { createSyncLog, updateSyncLog } from '@/lib/db/queries';
import { syncVersionGroups, syncGameDexes } from './games';
import { syncSpecies, syncPokemonForms } from './pokemon';
import { syncAbilities } from './abilities';
import { syncMoves } from './moves';
import type { ProgressCallback, SyncResult, StageResult } from './types';

/**
 * Run the full 6-stage PokéAPI sync pipeline.
 * Reports progress via callback (used for SSE streaming).
 */
export async function runFullSync(onProgress: ProgressCallback): Promise<SyncResult> {
  const logId = createSyncLog('pokeapi');
  const stages: StageResult[] = [];
  let totalProcessed = 0;
  let totalFailed = 0;

  try {
    // Stage 1: Version Groups
    const stage1 = await syncVersionGroups(onProgress);
    stages.push(stage1);
    totalProcessed += stage1.processed;
    totalFailed += stage1.failed;

    // Stage 2: Game Dexes
    const stage2 = await syncGameDexes(onProgress);
    stages.push(stage2);
    totalProcessed += stage2.processed;
    totalFailed += stage2.failed;

    // Stage 3: Species metadata (in-memory, not persisted directly)
    const { result: stage3, speciesMap } = await syncSpecies(onProgress);
    stages.push(stage3);
    totalProcessed += stage3.processed;
    totalFailed += stage3.failed;

    // Stage 4: Pokemon forms → pokemon rows + junction data
    const { result: stage4, junctions } = await syncPokemonForms(speciesMap, onProgress);
    stages.push(stage4);
    totalProcessed += stage4.processed;
    totalFailed += stage4.failed;

    // Stage 5: Abilities + pokemon_abilities junctions
    const stage5 = await syncAbilities(junctions, onProgress);
    stages.push(stage5);
    totalProcessed += stage5.processed;
    totalFailed += stage5.failed;

    // Stage 6: Moves + pokemon_moves junctions
    const stage6 = await syncMoves(junctions, onProgress);
    stages.push(stage6);
    totalProcessed += stage6.processed;
    totalFailed += stage6.failed;

    const status = totalFailed > 0 ? 'partial' : 'success';

    updateSyncLog(logId, {
      status,
      itemsProcessed: totalProcessed,
      itemsAttempted: totalProcessed + totalFailed,
      itemsFailed: totalFailed,
    });

    return { status, stages, totalProcessed, totalFailed };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Sync failed:', message);

    updateSyncLog(logId, {
      status: 'error',
      itemsProcessed: totalProcessed,
      itemsAttempted: totalProcessed + totalFailed,
      itemsFailed: totalFailed,
      errorMessage: message,
    });

    return { status: 'error', stages, totalProcessed, totalFailed };
  }
}
