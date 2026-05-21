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

// =============================================================================
// RPC method names — use these constants on both client and server.
// =============================================================================
export const SHELLS_METHODS = {
  // Caller-side (hub / channel → gateway)
  list: 'shells.list',
  get: 'shells.get',
  quota: 'shells.quota',
  provision: 'shells.provision',
  invoke: 'shells.invoke',
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

/** Identifier of a harness baked into an exe.dev image. */
export type ShellHarness = 'hermes' | 'claude-code' | 'codex' | (string & {});

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
  vmName: string;          // exe.dev VM name (1:1 with shellId)
  displayName: string;     // user-chosen label
  harness: ShellHarness;
  image: string;           // baked image, e.g. "minionstack/hermes-shell:v1"
  region: string;          // exe.dev region code, e.g. "lax"
  status: ShellStatus;
  errorReason?: ShellErrorReason;
  errorMessage?: string;
  diskGB: number;
  memoryMB: number;
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
  image?: string;             // override baked image (advanced)
  region?: string;            // default: gateway-configured region
  diskGB?: number;            // default 4
  memoryMB?: number;          // default 512
  archiveIdleMs?: number | null; // default 24h; null = always-on
  backupCadence?: ShellBackupCadence; // default 'daily'
  /** Optional initial prompt forwarded to the harness on first boot. */
  initialPrompt?: string;
}
export interface ShellsProvisionResponse {
  shellId: string;
  vmName: string;
  status: ShellStatus;       // typically 'provisioning' on return
  deviceToken: string;       // one-time token bridge will use to register
}

/** shells.invoke — forwards to the bridge, which translates to ACP `session/prompt`. */
export interface ShellsInvokeParams {
  shellId: string;
  sessionId: string;
  input:
    | { kind: 'text'; text: string }
    | { kind: 'multimodal'; parts: Array<{ type: string; [k: string]: unknown }> };
  /** Force-wake if archived. Default true. */
  wakeIfArchived?: boolean;
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
  deviceToken: string;       // one-time token from ShellsProvisionResponse
  harness: ShellHarness;
  harnessVersion: string;    // e.g. "hermes@2026.05.0"
  bridgeVersion: string;     // e.g. "@minion-stack/shells-bridge@1.0.0"
  capabilities: ShellCapabilities;
}
export interface ShellCapabilities {
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
  shellId: string;
  /** Server-issued heartbeat cadence (ms). Bridge calls shells.heartbeat every N ms. */
  heartbeatMs: number;
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
  return frame.type === 'event' && frame.event === SHELLS_EVENTS.delta;
}

export function isShellFinal(
  frame: { type?: unknown; event?: unknown; payload?: unknown },
): frame is { type: 'event'; event: typeof SHELLS_EVENTS.final; payload: ShellFinalPayload } {
  return frame.type === 'event' && frame.event === SHELLS_EVENTS.final;
}
