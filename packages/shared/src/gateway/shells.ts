// Shells protocol — golden agents on exe.dev VMs.
//
// Spec: specs/2026-05-20-shells-golden-agents.md
//
// Wire shape follows the existing gateway frame protocol:
//   - RPC : RequestFrame { type:'req',  id, method:'shells.*', params } ⇄ ResponseFrame
//   - Event: EventFrame  { type:'event', event:'shell.*', payload }
//
// Two callers exist:
//   1. Hub / channel clients invoke the gateway as usual (shells.list, shells.provision,
//      shells.invoke, shells.archive, …)
//   2. The in-VM `shells-bridge` process dials the gateway with a per-shell deviceToken,
//      then calls shells.register to bind its WS connection to its shellId. Subsequent
//      shells.invoke from other callers is forwarded by the gateway over this same
//      connection.

// Durable v1 is additive. These helpers validate data, never caller authority.
export interface ShellOutcomeLimits {
  identifierBytes: number;
  textBytes: number;
  recordBytes: number;
}
/** Fixed v1 wire limits; input text and outcome metadata have distinct budgets. */
export const SHELL_DURABLE_V1_INPUT_POLICY = Object.freeze({
  contract: Object.freeze({ identifierBytes: 256, textBytes: 65536, recordBytes: 524288 } as const),
  organizationBytes: 256,
  invocationKeyBytes: 256,
  envelopeBytes: 524288,
} as const);
export const SHELL_DURABLE_V1_OUTCOME_LIMITS = Object.freeze({
  identifierBytes: 256,
  textBytes: 4096,
  recordBytes: 65536,
} as const);
/** Logical serialized reservation only; excludes SQLite/WAL/index and filesystem overhead. */
// TODO(handoff): Receiver14-12 and sender11-03 must explicitly adopt this fixed profile and enforce its aggregate/metadata reservation; constants alone reserve nothing. See meta proposals/2026-09-08-platform-qc-remediation.md (Shells lifecycle) and D360-16.
export const SHELL_DURABLE_V1_PROFILE = Object.freeze({
  version: 1,
  input: SHELL_DURABLE_V1_INPUT_POLICY,
  outcome: SHELL_DURABLE_V1_OUTCOME_LIMITS,
  maxOutcomeBytes: 57344,
  maxReceiptBytes: 8192,
  maxCombinedOutcomeBytes: 65536,
  maxAdmissionMetadataBytes: 16384,
  reservedRunBytes: 81920,
} as const);
export interface ShellRunIdentity {
  shellId: string;
  runId: string;
  sessionId: string;
  invocationId: string;
  inputDigest: string;
}
export interface ShellRunAdmission extends ShellRunIdentity {
  version: 1;
  startedAt: number;
}
/** Gateway-internal forwarding only; never accept an admission from a caller. */
// TODO(handoff): Receiver14-12 must validate the complete input envelope, scope the caller key and compute its semantic input digest before forwarding; admission normalization alone grants no authority. See meta proposals/2026-09-08-platform-qc-remediation.md (Shells lifecycle).
export interface ShellAdmittedInvoke {
  version: 1;
  admission: ShellRunAdmission;
  input: ShellsInvokeParams['input'];
}
export interface ShellRunOutcome extends ShellRunIdentity {
  version: 1;
  eventId: string;
  state: 'final' | 'aborted' | 'error';
  durationMs: number;
  stopReason?: string;
  /** Public-safe text supplied by the sender; byte validation is not secret redaction. */
  errorMessage?: string;
  outcomeDigest: string;
}
export interface ShellOutcomeReceipt {
  version: 1;
  shellId: string;
  runId: string;
  eventId: string;
  outcomeDigest: string;
  receiptId: string;
  committedAt: number;
}
export interface ShellRunObservation {
  version: 1;
  kind: 'unresolved' | 'cancel_requested' | 'cancel_acknowledged' | 'cancel_unconfirmed';
  at: number;
  /** Bounded non-secret explanation, not raw ACP errors or output. */
  reason?: string;
}
export type ShellsCommitOutcomeParams = ShellRunOutcome;
export type ShellsCommitOutcomeResponse = ShellOutcomeReceipt;
export interface ShellsGetOutcomeParams { version: 1; shellId: string; runId: string }
export type ShellsGetOutcomeResponse =
  | { version: 1; status: 'not_found' | 'unresolved'; shellId: string; runId: string }
  | { version: 1; status: 'committed'; outcome: ShellRunOutcome; receipt: ShellOutcomeReceipt };

