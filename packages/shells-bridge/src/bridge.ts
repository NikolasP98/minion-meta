// Bridge core — owns the WS connection to the gateway and routes RPCs to
// the in-process ACP client + backup module.
//
// Lifecycle:
//   1. construct → start()  : spawn harness, open WS, register
//   2. WS frame in  → handleRequest() dispatches by method
//   3. ACP notification (session/update) → emit shell.delta event upstream
//   4. WS drop → reconnect with backoff (state preserved; harness keeps running)
//   5. SIGTERM → graceful shutdown (close WS → stop harness → exit)

import { WebSocket } from 'ws';
import {
  SHELLS_METHODS,
  SHELLS_EVENTS,
  type GatewayFrame,
  type RequestFrame,
  type ResponseFrame,
  type EventFrame,
  type ShellsRegisterParams,
  type ShellsRegisterResponse,
  type ShellsInvokeParams,
  type ShellsInvokeResponse,
  type ShellsCancelParams,
  type ShellsCancelResponse,
  type ShellsBackupNowParams,
  type ShellsBackupNowResponse,
  type ShellsHeartbeatParams,
  type ShellsFatalParams,
  type ShellDeltaPayload,
  type ShellFinalPayload,
  type ShellErrorReason,
} from '@minion-stack/shared';
import { AcpClient } from './acp-client.js';
import { backup, restore } from './backup.js';
import type { BridgeConfig } from './config.js';
import { randomUUID } from 'node:crypto';
import { statSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';

interface ActiveRun {
  runId: string;
  sessionId: string;
  startedAt: number;
  requestId: string;
  requestSource: WebSocket;
  requestParams: ShellsInvokeParams;
}

export class Bridge {
  private ws: WebSocket | null = null;
  private acp: AcpClient;
  private activeRuns = new Map<string, ActiveRun>();
  /** ACP session id → bridge runId. Used to correlate notifications back to the originating invoke. */
  private acpSessionToRun = new Map<string, string>();
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private heartbeatMs: number;
  private reconnectDelay: number;
  private shuttingDown = false;
  private harnessRunning = false;
  private nextFrameId = 1;
  private pendingBridgeRpc = new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();

  constructor(private readonly config: BridgeConfig) {
    this.acp = new AcpClient({
      command: config.harnessCommand,
      args: config.harnessArgs,
      cwd: config.harnessWorkDir,
    });
    this.heartbeatMs = config.heartbeatMs;
    this.reconnectDelay = config.reconnectMinMs;
  }

  start(): void {
    this.acp.on('notification', (msg: { method: string; params?: unknown }) => {
      this.onAcpNotification(msg);
    });
    this.acp.on('stderr', (chunk: string) => {
      // Forwarded to journald via stdout; image's systemd unit captures it.
      process.stderr.write(`[harness] ${chunk}`);
    });
    this.acp.on('exit', ({ code, signal }: { code: number | null; signal: NodeJS.Signals | null }) => {
      this.harnessRunning = false;
      if (this.shuttingDown) return;
      this.reportFatal('unknown', `harness exited code=${code} signal=${signal ?? 'none'}`);
    });
    this.harnessRunning = true;
    try {
      this.acp.start();
    } catch (error) {
      this.harnessRunning = false;
      throw error;
    }
    this.connect();
  }

  async shutdown(): Promise<void> {
    this.shuttingDown = true;
    this.harnessRunning = false;
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.ws) this.ws.close(1000, 'shutdown');
    await this.acp.stop();
  }

  // ---------------------------------------------------------------------------
  // WS lifecycle
  // ---------------------------------------------------------------------------

  private connect(): void {
    if (this.shuttingDown) return;
    const ws = new WebSocket(this.config.gatewayUrl, {
      headers: { 'x-shell-id': this.config.shellId },
    });
    this.ws = ws;

    ws.on('open', () => {
      if (this.ws !== ws || this.shuttingDown) return;
      this.reconnectDelay = this.config.reconnectMinMs;
      void this.register();
    });
    ws.on('message', (data) => {
      if (this.ws !== ws || this.shuttingDown || ws.readyState !== WebSocket.OPEN) return;
      const text = typeof data === 'string' ? data : data.toString('utf8');
      this.onFrame(text, ws);
    });
    ws.on('close', () => {
      if (this.ws !== ws) return;
      this.ws = null;
      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = null;
      }
      if (!this.shuttingDown) this.scheduleReconnect();
    });
    ws.on('error', (err) => {
      process.stderr.write(`[bridge] ws error: ${(err as Error).message}\n`);
    });
  }

  private scheduleReconnect(): void {
    const delay = this.reconnectDelay;
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.config.reconnectMaxMs);
    setTimeout(() => this.connect(), delay);
  }

  // TODO(handoff): Persist terminal frames and reconcile on reconnect instead of losing execution outcomes. See meta proposals/2026-09-08-platform-qc-remediation.md (A4).
  private send(frame: GatewayFrame): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(frame));
  }

  private emitEvent<T>(event: string, payload: T): void {
    const frame: EventFrame = { type: 'event', event, payload };
    this.send(frame);
  }

  /** Bridge-initiated RPC (register, heartbeat, fatal). */
  private callGateway<T = unknown>(method: string, params: unknown, timeoutMs = 30_000): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        return reject(new Error('not connected'));
      }
      const id = `b${this.nextFrameId++}`;
      const timer = setTimeout(() => {
        this.pendingBridgeRpc.delete(id);
        reject(new Error(`gateway rpc '${method}' timed out`));
      }, timeoutMs);
      this.pendingBridgeRpc.set(id, {
        resolve: (v) => {
          clearTimeout(timer);
          resolve(v as T);
        },
        reject: (e) => {
          clearTimeout(timer);
          reject(e);
        },
      });
      const frame: RequestFrame = { type: 'req', id, method, params };
      this.send(frame);
    });
  }

  // ---------------------------------------------------------------------------
  // Frame routing
  // ---------------------------------------------------------------------------

  private onFrame(raw: string, source: WebSocket): void {
    let frame: unknown;
    try {
      frame = JSON.parse(raw) as unknown;
    } catch {
      return;
    }
    if (typeof frame !== 'object' || frame === null || Array.isArray(frame) || !('type' in frame)) return;
    if (frame.type === 'req') void this.handleRequest(frame as unknown as RequestFrame, source);
    else if (frame.type === 'res') this.handleResponse(frame as unknown as ResponseFrame);
    // event frames from gateway are ignored — bridge is a leaf.
  }

  private handleResponse(frame: ResponseFrame): void {
    const p = this.pendingBridgeRpc.get(frame.id);
    if (!p) return;
    this.pendingBridgeRpc.delete(frame.id);
    if (frame.ok) p.resolve(frame.payload);
    else p.reject(new Error(frame.error?.message ?? 'gateway rpc failed'));
  }

  private async handleRequest(frame: RequestFrame, source: WebSocket): Promise<void> {
    try {
      const result = await this.dispatch(frame.method, frame.params, frame.id, source);
      if (this.ws !== source || this.shuttingDown) return;
      this.send({ type: 'res', id: frame.id, ok: true, payload: result });
    } catch (err) {
      if (this.ws !== source || this.shuttingDown) return;
      const msg = err instanceof Error ? err.message : String(err);
      this.send({
        type: 'res',
        id: frame.id,
        ok: false,
        error: { code: 'BRIDGE_ERROR', message: msg },
      });
    }
  }

  private async dispatch(method: string, params: unknown, requestId: string, source: WebSocket): Promise<unknown> {
    switch (method) {
      case SHELLS_METHODS.invoke:
        return this.handleInvoke(params as ShellsInvokeParams, requestId, source);
      case SHELLS_METHODS.cancel:
        return this.handleCancel(params as ShellsCancelParams);
      case SHELLS_METHODS.backupNow:
        return this.handleBackup(params as ShellsBackupNowParams);
      // shells.health — bridge-local liveness, no harness call
      case 'shells.health':
        return { ok: true, ts: Date.now() };
      // shells.restore — gateway calls this after wake. Bridge expects to be
      // mid-startup with workDir already empty.
      case 'shells.restore':
        return this.handleRestore(params as { remotePath: string });
      default:
        throw new Error(`unsupported method: ${method}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Register / heartbeat
  // ---------------------------------------------------------------------------

  private async register(): Promise<void> {
    const source = this.ws;
    const params: ShellsRegisterParams = {
      shellId: this.config.shellId,
      deviceToken: this.config.deviceToken,
      harness: this.config.harness as ShellsRegisterParams['harness'],
      harnessVersion: this.config.harnessVersion,
      bridgeVersion: PACKAGE_VERSION,
      capabilities: {
        acpMethods: ['session/prompt', 'session/cancel', 'session/update'],
        streaming: true,
        backupKind: 'tar+rclone',
        maxConcurrentRuns: 1,
      },
    };
    try {
      const res = await this.callGateway<ShellsRegisterResponse>(SHELLS_METHODS.register, params);
      if (this.ws !== source || this.shuttingDown) return;
      this.heartbeatMs = res.heartbeatMs ?? this.heartbeatMs;
      this.startHeartbeat();
    } catch (err) {
      process.stderr.write(`[bridge] register failed: ${(err as Error).message}\n`);
      // Close ws; reconnect will retry.
      if (this.ws === source) source?.close();
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      const params: ShellsHeartbeatParams = {
        shellId: this.config.shellId,
        activeRunIds: [...this.activeRuns.keys()],
        diskUsedMB: measureDiskMB(this.config.harnessWorkDir),
        memoryUsedMB: measureMemoryMB(),
      };
      this.callGateway(SHELLS_METHODS.heartbeat, params).catch((err: Error) => {
        process.stderr.write(`[bridge] heartbeat failed: ${err.message}\n`);
      });
    }, this.heartbeatMs);
  }

  private reportFatal(reason: ShellErrorReason, message: string): void {
    const params: ShellsFatalParams = { shellId: this.config.shellId, reason, message };
    this.callGateway(SHELLS_METHODS.fatal, params)
      .catch(() => {
        /* best-effort */
      })
      .finally(() => {
        // systemd Restart=always will recycle us.
        process.exit(1);
      });
  }

  // ---------------------------------------------------------------------------
  // Caller-facing RPC handlers
  // ---------------------------------------------------------------------------

  // TODO(handoff): Add completed-request durable dedup and terminal/cancellation reconciliation in 11-03; this bounded replay covers active requests on their original connection only. See meta proposals/2026-09-08-platform-qc-remediation.md (Shells lifecycle).
  private async handleInvoke(params: ShellsInvokeParams, requestId: string, source: WebSocket): Promise<ShellsInvokeResponse> {
    if (this.shuttingDown || !this.harnessRunning) throw new Error('BRIDGE_UNAVAILABLE');
    if (!params || params.shellId !== this.config.shellId || typeof params.sessionId !== 'string' || !params.sessionId || typeof requestId !== 'string' || !requestId) {
      throw new Error('BRIDGE_INVALID_REQUEST');
    }
    const duplicate = [...this.activeRuns.values()].find((run) => run.requestId === requestId && run.requestSource === source);
    if (duplicate) {
      if (!isDeepStrictEqual(duplicate.requestParams, params)) throw new Error('BRIDGE_DUPLICATE_REQUEST');
      return { runId: duplicate.runId, startedAt: duplicate.startedAt };
    }
    // Match the advertised instance-wide maxConcurrentRuns=1, including other sessions.
    if (this.activeRuns.size > 0 || this.acpSessionToRun.has(params.sessionId)) throw new Error('BRIDGE_BUSY');
    const runId = `run_${randomUUID()}`;
    const startedAt = Date.now();
    const run: ActiveRun = { runId, sessionId: params.sessionId, startedAt, requestId, requestSource: source, requestParams: params };
    this.activeRuns.set(runId, run);
    this.acpSessionToRun.set(params.sessionId, runId);

    // Fire ACP `session/prompt` — do NOT await; bridge replies to the caller
    // immediately with runId, then streams updates via shell.delta events.
    try {
      void this.acp
        .call('session/prompt', { sessionId: params.sessionId, input: params.input })
        .then(
          (result: unknown) => { this.emitFinal(runId, params.sessionId, 'final', startedAt, { result }); },
          (err: unknown) => { this.emitFinal(runId, params.sessionId, 'error', startedAt, { errorMessage: err instanceof Error ? err.message : String(err) }); },
        )
        .finally(() => { this.releaseRun(run); })
        .catch((error: unknown) => {
          // Local delivery failure must not leak an unhandled rejection or another owner's reservation.
          process.stderr.write(`[bridge] final delivery failed: ${error instanceof Error ? error.message : String(error)}\n`);
        });
    } catch (error) {
      this.releaseRun(run);
      throw error;
    }

    return { runId, startedAt };
  }

  private async handleCancel(params: ShellsCancelParams): Promise<ShellsCancelResponse> {
    if (!params || params.shellId !== this.config.shellId) throw new Error('BRIDGE_INVALID_REQUEST');
    const run = this.activeRuns.get(params.runId);
    if (!run) return { cancelled: false };
    try {
      await this.acp.call('session/cancel', { sessionId: run.sessionId });
      return { cancelled: true };
    } catch {
      return { cancelled: false };
    }
  }

  private async handleBackup(_params: ShellsBackupNowParams): Promise<ShellsBackupNowResponse> {
    if (!this.config.backupTarget) throw new Error('no backup target configured');
    const res = await backup({
      workDir: this.config.harnessWorkDir,
      target: this.config.backupTarget,
    });
    this.emitEvent(SHELLS_EVENTS.backupDone, {
      shellId: this.config.shellId,
      backupId: res.backupId,
      bytes: res.bytes,
      uploadMs: res.uploadMs,
      trigger: 'manual',
    });
    return { backupId: res.backupId, bytes: res.bytes, uploadMs: res.uploadMs };
  }

  private async handleRestore(params: { remotePath: string }): Promise<{ ok: true }> {
    // TODO(handoff): Quiesce the harness and stage/verify restore before swapping the workdir; live overlay extraction races execution. See meta proposals/2026-09-08-platform-qc-remediation.md (A4).
    await restore({ workDir: this.config.harnessWorkDir, remotePath: params.remotePath });
    return { ok: true };
  }

  // ---------------------------------------------------------------------------
  // ACP → upstream event translation
  // ---------------------------------------------------------------------------

  private onAcpNotification(msg: { method: string; params?: unknown }): void {
    if (msg.method !== 'session/update') return;
    const params = msg.params as { sessionId?: string } | undefined;
    const sessionId = params?.sessionId;
    if (!sessionId) return;
    const runId = this.acpSessionToRun.get(sessionId);
    if (!runId) return;
    const run = this.activeRuns.get(runId);
    if (!run || run.sessionId !== sessionId) return;
    // TODO(handoff): ACP session/update has no run identity; qualify late updates after timeout/cancel before reusing a session in 11-03/04. See meta proposals/2026-09-08-platform-qc-remediation.md (Shells lifecycle).

    const payload: ShellDeltaPayload = {
      shellId: this.config.shellId,
      runId,
      sessionId,
      seq: nextSeq(run),
      acpUpdate: msg.params,
    };
    this.emitEvent(SHELLS_EVENTS.delta, payload);
  }

  private emitFinal(
    runId: string,
    sessionId: string,
    state: 'final' | 'error',
    startedAt: number,
    extra: { result?: unknown; errorMessage?: string },
  ): void {
    const run = this.activeRuns.get(runId);
    if (!run || run.sessionId !== sessionId || run.startedAt !== startedAt || this.acpSessionToRun.get(sessionId) !== runId) return;
    const payload: ShellFinalPayload = {
      shellId: this.config.shellId,
      runId,
      sessionId,
      state,
      errorMessage: extra.errorMessage,
      durationMs: Date.now() - startedAt,
    };
    try {
      this.emitEvent(SHELLS_EVENTS.final, payload);
    } finally {
      this.releaseRun(run);
    }
  }

  private releaseRun(run: ActiveRun): void {
    if (this.activeRuns.get(run.runId) !== run) return;
    this.activeRuns.delete(run.runId);
    if (this.acpSessionToRun.get(run.sessionId) === run.runId) this.acpSessionToRun.delete(run.sessionId);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Per-run monotonic delta sequence number, stored on the ActiveRun. */
function nextSeq(run: ActiveRun | undefined): number {
  if (!run) return 0;
  const r = run as ActiveRun & { _seq?: number };
  r._seq = (r._seq ?? 0) + 1;
  return r._seq;
}

function measureDiskMB(path: string): number {
  try {
    const stat = statSync(path);
    // statSync().size is not directory-recursive; this is a placeholder.
    // Real impl will shell out to `du -sm <path>` and cache for heartbeatMs.
    return Math.round(stat.size / (1024 * 1024));
  } catch {
    return 0;
  }
}

function measureMemoryMB(): number {
  const mem = process.memoryUsage();
  return Math.round(mem.rss / (1024 * 1024));
}

// Replaced at build time by tooling; falls back to "0.0.0-dev" in source form.
declare const PACKAGE_VERSION: string;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).PACKAGE_VERSION ??= '0.1.0';
