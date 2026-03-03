import { describe, it, expect } from 'vitest';
import { getFormName, buildDisplayName } from './pokemon';

// ===========================================
// getFormName
// ===========================================

describe('getFormName', () => {
  it('base form (slug === speciesName) returns null', () => {
    expect(getFormName('pikachu', 'pikachu')).toBeNull();
  });

  it('Alolan form', () => {
    expect(getFormName('raichu-alola', 'raichu')).toBe('Alolan');
  });

  it('Galarian form', () => {
    expect(getFormName('zigzagoon-galar', 'zigzagoon')).toBe('Galarian');
  });

  it('Hisuian form', () => {
    expect(getFormName('growlithe-hisui', 'growlithe')).toBe('Hisuian');
  });

  it('Paldean form', () => {
    expect(getFormName('tauros-paldea-combat', 'tauros')).toBe('Paldea Combat');
  });

  it('non-regional form title-cased', () => {
    expect(getFormName('wormadam-plant', 'wormadam')).toBe('Plant');
  });

  it('multi-word non-regional form', () => {
    expect(getFormName('rotom-heat', 'rotom')).toBe('Heat');
  });

  it('slug with no suffix after species returns null', () => {
    // Edge case: pokemonSlug has speciesName as prefix but nothing after the dash
    expect(getFormName('pikachu', 'pikachu')).toBeNull();
  });
});

// ===========================================
// buildDisplayName
// ===========================================

describe('buildDisplayName', () => {
  it('null formName returns species name as-is', () => {
    expect(buildDisplayName('Pikachu', null)).toBe('Pikachu');
  });

  it('Alolan form', () => {
    expect(buildDisplayName('Raichu', 'Alolan')).toBe('Raichu (Alolan)');
  });

  it('Galarian form', () => {
    expect(buildDisplayName('Zigzagoon', 'Galarian')).toBe('Zigzagoon (Galarian)');
  });

  it('non-regional form', () => {
    expect(buildDisplayName('Rotom', 'Heat')).toBe('Rotom (Heat)');
  });
});