export class ShellOutcomeValidationError extends Error {
  constructor() { super('INVALID_SHELL_OUTCOME'); this.name = 'ShellOutcomeValidationError'; }
}
function invalidOutcome(): never { throw new ShellOutcomeValidationError(); }
const utf8 = new TextEncoder();
export function shellOutcomeByteLength(value: string): number { return utf8.encode(value).byteLength; }
export function normalizeShellOutcomeLimits(value: unknown): ShellOutcomeLimits {
  const item = outcomeObject(value, ['identifierBytes', 'textBytes', 'recordBytes']);
  return { identifierBytes: positiveLimit(item.identifierBytes), textBytes: positiveLimit(item.textBytes), recordBytes: positiveLimit(item.recordBytes) };
}
function positiveLimit(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) return invalidOutcome();
  return value;
}
function outcomeObject(value: unknown, allowed: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalidOutcome();
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== null && prototype !== Object.prototype) return invalidOutcome();
  const result: Record<string, unknown> = Object.create(null);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !allowed.includes(key)) return invalidOutcome();
    const field = Object.getOwnPropertyDescriptor(value, key);
    if (!field || !('value' in field) || !field.enumerable) return invalidOutcome();
    result[key] = field.value;
  }
  return result;
}
function outcomeString(value: unknown, bytes: number, empty = false): string {
  if (typeof value !== 'string' || (!empty && !value.length) || value.length > bytes) return invalidOutcome();
  // Reject unpaired UTF-16 surrogates instead of silently replacing them in UTF-8.
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(++i);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return invalidOutcome();
    } else if (code >= 0xdc00 && code <= 0xdfff) return invalidOutcome();
  }
  if (shellOutcomeByteLength(value) > bytes) return invalidOutcome();
  return value;
}
function outcomeInteger(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) return invalidOutcome();
  return value === 0 ? 0 : value;
}
function digest(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) return invalidOutcome();
  return value;
}
function version(item: Record<string, unknown>): 1 { if (item.version !== 1) return invalidOutcome(); return 1; }
function bounded<T extends object>(item: T, limits: ShellOutcomeLimits): T {
  if (shellOutcomeByteLength(JSON.stringify(item)) > limits.recordBytes) return invalidOutcome();
  return item;
}
const identityKeys = ['shellId', 'runId', 'sessionId', 'invocationId', 'inputDigest'];
function identity(item: Record<string, unknown>, limits: ShellOutcomeLimits): ShellRunIdentity {
  return {
    shellId: outcomeString(item.shellId, limits.identifierBytes), runId: outcomeString(item.runId, limits.identifierBytes),
    sessionId: outcomeString(item.sessionId, limits.identifierBytes), invocationId: outcomeString(item.invocationId, limits.identifierBytes), inputDigest: digest(item.inputDigest),
  };
}
export function normalizeShellRunAdmission(value: unknown, policy: unknown): ShellRunAdmission {
  const limits = normalizeShellOutcomeLimits(policy);
  const item = outcomeObject(value, ['version', ...identityKeys, 'startedAt']);
  return bounded({ version: version(item), ...identity(item, limits), startedAt: outcomeInteger(item.startedAt) }, limits);
}
export function normalizeShellRunOutcome(value: unknown, policy: unknown): ShellRunOutcome {
  const limits = normalizeShellOutcomeLimits(policy);
  const item = outcomeObject(value, ['version', ...identityKeys, 'eventId', 'state', 'durationMs', 'stopReason', 'errorMessage', 'outcomeDigest']);
  if (item.state !== 'final' && item.state !== 'aborted' && item.state !== 'error') return invalidOutcome();
  return bounded({
    version: version(item), ...identity(item, limits), eventId: outcomeString(item.eventId, limits.identifierBytes), state: item.state,
    durationMs: outcomeInteger(item.durationMs),
    ...(item.stopReason === undefined ? {} : { stopReason: outcomeString(item.stopReason, limits.textBytes, true) }),
    ...(item.errorMessage === undefined ? {} : { errorMessage: outcomeString(item.errorMessage, limits.textBytes, true) }),
    outcomeDigest: digest(item.outcomeDigest),
  }, limits);
}
export function shellRunOutcomeText(value: unknown, policy: unknown): string {
  const o = normalizeShellRunOutcome(value, policy);
  return JSON.stringify(['minion.shells.outcome', 1, o.shellId, o.runId, o.sessionId, o.invocationId, o.inputDigest, o.eventId, o.state, o.durationMs, o.stopReason ?? null, o.errorMessage ?? null]);
}
export function normalizeShellOutcomeReceipt(value: unknown, policy: unknown): ShellOutcomeReceipt {
  const limits = normalizeShellOutcomeLimits(policy);
  const item = outcomeObject(value, ['version', 'shellId', 'runId', 'eventId', 'outcomeDigest', 'receiptId', 'committedAt']);
  return bounded({ version: version(item), shellId: outcomeString(item.shellId, limits.identifierBytes), runId: outcomeString(item.runId, limits.identifierBytes),
    eventId: outcomeString(item.eventId, limits.identifierBytes), outcomeDigest: digest(item.outcomeDigest), receiptId: outcomeString(item.receiptId, limits.identifierBytes), committedAt: outcomeInteger(item.committedAt) }, limits);
}
export function normalizeShellRunObservation(value: unknown, policy: unknown): ShellRunObservation {
  const limits = normalizeShellOutcomeLimits(policy);
  const item = outcomeObject(value, ['version', 'kind', 'at', 'reason']);
  if (item.kind !== 'unresolved' && item.kind !== 'cancel_requested' && item.kind !== 'cancel_acknowledged' && item.kind !== 'cancel_unconfirmed') return invalidOutcome();
  return bounded({ version: version(item), kind: item.kind, at: outcomeInteger(item.at), ...(item.reason === undefined ? {} : { reason: outcomeString(item.reason, limits.textBytes, true) }) }, limits);
}
export function normalizeShellsGetOutcomeParams(value: unknown, policy: unknown): ShellsGetOutcomeParams {
  const limits = normalizeShellOutcomeLimits(policy);
  const item = outcomeObject(value, ['version', 'shellId', 'runId']);
  return bounded({ version: version(item), shellId: outcomeString(item.shellId, limits.identifierBytes), runId: outcomeString(item.runId, limits.identifierBytes) }, limits);
}
export function normalizeShellsGetOutcomeResponse(value: unknown, policy: unknown): ShellsGetOutcomeResponse {
  const limits = normalizeShellOutcomeLimits(policy);
  const item = outcomeObject(value, ['version', 'status', 'shellId', 'runId', 'outcome', 'receipt']);
  if (item.status === 'not_found' || item.status === 'unresolved') {
    if ('outcome' in item || 'receipt' in item) return invalidOutcome();
    const query = normalizeShellsGetOutcomeParams({ version: item.version, shellId: item.shellId, runId: item.runId }, limits);
    return bounded({ ...query, status: item.status }, limits);
  }
  if (item.status !== 'committed' || 'shellId' in item || 'runId' in item) return invalidOutcome();
  const outcome = normalizeShellRunOutcome(item.outcome, limits);
  const receipt = normalizeShellOutcomeReceipt(item.receipt, limits);
  if (outcome.shellId !== receipt.shellId || outcome.runId !== receipt.runId || outcome.eventId !== receipt.eventId || outcome.outcomeDigest !== receipt.outcomeDigest) return invalidOutcome();
  return bounded({ version: version(item), status: 'committed', outcome, receipt }, limits);
}

