import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('ignores real env files at every depth but keeps env examples visible', () => {
  const realNames = [
    '.env',
    '.env.local',
    '.env.production',
    '.env.demo',
    '.env.production.local',
    '.env.preview',
  ];
  const exampleNames = ['.env.example', '.env.production.example', '.env.preview.example'];
  const ignoredPaths = ['', 'nested/'].flatMap((prefix) => realNames.map((name) => prefix + name));
  const examplePaths = ['', 'nested/'].flatMap((prefix) => exampleNames.map((name) => prefix + name));
  const result = spawnSync('git', ['check-ignore', '--no-index', '--stdin'], {
    cwd: root,
    input: [...ignoredPaths, ...examplePaths].join('\n') + '\n',
    encoding: 'utf8',
  });

  expect(result.status, result.stderr).toBe(0);
  expect(result.stdout.trim().split('\n')).toEqual(ignoredPaths);
});
