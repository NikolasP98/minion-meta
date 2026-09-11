import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfigError, loadConfig } from './config.js';

function environment(prefix: string): NodeJS.ProcessEnv {
  return {
    SHELLS_SHELL_ID: `${prefix}-shell`,
    SHELLS_GATEWAY_URL: `wss://${prefix}.invalid/ws`,
    SHELLS_DEVICE_TOKEN: `${prefix}-synthetic-token`,
    SHELLS_HARNESS: `${prefix}-harness`,
    SHELLS_HARNESS_VERSION: `${prefix}-version`,
    SHELLS_HARNESS_CMD: `${prefix}-command --acp`,
    SHELLS_HARNESS_WORKDIR: `/tmp/${prefix}-synthetic`,
    SHELLS_BACKUP_TARGET: `b2://${prefix}-synthetic/backups`,
    SHELLS_RECONNECT_MIN_MS: '1234',
    SHELLS_RECONNECT_MAX_MS: '43210',
    SHELLS_HEARTBEAT_MS: '5678',
  };
}

function ambient(values: NodeJS.ProcessEnv): void {
  for (const [key, value] of Object.entries(values)) vi.stubEnv(key, value);
}

afterEach(() => vi.unstubAllEnvs());

describe('configuration environment ownership', () => {
  it('uses every field from the supplied environment despite conflicting ambient values', () => {
    ambient({ ...environment('ambient'), SHELLS_RECONNECT_MIN_MS: '8', SHELLS_RECONNECT_MAX_MS: '9', SHELLS_HEARTBEAT_MS: '10' });
    const injected = Object.freeze(environment('injected'));
    expect(loadConfig(injected)).toEqual({
      shellId: 'injected-shell', gatewayUrl: 'wss://injected.invalid/ws',
      deviceToken: 'injected-synthetic-token', harness: 'injected-harness',
      harnessVersion: 'injected-version', harnessCommand: 'injected-command',
      harnessArgs: ['--acp'], harnessWorkDir: '/tmp/injected-synthetic',
      backupTarget: 'b2://injected-synthetic/backups', reconnectMinMs: 1234,
      reconnectMaxMs: 43210, heartbeatMs: 5678, durable: { mode: 'disabled' },
    });
    expect(injected).toEqual(environment('injected'));
  });

  it.each(['SHELLS_SHELL_ID', 'SHELLS_GATEWAY_URL', 'SHELLS_DEVICE_TOKEN', 'SHELLS_HARNESS', 'SHELLS_HARNESS_VERSION'])('does not fill missing %s from ambient state', (name) => {
    ambient(environment('ambient'));
    const injected = environment('injected'); delete injected[name];
    expect(() => loadConfig(injected)).toThrow(`Missing required env var: ${name}`);
  });

  it('uses defaults for missing injected optional integers despite ambient settings', () => {
    ambient(environment('ambient'));
    const injected = environment('injected');
    delete injected.SHELLS_RECONNECT_MIN_MS; delete injected.SHELLS_RECONNECT_MAX_MS; delete injected.SHELLS_HEARTBEAT_MS;
    expect(loadConfig(injected)).toMatchObject({ reconnectMinMs: 1000, reconnectMaxMs: 60_000, heartbeatMs: 15_000 });
  });

  it('validates the injected integer instead of accepting a valid ambient one', () => {
    ambient(environment('ambient'));
    expect(() => loadConfig({ ...environment('injected'), SHELLS_HEARTBEAT_MS: 'invalid' })).toThrow(ConfigError);
  });

  it('uses current ambient state when called without an argument', () => {
    ambient(environment('first'));
    expect(loadConfig()).toMatchObject({ shellId: 'first-shell', harnessCommand: 'first-command', heartbeatMs: 5678 });
    ambient(environment('second'));
    expect(loadConfig()).toMatchObject({ shellId: 'second-shell', harnessCommand: 'second-command' });
  });

  it('retains required command validation', () => {
    ambient(environment('ambient'));
    const injected = environment('injected'); delete injected.SHELLS_HARNESS_CMD;
    expect(() => loadConfig(injected)).toThrow('Missing required env var: SHELLS_HARNESS_CMD');
  });
});

