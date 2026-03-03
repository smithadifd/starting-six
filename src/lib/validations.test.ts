import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  formatZodError,
  setupSchema,
  pokemonFiltersSchema,
  createPlaythroughSchema,
  updatePlaythroughSchema,
  addTeamMemberSchema,
  updateTeamMemberSchema,
  syncTriggerSchema,
} from './validations';

// ===========================================
// formatZodError
// ===========================================

describe('formatZodError', () => {
  it('single issue without path does not have "field: " prefix', () => {
    const result = z.string().min(3).safeParse('ab');
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = formatZodError(result.error);
      // No path prefix — message should not start with "fieldName: "
      expect(msg).not.toMatch(/^\w+: /);
      expect(msg.length).toBeGreaterThan(0);
    }
  });

  it('single issue with path returns "field: message"', () => {
    const schema = z.object({ name: z.string().min(3) });
    const result = schema.safeParse({ name: 'ab' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = formatZodError(result.error);
      expect(msg).toMatch(/^name: /);
    }
  });

  it('multiple issues joined with "; "', () => {
    const schema = z.object({
      name: z.string().min(1),
      email: z.string().email(),
    });
    const result = schema.safeParse({ name: '', email: 'bad' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = formatZodError(result.error);
      expect(msg).toContain('; ');
    }
  });
});

// ===========================================
// syncTriggerSchema
// ===========================================

describe('syncTriggerSchema', () => {
  it('accepts { type: "pokeapi" }', () => {
    expect(syncTriggerSchema.safeParse({ type: 'pokeapi' }).success).toBe(true);
  });

  it('rejects unknown type', () => {
    expect(syncTriggerSchema.safeParse({ type: 'steam' }).success).toBe(false);
  });
});

// ===========================================
// setupSchema
// ===========================================

describe('setupSchema', () => {
  const valid = { name: 'Andrew', email: 'test@example.com', password: 'password123' };

  it('valid input passes', () => {
    expect(setupSchema.safeParse(valid).success).toBe(true);
  });

  it('empty name fails', () => {
    expect(setupSchema.safeParse({ ...valid, name: '' }).success).toBe(false);
  });

  it('name over 100 chars fails', () => {
    expect(setupSchema.safeParse({ ...valid, name: 'a'.repeat(101) }).success).toBe(false);
  });

  it('invalid email fails', () => {
    expect(setupSchema.safeParse({ ...valid, email: 'not-an-email' }).success).toBe(false);
  });

  it('password under 8 chars fails', () => {
    expect(setupSchema.safeParse({ ...valid, password: 'short' }).success).toBe(false);
  });

  it('password over 128 chars fails', () => {
    expect(setupSchema.safeParse({ ...valid, password: 'a'.repeat(129) }).success).toBe(false);
  });
});

// ===========================================
// pokemonFiltersSchema
// ===========================================

describe('pokemonFiltersSchema', () => {
  it('all optional fields absent uses defaults', () => {
    const result = pokemonFiltersSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(48);
    }
  });

  it('page coerced from string', () => {
    const result = pokemonFiltersSchema.safeParse({ page: '2' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.page).toBe(2);
  });

  it('generation coerced from string', () => {
    const result = pokemonFiltersSchema.safeParse({ generation: '3' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.generation).toBe(3);
  });

  it('generation 0 fails (min 1)', () => {
    expect(pokemonFiltersSchema.safeParse({ generation: 0 }).success).toBe(false);
  });

  it('generation 10 fails (max 9)', () => {
    expect(pokemonFiltersSchema.safeParse({ generation: 10 }).success).toBe(false);
  });

  it('pageSize 101 fails (max 100)', () => {
    expect(pokemonFiltersSchema.safeParse({ pageSize: 101 }).success).toBe(false);
  });
});

// ===========================================
// createPlaythroughSchema
// ===========================================

describe('createPlaythroughSchema', () => {
  const valid = { name: 'Nuzlocke', versionGroupId: 1 };

  it('valid with all fields passes', () => {
    expect(createPlaythroughSchema.safeParse({ ...valid, notes: 'fun run' }).success).toBe(true);
  });

  it('valid with only required fields passes', () => {
    expect(createPlaythroughSchema.safeParse(valid).success).toBe(true);
  });

  it('empty name fails', () => {
    expect(createPlaythroughSchema.safeParse({ ...valid, name: '' }).success).toBe(false);
  });

  it('name over 100 chars fails', () => {
    expect(createPlaythroughSchema.safeParse({ ...valid, name: 'a'.repeat(101) }).success).toBe(false);
  });

  it('versionGroupId 0 fails (min 1)', () => {
    expect(createPlaythroughSchema.safeParse({ ...valid, versionGroupId: 0 }).success).toBe(false);
  });

  it('notes over 500 chars fails', () => {
    expect(createPlaythroughSchema.safeParse({ ...valid, notes: 'a'.repeat(501) }).success).toBe(false);
  });
});

// ===========================================
// updatePlaythroughSchema
// ===========================================

describe('updatePlaythroughSchema', () => {
  it('empty object passes (all fields optional)', () => {
    expect(updatePlaythroughSchema.safeParse({}).success).toBe(true);
  });

  it('isCompleted boolean accepted', () => {
    expect(updatePlaythroughSchema.safeParse({ isCompleted: true }).success).toBe(true);
  });

  it('notes nullable (null accepted)', () => {
    expect(updatePlaythroughSchema.safeParse({ notes: null }).success).toBe(true);
  });
});

// ===========================================
// addTeamMemberSchema
// ===========================================

describe('addTeamMemberSchema', () => {
  it('pokemonId required, missing fails', () => {
    expect(addTeamMemberSchema.safeParse({}).success).toBe(false);
  });

  it('valid teraType accepted', () => {
    expect(addTeamMemberSchema.safeParse({ pokemonId: 25, teraType: 'electric' }).success).toBe(true);
  });

  it('invalid teraType "shadow" fails', () => {
    expect(addTeamMemberSchema.safeParse({ pokemonId: 25, teraType: 'shadow' }).success).toBe(false);
  });

  it('nickname over 50 chars fails', () => {
    expect(addTeamMemberSchema.safeParse({ pokemonId: 25, nickname: 'a'.repeat(51) }).success).toBe(false);
  });
});

// ===========================================
// updateTeamMemberSchema
// ===========================================

describe('updateTeamMemberSchema', () => {
  it('empty object passes (all fields optional)', () => {
    expect(updateTeamMemberSchema.safeParse({}).success).toBe(true);
  });

  it('teraType nullable (null accepted)', () => {
    expect(updateTeamMemberSchema.safeParse({ teraType: null }).success).toBe(true);
  });

  it('moveOneId nullable (null accepted)', () => {
    expect(updateTeamMemberSchema.safeParse({ moveOneId: null }).success).toBe(true);
  });
});
