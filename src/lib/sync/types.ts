export type ProgressCallback = (
  stage: number,
  stageName: string,
  processed: number,
  total: number,
) => void;

export interface StageResult {
  stage: number;
  name: string;
  processed: number;
  failed: number;
  skipped: boolean;
}

export interface SyncResult {
  status: 'success' | 'partial' | 'error';
  stages: StageResult[];
  totalProcessed: number;
  totalFailed: number;
}

// Junction data collected during stage 4, consumed by stages 5-6
export interface PokemonJunctionData {
  pokemonPokeapiId: number;
  abilities: { pokeapiId: number; slot: number; isHidden: boolean }[];
  moves: { pokeapiId: number }[];
}

// Species metadata collected in stage 3, consumed by stage 4
export interface SpeciesMetadata {
  speciesId: number;
  englishName: string;
  generation: number;
  isLegendary: boolean;
  isMythical: boolean;
  isBaby: boolean;
  varieties: { isDefault: boolean; pokemonUrl: string }[];
}
