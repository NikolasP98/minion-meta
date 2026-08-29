import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import {
  processMatchesState,
  processStartTicks,
  terminateState,
} from '../packages/workstation-image/scripts/minion-preview';

async function detachedSleeper() {
  const child = spawn('sleep', ['30'], { detached: true, stdio: 'ignore' });
  child.unref();
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const ticks = await processStartTicks(child.pid);
    if (ticks) return { child, ticks };
    await delay(10);
  }
  throw new Error('could not observe sleeper process identity');
}

async function processStops(pid) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      process.kill(pid, 0);
    } catch {
      return true;
    }
    await delay(10);
  }
  return false;
}

test('preview termination refuses a live PID with a different birth identity', async () => {
  const { child, ticks } = await detachedSleeper();
  try {
    const stale = { pid: child.pid, processStartTicks: `${Number(ticks) + 1}` };
    assert.equal(await processMatchesState(stale), false);
    assert.equal(await terminateState(stale), false);
    process.kill(child.pid, 0);
  } finally {
    try { process.kill(-child.pid, 'SIGKILL'); } catch { /* already stopped */ }
  }
});

test('preview termination accepts the matching process birth identity', async () => {
  const { child, ticks } = await detachedSleeper();
  const current = { pid: child.pid, processStartTicks: ticks };
  assert.equal(await processMatchesState(current), true);
  assert.equal(await terminateState(current), true);
  assert.equal(await processStops(child.pid), true);
});

test('pidfd termination reaches the timeout supervisor command', async () => {
  const supervisor = spawn(
    'nice',
    ['-n', '5', 'timeout', '--signal=TERM', '--kill-after=1s', '30s', 'sh', '-c', 'echo $$; exec sleep 30'],
    { detached: true, stdio: ['ignore', 'pipe', 'ignore'] },
  );
  const [output] = await once(supervisor.stdout, 'data');
  const commandPid = Number(String(output).trim());
  const ticks = await processStartTicks(supervisor.pid);
  assert.ok(ticks);
  assert.ok(Number.isInteger(commandPid));
  try {
    assert.equal(await terminateState({ pid: supervisor.pid, processStartTicks: ticks }), true);
    assert.equal(await processStops(commandPid), true);
  } finally {
    try { process.kill(-supervisor.pid, 'SIGKILL'); } catch { /* already stopped */ }
  }
});

test('status expires and terminates only the process recorded by the state file', async () => {
  const stateDir = await mkdtemp(join(tmpdir(), 'minion-preview-test-'));
  const { child, ticks } = await detachedSleeper();
  try {
    await writeFile(join(stateDir, 'expired.json'), JSON.stringify({
      name: 'expired',
      port: 4173,
      pid: child.pid,
      processStartTicks: ticks,
      url: 'http://127.0.0.1:4173/',
      expiresAt: new Date(Date.now() - 1_000).toISOString(),
    }));
    const result = spawnSync(
      process.execPath,
      ['packages/workstation-image/scripts/minion-preview', 'status', '--json'],
      { cwd: new URL('..', import.meta.url), encoding: 'utf8', env: { ...process.env, MINION_PREVIEW_STATE_DIR: stateDir } },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), []);
    assert.equal(await processStops(child.pid), true);
  } finally {
    try { process.kill(-child.pid, 'SIGKILL'); } catch { /* already stopped */ }
    await rm(stateDir, { recursive: true, force: true });
  }
});
