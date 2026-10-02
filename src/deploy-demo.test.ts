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

function runDeploy(options: { failedHealth?: boolean; previousImage?: boolean; failedBuild?: boolean;
  failedStop?: boolean; failedRestart?: boolean; failedPs?: boolean; changedImageName?: boolean;
  failedRollbackTag?: boolean; failedRollbackUp?: boolean } = {}) {
  const dir = scratch();
  const bin = path.join(dir, 'bin');
  const demos = path.join(dir, 'demos');
  const target = path.join(demos, 'starting-six');
  const other = path.join(demos, 'other');
  const third = path.join(demos, 'third');
  const dormant = path.join(demos, 'dormant');
  const nested = path.join(demos, 'nested', 'child');
  const unrelated = path.join(dir, 'unrelated');
  mkdirSync(bin);
  for (const project of [target, other, third, dormant, nested, unrelated]) {
    mkdirSync(path.join(project, '.git'), { recursive: true });
    writeFileSync(path.join(project, 'docker-compose.demo.yml'), '');
    writeFileSync(path.join(project, '.env.demo'), '');
  }
  const log = path.join(dir, 'commands');
  stub(path.join(bin, 'docker'), `
printf 'docker %s\\n' "$*" >> "$COMMAND_LOG"
printf 'cwd %s command %s\\n' "$PWD" "$*" >> "$COMMAND_LOG"
case " $* " in
  *' tag sha256:previous starting-six-app '*) if [[ "$FAIL_ROLLBACK_TAG" == 1 ]]; then exit 46; fi ;;
  *' up -d --no-build --force-recreate '*) if [[ "$FAIL_ROLLBACK_UP" == 1 ]]; then exit 47; fi ;;
  *' ps -q app '*) if [[ -f "$STATE/updated" ]]; then echo new-container; else echo prior-container; fi ;;
  *' inspect --format {{.Image}} prior-container '*) if [[ "$HAS_IMAGE" == 1 ]]; then echo sha256:previous; fi ;;
  *' inspect --format {{.Config.Image}} prior-container '*) echo starting-six-app ;;
  *' inspect --format {{.Config.Image}} new-container '*) if [[ "$CHANGE_IMAGE" == 1 ]]; then echo renamed-app; else echo starting-six-app; fi ;;
  *' ps --format '*) if [[ "$FAIL_PS" == 1 ]]; then exit 45; fi; printf '%s\\n' "$TARGET" "$OTHER" "$THIRD" "$OTHER" "$NESTED" "$UNRELATED" ;;
  *' ps -a --format '*) printf '%s\\n' "$TARGET" "$OTHER" "$DORMANT" "$NESTED" "$UNRELATED" ;;
  *' stop '*) count=$(cat "$STATE/stops" 2>/dev/null || echo 0); count=$((count + 1)); echo "$count" > "$STATE/stops"; if [[ "$FAIL_STOP" == 1 && "$count" == 2 ]]; then exit 43; fi ;;
  *' up -d '*) if [[ "$FAIL_RESTART" == 1 && "$PWD" == "$OTHER" ]]; then exit 44; fi ;;
  *' build '*) if [[ "$FAIL_BUILD" == 1 ]]; then exit 42; fi ;;
esac`);
  stub(path.join(bin, 'git'), `
printf 'git %s\\n' "$*" >> "$COMMAND_LOG"
if [[ "$*" == 'rev-parse HEAD' ]]; then echo previous-commit; fi
if [[ "$*" == 'reset --hard origin/main' ]]; then touch "$STATE/updated"; fi`);
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
      COMMAND_LOG: log, STATE: dir, TARGET: target, OTHER: other, THIRD: third, DORMANT: dormant,
      NESTED: nested, UNRELATED: unrelated,
      FAIL_HEALTH: options.failedHealth ? '1' : '0',
      HAS_IMAGE: options.previousImage === false ? '0' : '1',
      FAIL_BUILD: options.failedBuild ? '1' : '0',
      FAIL_STOP: options.failedStop ? '1' : '0',
      FAIL_RESTART: options.failedRestart ? '1' : '0',
      FAIL_PS: options.failedPs ? '1' : '0',
      CHANGE_IMAGE: options.changedImageName ? '1' : '0',
      FAIL_ROLLBACK_TAG: options.failedRollbackTag ? '1' : '0',
      FAIL_ROLLBACK_UP: options.failedRollbackUp ? '1' : '0',
    },
  });
  return { result, log: readFileSync(log, 'utf8'), target, other, third, dormant, nested, unrelated };
}

test('stops and restarts only running demo stacks', () => {
  const { result, log, target, other, third, dormant, nested, unrelated } = runDeploy();
  expect(result.status, result.stderr).toBe(0);
  expect(log.match(/docker compose -f docker-compose.demo.yml --env-file .env.demo stop/g)).toHaveLength(3);
  expect(log).not.toMatch(/^docker (stop|kill|rm)(?:\s|$)/m);
  for (const project of [target, other, third]) {
    expect(log).toContain(`cwd ${project} command compose -f docker-compose.demo.yml --env-file .env.demo stop`);
  }
  expect(result.stdout).toContain(`Stopping ${target}`);
  expect(result.stdout).toContain(`Stopping ${other}`);
  expect(result.stdout).toContain(`Stopping ${third}`);
  expect(result.stdout).not.toContain(`Stopping ${dormant}`);
  expect(result.stdout).not.toContain(`Stopping ${nested}`);
  expect(result.stdout).not.toContain(`Stopping ${unrelated}`);
  expect(result.stdout.match(new RegExp(`Restarting ${other}`, 'g'))).toHaveLength(1);
  for (const project of [target, other, third]) {
    expect(log.split('\n').filter((line) =>
      line === `cwd ${project} command compose -f docker-compose.demo.yml --env-file .env.demo up -d`)).toHaveLength(1);
  }
  expect(result.stdout).not.toContain(`Restarting ${dormant}`);
});

