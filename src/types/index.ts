// Pokémon type strings
export type PokemonType =
  | 'normal' | 'fire' | 'water' | 'electric' | 'grass' | 'ice'
  | 'fighting' | 'poison' | 'ground' | 'flying' | 'psychic' | 'bug'
  | 'rock' | 'ghost' | 'dragon' | 'dark' | 'steel' | 'fairy';

export const POKEMON_TYPES: PokemonType[] = [
  'normal', 'fire', 'water', 'electric', 'grass', 'ice',
  'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
  'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
];

// Sync progress event shape (SSE)
export interface SyncProgress {
  stage: number;
  stageName: string;
  processed: number;
  total: number;
}

// DB row types re-exported for convenience
export type { InferSelectModel } from 'drizzle-orm';