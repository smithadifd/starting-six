import { z } from 'zod';

export function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
      return `${path}${issue.message}`;
    })
    .join('; ');
}

export const syncTriggerSchema = z.object({
  type: z.enum(['pokeapi']),
});

export const setupSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
});

export const pokemonFiltersSchema = z.object({
  search: z.string().max(200).optional(),
  type: z.string().optional(),
  generation: z.coerce.number().int().min(1).max(9).optional(),
  versionGroupId: z.coerce.number().int().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(48),
});

export const POKEMON_TYPE_VALUES = [
  'normal', 'fire', 'water', 'electric', 'grass', 'ice',
  'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
  'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
] as const;

export const createPlaythroughSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  versionGroupId: z.number().int().min(1),
  notes: z.string().max(500).optional(),
});

export const updatePlaythroughSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  notes: z.string().max(500).nullable().optional(),
  isCompleted: z.boolean().optional(),
  versionGroupId: z.number().int().min(1).optional(),
});

export const addTeamMemberSchema = z.object({
  pokemonId: z.number().int().min(1),
  nickname: z.string().max(50).optional(),
  abilityId: z.number().int().min(1).optional(),
  teraType: z.enum(POKEMON_TYPE_VALUES).optional(),
});

export const updateTeamMemberSchema = z.object({
  nickname: z.string().max(50).nullable().optional(),
  abilityId: z.number().int().min(1).nullable().optional(),
  teraType: z.enum(POKEMON_TYPE_VALUES).nullable().optional(),
  moveOneId: z.number().int().min(1).nullable().optional(),
  moveTwoId: z.number().int().min(1).nullable().optional(),
  moveThreeId: z.number().int().min(1).nullable().optional(),
  moveFourId: z.number().int().min(1).nullable().optional(),
});