/** Validates a required admission response, not live storage readiness or execution. */
export function normalizeShellsInvokeDurableResponse(value: unknown): ShellsInvokeDurableResponse {
  const limits = SHELL_DURABLE_V1_OUTCOME_LIMITS;
  const item = outcomeObject(value, ['version', 'durability', 'runId', 'startedAt']);
  if (item.durability !== 'required') return invalidOutcome();
  return bounded({
    version: version(item), durability: 'required' as const,
    runId: outcomeString(item.runId, limits.identifierBytes), startedAt: outcomeInteger(item.startedAt),
  }, limits);
}

// =============================================================================
// RPC method names — use these constants on both client and server.
// =============================================================================
export const SHELLS_METHODS = {
  // Caller-side (hub / channel → gateway)
  list: 'shells.list',
  get: 'shells.get',
  quota: 'shells.quota',
  provision: 'shells.provision',
  access: 'shells.access',
  invoke: 'shells.invoke',
  // TODO(handoff): Caller routing must require this method/response and never fall back to legacy invocation; receiver must acknowledge only committed admission. See meta proposals/2026-09-08-platform-qc-remediation.md (Shells lifecycle) and D360-16.
  invokeDurable: 'shells.invoke_durable',
  cancel: 'shells.cancel',
  archive: 'shells.archive',
  wake: 'shells.wake',
  restart: 'shells.restart',
  destroy: 'shells.destroy',
  backupNow: 'shells.backup_now',
  listBackups: 'shells.list_backups',
  update: 'shells.update', // mutate name / archiveIdleMs / backupCadence / etc.

  // Bridge-side (in-VM bridge → gateway)
  register: 'shells.register',
  heartbeat: 'shells.heartbeat',
  fatal: 'shells.fatal',
  commitOutcome: 'shells.commit_outcome',
  getOutcome: 'shells.get_outcome',
} as const;

