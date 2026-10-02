import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, expect, test } from 'vitest';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const remoteScript = path.join(root, 'scripts/deploy-demo-remote.sh');
const localScript = path.join(root, 'scripts/deploy-demo.sh');
const scratchDirs: string[] = [];

afterEach(() => {
  for (const dir of scratchDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function scratch() {
  const dir = mkdtempSync(path.join(tmpdir(), 'deploy-demo-test-'));
  scratchDirs.push(dir);
  return dir;
}

function stub(file: string, body: string) {
  writeFileSync(file, `#!/usr/bin/env bash\nset -euo pipefail\n${body}\n`);
  chmodSync(file, 0o755);
}

function runDeploy(options: { failedHealth?: boolean; previousImage?: boolean; failedBuild?: boolean } = {}) {
  const dir = scratch();
  const bin = path.join(dir, 'bin');
  const demos = path.join(dir, 'demos');
  const target = path.join(demos, 'starting-six');
  const other = path.join(demos, 'other');
  const dormant = path.join(demos, 'dormant');
  const nested = path.join(demos, 'nested', 'child');
  const unrelated = path.join(dir, 'unrelated');
  mkdirSync(bin);
  for (const project of [target, other, dormant, nested, unrelated]) {
    mkdirSync(path.join(project, '.git'), { recursive: true });
    writeFileSync(path.join(project, 'docker-compose.demo.yml'), '');
    writeFileSync(path.join(project, '.env.demo'), '');
  }
  const log = path.join(dir, 'commands');
  stub(path.join(bin, 'docker'), `
printf 'docker %s\\n' "$*" >> "$COMMAND_LOG"
printf 'cwd %s command %s\\n' "$PWD" "$*" >> "$COMMAND_LOG"
case " $* " in
  *' ps -q app '*) echo prior-container ;;
  *' inspect '*) if [[ "$HAS_IMAGE" == 1 ]]; then echo sha256:previous; fi ;;
  *' config --images '*) echo starting-six-app ;;
  *' ps --format '*) printf '%s\\n' "$TARGET" "$OTHER" "$OTHER" "$NESTED" "$UNRELATED" ;;
  *' ps -a --format '*) printf '%s\\n' "$TARGET" "$OTHER" "$DORMANT" "$NESTED" "$UNRELATED" ;;
  *' build '*) if [[ "$FAIL_BUILD" == 1 ]]; then exit 42; fi ;;
esac`);
  stub(path.join(bin, 'git'), `
printf 'git %s\\n' "$*" >> "$COMMAND_LOG"
if [[ "$*" == 'rev-parse HEAD' ]]; then echo previous-commit; fi`);
  stub(path.join(bin, 'curl'), `
printf 'curl %s\\n' "$*" >> "$COMMAND_LOG"
[[ "$FAIL_HEALTH" != 1 ]]`);
  stub(path.join(bin, 'sleep'), `printf 'sleep %s\\n' "$*" >> "$COMMAND_LOG"`);
  const result = spawnSync('bash', [process.env.DEPLOY_REMOTE_SCRIPT ?? remoteScript, target,
    'https://example.invalid/repo.git', '3012'], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${bin}${path.delimiter}${process.env.PATH}`,
      COMMAND_LOG: log, TARGET: target, OTHER: other, DORMANT: dormant,
      NESTED: nested, UNRELATED: unrelated,
      FAIL_HEALTH: options.failedHealth ? '1' : '0',
      HAS_IMAGE: options.previousImage === false ? '0' : '1',
      FAIL_BUILD: options.failedBuild ? '1' : '0',
    },
  });
  return { result, log: readFileSync(log, 'utf8'), target, other, dormant, nested, unrelated };
}

test('stops and restarts only running demo stacks', () => {
  const { result, log, target, other, dormant, nested, unrelated } = runDeploy();
  expect(result.status, result.stderr).toBe(0);
  expect(log.match(/docker compose -f docker-compose.demo.yml --env-file .env.demo stop/g)).toHaveLength(2);
  expect(result.stdout).toContain(`Stopping ${target}`);
  expect(result.stdout).toContain(`Stopping ${other}`);
  expect(result.stdout).not.toContain(`Stopping ${dormant}`);
  expect(result.stdout).not.toContain(`Stopping ${nested}`);
  expect(result.stdout).not.toContain(`Stopping ${unrelated}`);
  expect(result.stdout.match(new RegExp(`Restarting ${other}`, 'g'))).toHaveLength(1);
  expect(result.stdout).not.toContain(`Restarting ${dormant}`);
});

test('restores recorded running stacks after a failed build', () => {
  const { result, log, target, other, dormant } = runDeploy({ failedBuild: true });
  expect(result.status).not.toBe(0);
  expect(result.stdout).toContain(`Stopping ${target}`);
  expect(result.stdout).toContain(`Stopping ${other}`);
  expect(result.stdout).toContain(`Restarting ${target}`);
  expect(result.stdout).toContain(`Restarting ${other}`);
  expect(result.stdout).not.toContain(`Restarting ${dormant}`);
  expect(log).toContain(`cwd ${target} command compose -f docker-compose.demo.yml --env-file .env.demo up -d`);
  expect(log).toContain(`cwd ${other} command compose -f docker-compose.demo.yml --env-file .env.demo up -d`);
  expect(log).not.toContain(`cwd ${dormant} command compose -f docker-compose.demo.yml --env-file .env.demo up -d`);
});

test('failed health reports URL, logs, backoff, and restores the previous image', () => {
  const { result, log } = runDeploy({ failedHealth: true });
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain('Health check failed: http://localhost:3012/api/health');
  expect(result.stderr).toContain('logs --tail=50 app');
  expect(log).toContain('docker tag sha256:previous starting-six-app');
  expect(log).toContain('up -d --no-build --force-recreate');
  expect(log.split('\n').filter((line) => line.startsWith('sleep '))).toEqual([
    'sleep 1', 'sleep 2', 'sleep 4', 'sleep 8', 'sleep 16',
    'sleep 16', 'sleep 16', 'sleep 16', 'sleep 16',
  ]);
});

test('dry run has no side effects', () => {
  const dir = scratch();
  const result = spawnSync('bash', [process.env.DEPLOY_LOCAL_SCRIPT ?? localScript, '--dry-run'], {
    cwd: dir, encoding: 'utf8',
  });
  expect(result.status, result.stderr).toBe(0);
  expect(result.stdout).toContain('Dry run:');
  expect(result.stdout).toContain('http://localhost:3012/api/health');
});

test('prints a manual rollback when the previous image is unavailable', () => {
  const { result, log, target } = runDeploy({ failedHealth: true, previousImage: false });
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain(`Manual rollback: cd ${target} && git reset --hard previous-commit && docker compose`);
  expect(log).not.toContain('docker tag');
});
