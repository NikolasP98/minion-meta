// Bridge configuration — sourced from environment.
// Set by the exe.dev VM provisioning step (systemd unit env file).

export interface BridgeConfig {
  /** Stable shell identifier issued by the gateway at provision time. */
  shellId: string;
  /** Gateway WSS URL, e.g. "wss://gateway.example.com/ws". */
  gatewayUrl: string;
  /** One-time device token for `shells.register`. */
  deviceToken: string;
  /** Harness identifier — selects which ACP adapter to instantiate. */
  harness: 'hermes' | 'claude-code' | 'codex' | string;
  /** Version string of the harness binary baked into the image. */
  harnessVersion: string;
  /** Command + args spawned to run the harness via ACP. */
  harnessCommand: string;
  harnessArgs: string[];
  /** Working directory for the harness process. State lives here. */
  harnessWorkDir: string;
  /**
   * Optional B2 (or any rclone-compatible) target for backups.
   * Format: "b2://bucket/path/<shellId>/" — bridge appends `<backupId>.tar.gz`.
   */
  backupTarget?: string;
  /** Reconnect floor (ms). Bridge backs off exponentially up to a cap. */
  reconnectMinMs: number;
  reconnectMaxMs: number;
  /** Heartbeat cadence (ms) — overridden by server response to shells.register. */
  heartbeatMs: number;
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name];
  if (!value || value.trim() === '') {
    throw new ConfigError(`Missing required env var: ${name}`);
  }
  return value;
}

function optionalInt(env: NodeJS.ProcessEnv, name: string, fallback: number): number {
  const raw = env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n)) {
    throw new ConfigError(`Env var ${name} must be an integer, got: ${raw}`);
  }
  return n;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): BridgeConfig {
  // Every field uses this environment; explicit injection never falls back to ambient state.
  const cmdRaw = env.SHELLS_HARNESS_CMD;
  if (!cmdRaw) {
    throw new ConfigError('Missing required env var: SHELLS_HARNESS_CMD');
  }
  // TODO(handoff): Define structured argv and verify provisioned systemd environment;
  // whitespace splitting cannot preserve quoted arguments. See the Shells lifecycle
  // item in proposals/2026-09-08-platform-qc-remediation.md and 11-ACP-RESEARCH.md.
  const [harnessCommand, ...harnessArgs] = cmdRaw.split(/\s+/);
  if (!harnessCommand) {
    throw new ConfigError('SHELLS_HARNESS_CMD is empty');
  }

  return {
    shellId: required(env, 'SHELLS_SHELL_ID'),
    gatewayUrl: required(env, 'SHELLS_GATEWAY_URL'),
    deviceToken: required(env, 'SHELLS_DEVICE_TOKEN'),
    harness: required(env, 'SHELLS_HARNESS'),
    harnessVersion: required(env, 'SHELLS_HARNESS_VERSION'),
    harnessCommand,
    harnessArgs,
    harnessWorkDir: env.SHELLS_HARNESS_WORKDIR ?? '/home/agent/state',
    backupTarget: env.SHELLS_BACKUP_TARGET,
    reconnectMinMs: optionalInt(env, 'SHELLS_RECONNECT_MIN_MS', 1000),
    reconnectMaxMs: optionalInt(env, 'SHELLS_RECONNECT_MAX_MS', 60_000),
    heartbeatMs: optionalInt(env, 'SHELLS_HEARTBEAT_MS', 15_000),
  };
}