describe('durable mode configuration', () => {
  const enabled = (over: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv => ({
    ...environment('durable'),
    SHELLS_HARNESS_WORKDIR: '/srv/agent/state',
    SHELLS_DURABLE_MODE: 'required',
    SHELLS_DURABLE_JOURNAL_PATH: '/var/lib/shells/journal.db',
    ...over,
  });

  it('is disabled when the block is absent, leaving every other field unchanged', () => {
    const injected = environment('injected');
    const { durable, ...rest } = loadConfig(injected);
    expect(durable).toEqual({ mode: 'disabled' });
    delete injected.SHELLS_DURABLE_MODE;
    expect(rest).toEqual(expect.objectContaining({ shellId: 'injected-shell', harnessWorkDir: '/tmp/injected-synthetic' }));
  });

  it('cannot be enabled from ambient state when the explicit environment omits it', () => {
    ambient({ ...enabled(), SHELLS_DURABLE_MODE: 'required' });
    expect(loadConfig(environment('injected')).durable).toEqual({ mode: 'disabled' });
  });

  it('yields exactly the declared values for a complete valid block', () => {
    expect(loadConfig(enabled({ SHELLS_DURABLE_MAX_RUNS: '32', SHELLS_DURABLE_MAX_OUTCOME_BYTES: '4096' })).durable)
      .toEqual({ mode: 'required', journalPath: '/var/lib/shells/journal.db', maxRuns: 32, maxOutcomeBytes: 4096 });
  });

  it('applies selected defaults for absent finite policy values', () => {
    expect(loadConfig(enabled()).durable).toEqual({
      mode: 'required', journalPath: '/var/lib/shells/journal.db', maxRuns: 1024, maxOutcomeBytes: 57_344,
    });
  });

  it.each(['enabled', 'true', '1', 'Required', 'off'])('rejects the unrecognized mode %s', (mode) => {
    expect(() => loadConfig(enabled({ SHELLS_DURABLE_MODE: mode }))).toThrow(ConfigError);
  });

  it('requires a journal path when enabled', () => {
    const injected = enabled(); delete injected.SHELLS_DURABLE_JOURNAL_PATH;
    expect(() => loadConfig(injected)).toThrow('Missing required env var: SHELLS_DURABLE_JOURNAL_PATH');
  });

  it.each([
    ['relative', 'var/lib/shells/journal.db'],
    ['dot-segment', '/var/lib/shells/../../journal.db'],
    ['traversal into the harness tree', '/srv/agent/state/../state/journal.db'],
  ])('rejects a %s journal path', (_name, path) => {
    expect(() => loadConfig(enabled({ SHELLS_DURABLE_JOURNAL_PATH: path }))).toThrow(ConfigError);
  });

  it.each(['/srv/agent/state', '/srv/agent/state/journal.db', '/srv/agent/state/nested/journal.db'])(
    'rejects the journal path %s inside the restorable harness tree', (path) => {
      expect(() => loadConfig(enabled({ SHELLS_DURABLE_JOURNAL_PATH: path }))).toThrow('outside SHELLS_HARNESS_WORKDIR');
    });

  it.each(['0', '-1', '1.5', 'many', '1e3', ' '])('rejects the finite policy value %s', (value) => {
    expect(() => loadConfig(enabled({ SHELLS_DURABLE_MAX_RUNS: value }))).toThrow(ConfigError);
    expect(() => loadConfig(enabled({ SHELLS_DURABLE_MAX_OUTCOME_BYTES: value }))).toThrow(ConfigError);
  });

  it('rejects an outcome byte budget above the canonical record limit', () => {
    expect(() => loadConfig(enabled({ SHELLS_DURABLE_MAX_OUTCOME_BYTES: '65537' }))).toThrow('must not exceed 65536');
    expect(loadConfig(enabled({ SHELLS_DURABLE_MAX_OUTCOME_BYTES: '65536' })).durable).toMatchObject({ maxOutcomeBytes: 65_536 });
  });
});
