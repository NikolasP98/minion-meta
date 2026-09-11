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
  /** Durable outcome mode. Absence means disabled; enablement is never inferred. */
  durable: BridgeDurableConfig;
}

/**
 * Explicit durable-sender selection. `required` refuses legacy `shells.invoke`
 * and executes only under gateway-issued admissions.
 */
export type BridgeDurableConfig =
  | { mode: 'disabled' }
  | { mode: 'required'; journalPath: string; maxRuns: number; maxOutcomeBytes: number };

// Mirrors SHELL_DURABLE_V1_PROFILE.maxOutcomeBytes / OUTCOME_LIMITS.recordBytes as
// literals: configuration produces values and never imports the durable contract.
// TODO(handoff): Size retained runs and outcome bytes from observed VM disk and run
// volume instead of these selected defaults, and qualify the untested process/power-loss
// class. See meta proposals/2026-09-08-platform-qc-remediation.md (Shells lifecycle).
const DURABLE_DEFAULT_MAX_RUNS = 1024;
const DURABLE_DEFAULT_MAX_OUTCOME_BYTES = 57_344;
const DURABLE_RECORD_BYTES = 65_536;

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

/** Strict positive safe integer — rejects fractional, trailing-junk and non-numeric text. */
function durableInt(env: NodeJS.ProcessEnv, name: string, fallback: number): number {
  const raw = env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = /^\d+$/.test(raw) ? Number(raw) : Number.NaN;
  if (!Number.isSafeInteger(n) || n <= 0) {
    throw new ConfigError(`Env var ${name} must be a positive integer, got: ${raw}`);
  }
  return n;
}

function loadDurable(env: NodeJS.ProcessEnv, harnessWorkDir: string): BridgeDurableConfig {
  const mode = env.SHELLS_DURABLE_MODE?.trim();
  if (mode === undefined || mode === '' || mode === 'disabled') return { mode: 'disabled' };
  if (mode !== 'required') {
    throw new ConfigError(`Env var SHELLS_DURABLE_MODE must be "disabled" or "required", got: ${mode}`);
  }
  const journalPath = env.SHELLS_DURABLE_JOURNAL_PATH;
  if (!journalPath || journalPath.trim() === '') {
    throw new ConfigError('Missing required env var: SHELLS_DURABLE_JOURNAL_PATH');
  }
  if (!journalPath.startsWith('/') || journalPath.split('/').includes('..')) {
    throw new ConfigError(`SHELLS_DURABLE_JOURNAL_PATH must be an absolute path without ".." segments, got: ${journalPath}`);
  }
  // The journal must survive a restore that replaces the harness tree wholesale.
  // The journal's own trusted-parent/single-link/0600 checks remain the real boundary.
  const workDir = harnessWorkDir.replace(/\/+$/, '');
  if (journalPath === workDir || journalPath.startsWith(`${workDir}/`)) {
    throw new ConfigError('SHELLS_DURABLE_JOURNAL_PATH must be outside SHELLS_HARNESS_WORKDIR');
  }
  const maxOutcomeBytes = durableInt(env, 'SHELLS_DURABLE_MAX_OUTCOME_BYTES', DURABLE_DEFAULT_MAX_OUTCOME_BYTES);
  if (maxOutcomeBytes > DURABLE_RECORD_BYTES) {
    throw new ConfigError(`Env var SHELLS_DURABLE_MAX_OUTCOME_BYTES must not exceed ${DURABLE_RECORD_BYTES}`);
  }
  return {
    mode: 'required',
    journalPath,
    maxRuns: durableInt(env, 'SHELLS_DURABLE_MAX_RUNS', DURABLE_DEFAULT_MAX_RUNS),
    maxOutcomeBytes,
  };
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

  const harnessWorkDir = env.SHELLS_HARNESS_WORKDIR ?? '/home/agent/state';

  return {
    shellId: required(env, 'SHELLS_SHELL_ID'),
    gatewayUrl: required(env, 'SHELLS_GATEWAY_URL'),
    deviceToken: required(env, 'SHELLS_DEVICE_TOKEN'),
    harness: required(env, 'SHELLS_HARNESS'),
    harnessVersion: required(env, 'SHELLS_HARNESS_VERSION'),
    harnessCommand,
    harnessArgs,
    harnessWorkDir,
    backupTarget: env.SHELLS_BACKUP_TARGET,
    reconnectMinMs: optionalInt(env, 'SHELLS_RECONNECT_MIN_MS', 1000),
    reconnectMaxMs: optionalInt(env, 'SHELLS_RECONNECT_MAX_MS', 60_000),
    heartbeatMs: optionalInt(env, 'SHELLS_HEARTBEAT_MS', 15_000),
    durable: loadDurable(env, harnessWorkDir),
  };
}
