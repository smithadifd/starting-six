import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

function readJson(file: string): Record<string, string> {
  return JSON.parse(readFileSync(path.resolve(process.cwd(), file), 'utf8'));
}

describe('release-please manifest', () => {
  it('is seeded at the package.json version', () => {
    const manifest = readJson('.release-please-manifest.json');
    const pkg = readJson('package.json');
    expect(manifest['.']).toBe(pkg.version);
  });
});