// =============================================================================
// Event names emitted by the gateway.
// =============================================================================
export const SHELLS_EVENTS = {
  online: 'shell.online',
  archived: 'shell.archived',
  errored: 'shell.error',
  delta: 'shell.delta',
  final: 'shell.final',
  backupDone: 'shell.backup_done',
  quotaChanged: 'shells.quota_changed',
} as const;

// =============================================================================
// Domain types
// =============================================================================

/** Identifier of the primary agent harness running inside a workspace. */
export type ShellHarness = 'hermes' | 'claude-code' | 'opencode' | 'minion-drone' | 'pi' | (string & {});

/**
 * Installable components exposed by the workspace provisioner. Some entries
 * are agent runtimes while others are user-facing applications; keeping one
 * ordered manifest makes a provision request reproducible across providers.
 */
export const SHELL_RUNTIME_IDS = [
  'hermes',
  'obsidian-cli',
  'chromium',
  'claude-code',
  'opencode',
  'minion-drone',
  'pi',
] as const;
export type ShellRuntime = (typeof SHELL_RUNTIME_IDS)[number];

export type ShellProvider = 'exedev' | (string & {});

export interface ShellMachineSpec {
  cpu: number;
  memoryMB: number;
  diskGB: number;
}

/** Provider-neutral, versioned base machine definition. */
export interface ShellBlueprint {
  id: string;
  version: string;
  distribution: string;
  desktop: string;
  guiTransport: 'novnc' | (string & {});
  defaultSpec: ShellMachineSpec;
  defaultRuntimes: ShellRuntime[];
}