test('aborts before changing stacks when listing running containers fails', () => {
  const { result, log } = runDeploy({ failedPs: true });
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain('Failed to list running Docker containers');
  expect(log).not.toMatch(/docker compose -f docker-compose.demo.yml --env-file .env.demo (stop|build|up -d)/);
});

test('restores recorded running stacks after a failed build', () => {
  const { result, log, target, other, third, dormant } = runDeploy({ failedBuild: true });
  expect(result.status).not.toBe(0);
  expect(result.stdout).toContain(`Stopping ${target}`);
  expect(result.stdout).toContain(`Stopping ${other}`);
  expect(result.stdout).toContain(`Restarting ${target}`);
  expect(result.stdout).toContain(`Restarting ${other}`);
  expect(result.stdout).toContain(`Restarting ${third}`);
  expect(result.stdout).not.toContain(`Restarting ${dormant}`);
  expect(log).toContain(`cwd ${target} command compose -f docker-compose.demo.yml --env-file .env.demo up -d`);
  expect(log).toContain(`cwd ${other} command compose -f docker-compose.demo.yml --env-file .env.demo up -d`);
  expect(log).not.toContain(`cwd ${dormant} command compose -f docker-compose.demo.yml --env-file .env.demo up -d`);
});

test('restores all recorded stacks when a later stop fails', () => {
  const { result, log, target, other, third } = runDeploy({ failedStop: true });
  expect(result.status).not.toBe(0);
  expect(result.stdout).toContain(`Stopping ${target}`);
  expect(result.stdout).toContain(`Stopping ${other}`);
  expect(result.stdout).not.toContain(`Stopping ${third}`);
  for (const project of [target, other, third]) {
    expect(log).toContain(`cwd ${project} command compose -f docker-compose.demo.yml --env-file .env.demo up -d`);
  }
});

test('continues restarting other demos after one restart fails', () => {
  const { result, log, target, other, third } = runDeploy({ failedRestart: true });
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain(`Failed to restart ${other}`);
  expect(log).toContain(`cwd ${third} command compose -f docker-compose.demo.yml --env-file .env.demo up -d`);
  expect(result.stdout.indexOf(`Restarting ${third}`)).toBeLessThan(result.stdout.indexOf(`Restarting ${target}`));
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
  const bin = path.join(dir, 'bin');
  mkdirSync(bin);
  const log = path.join(dir, 'commands');
  writeFileSync(log, '');
  for (const command of ['ssh', 'curl', 'git', 'docker']) {
    stub(path.join(bin, command), `printf '%s %s\\n' '${command}' "$*" >> "$COMMAND_LOG"`);
  }
  const env = { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}`, COMMAND_LOG: log };
  const result = spawnSync('bash', [process.env.DEPLOY_LOCAL_SCRIPT ?? localScript, '--dry-run'], {
    cwd: dir, encoding: 'utf8', env,
  });
  expect(result.status, result.stderr).toBe(0);
  expect(result.stdout).toContain('Dry run:');
  expect(result.stdout).toContain('http://localhost:3012/api/health');
  expect(readFileSync(log, 'utf8')).toBe('');
  const invalid = spawnSync('bash', [process.env.DEPLOY_LOCAL_SCRIPT ?? localScript, '--dry-run', 'foo'], {
    cwd: dir, encoding: 'utf8', env,
  });
  expect(invalid.status).toBe(2);
  expect(readFileSync(log, 'utf8')).toBe('');
});

test('prints manual rollback when the app image name changes', () => {
  const { result, log, target } = runDeploy({ failedHealth: true, changedImageName: true });
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain(`Manual rollback: cd ${target} && git reset --hard previous-commit`);
  expect(log).not.toContain('docker tag');
});

test('prints a manual rollback when the previous image is unavailable', () => {
  const { result, log, target } = runDeploy({ failedHealth: true, previousImage: false });
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain(`Manual rollback: cd ${target} && git reset --hard previous-commit && docker compose`);
  expect(log).not.toContain('docker tag');
});

test('prints manual rollback when tagging the previous image fails', () => {
  const { result, log, target } = runDeploy({ failedHealth: true, failedRollbackTag: true });
  expect(result.status).not.toBe(0);
  expect(log).toContain('docker tag sha256:previous starting-six-app');
  expect(log).not.toContain('up -d --no-build --force-recreate');
  expect(result.stderr).toContain(`Manual rollback: cd ${target} && git reset --hard previous-commit && docker compose -f docker-compose.demo.yml --env-file .env.demo up -d --build`);
});

test('prints manual rollback when restarting the previous image fails', () => {
  const { result, log, target } = runDeploy({ failedHealth: true, failedRollbackUp: true });
  expect(result.status).not.toBe(0);
  expect(log).toContain('docker tag sha256:previous starting-six-app');
  expect(log).toContain('up -d --no-build --force-recreate');
  expect(result.stderr).toContain(`Manual rollback: cd ${target} && git reset --hard previous-commit && docker compose -f docker-compose.demo.yml --env-file .env.demo up -d --build`);
});
