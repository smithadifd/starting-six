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