export const DEFAULT_SHELL_BLUEPRINT: ShellBlueprint = {
  id: 'minion-workstation-v1',
  version: '1',
  distribution: 'ubuntu-24.04',
  desktop: 'xfce',
  guiTransport: 'novnc',
  defaultSpec: { cpu: 2, memoryMB: 8192, diskGB: 100 },
  defaultRuntimes: ['hermes'],
};

/** Lifecycle state. */
export type ShellStatus =
  | 'provisioning'  // exe.dev `new` issued, bridge has not yet registered
  | 'online'        // bridge WS connected and registered
  | 'archived'      // VM rm'd, state in B2, can be woken on demand
  | 'error';        // failed provision / unreachable / backup-stuck / restore-failed

/** Reason qualifier accompanying status="error". */
export type ShellErrorReason =
  | 'provision_failed'
  | 'bridge_unreachable'
  | 'backup_stuck'
  | 'restore_failed'
  | 'exedev_outage'
  | 'unknown';

/** Backup cadence. `manual` means no automatic backups; user triggers via shells.backup_now. */
export type ShellBackupCadence = 'hourly' | 'daily' | 'weekly' | 'manual';

/** One shell row as returned by shells.list / shells.get. Never contains secrets. */
export interface ShellSummary {
  shellId: string;
  /** Owning organization. Caller-side handlers must scope access to this value. */
  orgId: string;
  vmName: string;          // exe.dev VM name (1:1 with shellId)
  displayName: string;     // user-chosen label
  provider: ShellProvider;
  /** Versioned provider-neutral machine definition (for example minion-workstation-v1). */
  blueprint: string;
  /** True for the first/default workspace assigned to an organization. */
  isDefault: boolean;
  harness: ShellHarness;
  runtimes: ShellRuntime[];
  image: string;           // baked image, e.g. "minionstack/hermes-shell:v1"
  region: string;          // exe.dev region code, e.g. "lax"
  status: ShellStatus;
  errorReason?: ShellErrorReason;
  errorMessage?: string;
  cpu: number;
  diskGB: number;
  memoryMB: number;
  /** Provider access metadata only. These fields never contain credentials. */
  sshHost?: string;
  sshCommand?: string;
  terminalUrl?: string;
  guiUrl?: string;
  noVncUrl?: string;
  /** Null = always-on (auto-archive disabled). */
  archiveIdleMs: number | null;
  backupCadence: ShellBackupCadence;
  backupTarget: string;    // e.g. "b2://minion-shells/<shellId>/"
  lastInvokeAt: number | null;
  lastBackupAt: number | null;
  lastBackupBytes: number | null;
  createdAt: number;
  updatedAt: number;
}

/** Quota snapshot returned by shells.quota. */
export interface ShellsQuota {
  shells: { used: number; limit: number };           // VM-slot count
  diskGB: { used: number; limit: number };           // sum of active VM disks
  memoryMB: { used: number; limit: number };         // sum of active VM RAM
  shelleyUSD: { used: number; limit: number };       // exe.dev Shelley allowance, monthly
  egressGB: { used: number; limit: number };         // monthly egress
  /** Soft headroom — used by the provisioner to refuse new shells before the hard cap. */
  headroom: { diskGB: number };
}

// =============================================================================
// Request / response payloads
// =============================================================================

/** shells.list — no params. Returns ShellSummary[]. */
export interface ShellsListResponse {
  shells: ShellSummary[];
}

/** shells.get */
export interface ShellsGetParams {
  shellId: string;
}
export type ShellsGetResponse = ShellSummary;

/** shells.quota — no params. */
export type ShellsQuotaResponse = ShellsQuota;

