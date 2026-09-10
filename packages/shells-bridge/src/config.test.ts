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
      reconnectMaxMs: 43210, heartbeatMs: 5678,
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
