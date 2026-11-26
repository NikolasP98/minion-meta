// The Codex claude-mem wrapper must follow whichever claude-mem runtime is installed,
// because claude-mem 17 deletes old version folders. Both resolvers (hook forwarder and
// MCP launcher) must pick the same folder.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const plugin = join(dirname(fileURLToPath(import.meta.url)), '..', 'codex', 'plugins', 'claude-mem');
const forwarder = join(plugin, 'hooks', 'claude-mem-forwarder.sh');
const mcpLauncher = JSON.parse(readFileSync(join(plugin, '.mcp.json'), 'utf8')).mcpServers['mcp-search'].args[1];

function runtime(config, version, { mcpCommand = 'node', orphaned = false, scripts = true } = {}) {
  const root = join(config, 'plugins', 'cache', 'thedotmack', 'claude-mem', version);
  mkdirSync(join(root, 'scripts'), { recursive: true });
  if (scripts) {
    for (const f of ['bun-runner.js', 'worker-service.cjs', 'mcp-server.cjs']) writeFileSync(join(root, 'scripts', f), '');
  }
  writeFileSync(join(root, '.mcp.json'), JSON.stringify({ mcpServers: { 'mcp-search': { command: mcpCommand } } }));
  if (orphaned) writeFileSync(join(root, '.orphaned_at'), '1');
  return root;
}

function resolveBoth(config) {
  const env = { ...process.env, CLAUDE_CONFIG_DIR: config, CLAUDE_MEM_PLUGIN_ROOT: '', SHELL: '/bin/sh' };
  const hook = execFileSync('bash', [forwarder, 'resolve'], { env, encoding: 'utf8' }).trim();
  const mcp = execFileSync(process.execPath, ['-e', mcpLauncher], {
    env: { ...env, CLAUDE_MEM_RESOLVE_ONLY: '1' },
    encoding: 'utf8',
  }).trim();
  return { hook, mcp };
}

test('picks the newest release, skipping prereleases, orphans and incomplete folders', () => {
  const config = mkdtempSync(join(tmpdir(), 'cm-resolver-'));
  try {
    runtime(config, '12.4.7', { mcpCommand: 'bun' });
    runtime(config, '9.0.0');
    const v17 = runtime(config, '17.0.0');
    runtime(config, '17.0.0-beta.1');
    runtime(config, '18.0.0', { orphaned: true });
    runtime(config, '19.0.0', { scripts: false });
    const { hook, mcp } = resolveBoth(config);
    assert.equal(hook, v17);
    assert.equal(mcp, `node ${v17}`);
  } finally {
    rmSync(config, { recursive: true, force: true });
  }
});

test('runs the MCP server with the interpreter the runtime declares (12.4.7 needs bun)', () => {
  const config = mkdtempSync(join(tmpdir(), 'cm-resolver-'));
  try {
    const v12 = runtime(config, '12.4.7', { mcpCommand: 'bun' });
    const { hook, mcp } = resolveBoth(config);
    assert.equal(hook, v12);
    assert.equal(mcp, `bun ${v12}`);
  } finally {
    rmSync(config, { recursive: true, force: true });
  }
});