/** shells.provision */
export interface ShellsProvisionParams {
  displayName: string;
  harness: ShellHarness;
  /** Optional explicit org for service/admin callers. Gateways derive it from JWT otherwise. */
  orgId?: string;
  provider?: ShellProvider;   // default: gateway-configured provider
  /** Blueprint id. `image` remains accepted as a backwards-compatible alias. */
  blueprint?: string;
  image?: string;
  region?: string;            // default: gateway-configured region
  cpu?: number;               // default 2
  diskGB?: number;            // default 100
  memoryMB?: number;          // default 8192
  /** User-selected runtime inventory. Independent of the Hermes control bridge harness. */
  runtimes?: ShellRuntime[];  // default ['hermes']
  archiveIdleMs?: number | null; // default null (always-on)
  backupCadence?: ShellBackupCadence; // default 'daily'
  /** Explicitly request the org's default workspace. Idempotent when one exists. */
  isDefault?: boolean;
  /** Optional initial prompt forwarded to the harness on first boot. */
  initialPrompt?: string;
}
export interface ShellsProvisionResponse {
  shellId: string;
  vmName: string;
  status: ShellStatus;       // typically 'provisioning' on return
  /** Current summary, including non-secret provider access metadata when available. */
  shell?: ShellSummary;
}

export interface ShellsAccessParams {
  shellId: string;
  kind: 'desktop' | 'terminal';
}

export interface ShellsAccessResponse {
  /** Authenticated provider URL. It never embeds provider credentials. */
  url: string;
  token?: string;
}

/** shells.invoke — forwards to the bridge, which translates to ACP `session/prompt`. */
export interface ShellsInvokeParams {
  /** Optional caller key. The gateway must authenticate/scope it before admission. */
  invocationKey?: string;
  shellId: string;
  sessionId: string;
  input:
    | { kind: 'text'; text: string }
    | { kind: 'multimodal'; parts: Array<{ type: string; [k: string]: unknown }> };
  /** Force-wake if archived. Default true. */
  wakeIfArchived?: boolean;
}
/** Required durable invocation reuses the text-only member; parsing remains gateway-owned. */
export interface ShellsInvokeDurableParams extends Omit<ShellsInvokeParams, 'input'> {
  input: Extract<ShellsInvokeParams['input'], { kind: 'text' }>;
}
/** Persisted admission identity; does not establish that ACP started or succeeded. */
export interface ShellsInvokeDurableResponse {
  version: 1;
  durability: 'required';
  runId: string;
  startedAt: number;
}
export interface ShellsInvokeResponse {
  runId: string;             // correlate with shell.delta / shell.final events
  startedAt: number;
}

/** shells.cancel — forwards to ACP `session/cancel`. */
export interface ShellsCancelParams {
  shellId: string;
  runId: string;
}
export interface ShellsCancelResponse {
  cancelled: boolean;
}

/** shells.archive — backup + ssh exe.dev rm. Idempotent on already-archived. */
export interface ShellsArchiveParams {
  shellId: string;
  /** If true, skip backup (data-loss). Default false. */
  skipBackup?: boolean;
}
export interface ShellsArchiveResponse {
  shellId: string;
  status: ShellStatus;
  backupId?: string;
  backupBytes?: number;
}

/** shells.wake — provision fresh VM + restore from latest backup. */
export interface ShellsWakeParams {
  shellId: string;
  /** Backup to restore from. Default: latest. */
  backupId?: string;
}
export interface ShellsWakeResponse {
  shellId: string;
  status: ShellStatus;       // 'provisioning' until bridge re-registers
  restoringFromBackupId: string;
}

/** shells.restart — `ssh exe.dev restart`. Online shells only. */
export interface ShellsRestartParams {
  shellId: string;
}
export interface ShellsRestartResponse {
  shellId: string;
  status: ShellStatus;
}

/** shells.destroy — permanent. `ssh exe.dev rm` + drop B2 backups (opt-out). */
export interface ShellsDestroyParams {
  shellId: string;
  keepBackups?: boolean;     // default false
}
export interface ShellsDestroyResponse {
  shellId: string;
  removedBackups: number;
}

/** shells.backup_now — manual backup trigger. Returns when upload completes. */
export interface ShellsBackupNowParams {
  shellId: string;
}
export interface ShellsBackupNowResponse {
  backupId: string;
  bytes: number;
  uploadMs: number;
}

/** shells.list_backups */
export interface ShellsListBackupsParams {
  shellId: string;
  limit?: number;            // default 20
}
export interface ShellBackupEntry {
  backupId: string;
  shellId: string;
  bytes: number;
  createdAt: number;
  restoredAt: number | null; // null = never used to wake
}
export interface ShellsListBackupsResponse {
  backups: ShellBackupEntry[];
}

/** shells.update — partial. Server validates which fields are mutable per status. */
export interface ShellsUpdateParams {
  shellId: string;
  patch: Partial<
    Pick<
      ShellSummary,
      'displayName' | 'archiveIdleMs' | 'backupCadence' | 'backupTarget'
    >
  >;
}
export type ShellsUpdateResponse = ShellSummary;

// -----------------------------------------------------------------------------
// Bridge-side RPCs (in-VM bridge → gateway)
// -----------------------------------------------------------------------------

/** shells.register — bridge claims its shellId after connecting. */
export interface ShellsRegisterParams {
  shellId: string;
  deviceToken: string;       // machine credential injected by the gateway provisioner
  harness: ShellHarness;
  harnessVersion: string;    // e.g. "hermes@2026.05.0"
  bridgeVersion: string;     // e.g. "@minion-stack/shells-bridge@1.0.0"
  capabilities: ShellCapabilities;
}
export interface ShellCapabilities {
  /** Advertise only when the durable receiver/sender integration is active. */
  durableOutcomeVersion?: 1;
  /** ACP methods this harness supports. Gateway uses to reject unsupported invokes early. */
  acpMethods: string[];
  /** True if the harness can stream `session/update` events. */
  streaming: boolean;
  /** Backup mechanism the bridge uses ('tar+b2', 'rclone', …). */
  backupKind: string;
  /** Max concurrent runs supported (1 for single-threaded harnesses). */
  maxConcurrentRuns: number;
}
export interface ShellsRegisterResponse {
  /** Set only for a v1 peer after durable storage readiness and current-connection checks. */
  durableOutcomeVersion?: 1;
  shellId: string;
  /** Server-issued heartbeat cadence (ms). Bridge calls shells.heartbeat every N ms. */
  heartbeatMs: number;
}

/** Contract selection only; it does not establish peer authority or storage readiness. */
// TODO(handoff): Wire bilateral selection into the current registered receiver and durable sender; required durability must reject legacy absence. See meta proposals/2026-09-08-platform-qc-remediation.md (Shells lifecycle).
export function negotiateShellDurableOutcomeVersion(sender: unknown, receiver: unknown): 1 | undefined {
  if ((sender !== undefined && sender !== 1) || (receiver !== undefined && receiver !== 1)) {
    return invalidOutcome();
  }
  return sender === 1 && receiver === 1 ? 1 : undefined;
}

/** shells.heartbeat — bridge liveness ping. */
export interface ShellsHeartbeatParams {
  shellId: string;
  activeRunIds: string[];    // gateway can correlate with its own pending invokes
  diskUsedMB: number;
  memoryUsedMB: number;
}
export type ShellsHeartbeatResponse = { ts: number };

/** shells.fatal — bridge reports unrecoverable error before exiting. */
export interface ShellsFatalParams {
  shellId: string;
  reason: ShellErrorReason;
  message: string;
}
export type ShellsFatalResponse = { acknowledged: true };

// =============================================================================
// Event payloads
// =============================================================================

/** shell.online — emitted when bridge registers (after provision OR after wake). */
export interface ShellOnlinePayload {
  shellId: string;
  harness: ShellHarness;
  harnessVersion: string;
  /** True if this transition was from 'archived' rather than 'provisioning'. */
  resumedFromArchive: boolean;
}

/** shell.archived — emitted when archive completes successfully. */
export interface ShellArchivedPayload {
  shellId: string;
  backupId: string;
  backupBytes: number;
}

/** shell.error — emitted on any transition into status='error'. */
export interface ShellErrorPayload {
  shellId: string;
  reason: ShellErrorReason;
  message: string;
  /** Suggested next user action: 'restart' | 'wake' | 'destroy' | 'wait' | null. */
  remediation: 'restart' | 'wake' | 'destroy' | 'wait' | null;
}

/**
 * shell.delta — streaming partial output from the harness.
 * Mirrors ChatEvent shape so existing hub stream renderers can consume it
 * with minimal adaptation.
 */
export interface ShellDeltaPayload {
  shellId: string;
  runId: string;
  sessionId: string;
  seq: number;
  /** Raw ACP `session/update` payload, passed through. */
  acpUpdate: unknown;
}

/** shell.final — emitted once per runId on completion (success, abort, or harness error). */
export interface ShellFinalPayload {
  shellId: string;
  runId: string;
  sessionId: string;
  state: 'final' | 'aborted' | 'error';
  stopReason?: string;
  errorMessage?: string;
  /** Total wall time in ms from invoke to final. */
  durationMs: number;
  /** Optional usage stats reported by the harness (token counts, etc.). */
  usage?: unknown;
}

/** shell.backup_done — emitted when a backup (scheduled or manual) completes. */
export interface ShellBackupDonePayload {
  shellId: string;
  backupId: string;
  bytes: number;
  uploadMs: number;
  trigger: 'scheduled' | 'manual' | 'pre_archive';
}

/** shells.quota_changed — emitted when any quota dimension crosses a threshold. */
export interface ShellsQuotaChangedPayload {
  quota: ShellsQuota;
  /** Dimensions that crossed their amber/red threshold in this update. */
  alerted: Array<'shells' | 'diskGB' | 'memoryMB' | 'shelleyUSD' | 'egressGB'>;
}

// =============================================================================
// Type guards — convenience for hub stream handlers.
// =============================================================================

export function isShellEvent(
  frame: { type?: unknown; event?: unknown },
): frame is { type: 'event'; event: string; payload?: unknown } {
  return (
    frame.type === 'event' &&
    typeof frame.event === 'string' &&
    (frame.event.startsWith('shell.') || frame.event.startsWith('shells.'))
  );
}

export function isShellDelta(
  frame: { type?: unknown; event?: unknown; payload?: unknown },
): frame is { type: 'event'; event: typeof SHELLS_EVENTS.delta; payload: ShellDeltaPayload } {
  if (frame.type !== 'event' || frame.event !== SHELLS_EVENTS.delta || !isRecord(frame.payload)) {
    return false;
  }
  return (
    isNonEmptyString(frame.payload.shellId) &&
    isNonEmptyString(frame.payload.runId) &&
    isNonEmptyString(frame.payload.sessionId) &&
    Number.isInteger(frame.payload.seq) &&
    (frame.payload.seq as number) >= 0 &&
    Object.prototype.hasOwnProperty.call(frame.payload, 'acpUpdate')
  );
}

export function isShellFinal(
  frame: { type?: unknown; event?: unknown; payload?: unknown },
): frame is { type: 'event'; event: typeof SHELLS_EVENTS.final; payload: ShellFinalPayload } {
  if (frame.type !== 'event' || frame.event !== SHELLS_EVENTS.final || !isRecord(frame.payload)) {
    return false;
  }
  return (
    isNonEmptyString(frame.payload.shellId) &&
    isNonEmptyString(frame.payload.runId) &&
    isNonEmptyString(frame.payload.sessionId) &&
    (frame.payload.state === 'final' || frame.payload.state === 'aborted' || frame.payload.state === 'error') &&
    typeof frame.payload.durationMs === 'number' &&
    Number.isFinite(frame.payload.durationMs) &&
    frame.payload.durationMs >= 0 &&
    isOptionalString(frame.payload.stopReason) &&
    isOptionalString(frame.payload.errorMessage)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string';
}
