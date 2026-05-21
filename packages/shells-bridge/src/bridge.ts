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

interface ActiveRun {
  runId: string;
  sessionId: string;
  startedAt: number;
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
      if (this.shuttingDown) return;
      this.reportFatal('unknown', `harness exited code=${code} signal=${signal ?? 'none'}`);
    });
    this.acp.start();
    this.connect();
  }

  async shutdown(): Promise<void> {
    this.shuttingDown = true;
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
      this.reconnectDelay = this.config.reconnectMinMs;
      void this.register();
    });
    ws.on('message', (data) => {
      const text = typeof data === 'string' ? data : data.toString('utf8');
      this.onFrame(text);
    });
    ws.on('close', () => {
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

  private onFrame(raw: string): void {
    let frame: Record<string, unknown>;
    try {
      frame = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return;
    }
    if (frame.type === 'req') void this.handleRequest(frame as unknown as RequestFrame);
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

  private async handleRequest(frame: RequestFrame): Promise<void> {
    try {
      const result = await this.dispatch(frame.method, frame.params);
      this.send({ type: 'res', id: frame.id, ok: true, payload: result });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.send({
        type: 'res',
        id: frame.id,
        ok: false,
        error: { code: 'BRIDGE_ERROR', message: msg },
      });
    }
  }

  private async dispatch(method: string, params: unknown): Promise<unknown> {
    switch (method) {
      case SHELLS_METHODS.invoke:
        return this.handleInvoke(params as ShellsInvokeParams);
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
      this.heartbeatMs = res.heartbeatMs ?? this.heartbeatMs;
      this.startHeartbeat();
    } catch (err) {
      process.stderr.write(`[bridge] register failed: ${(err as Error).message}\n`);
      // Close ws; reconnect will retry.
      this.ws?.close();
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

  private async handleInvoke(params: ShellsInvokeParams): Promise<ShellsInvokeResponse> {
    const runId = `run_${randomUUID()}`;
    const startedAt = Date.now();
    this.activeRuns.set(runId, { runId, sessionId: params.sessionId, startedAt });
    this.acpSessionToRun.set(params.sessionId, runId);

    // Fire ACP `session/prompt` — do NOT await; bridge replies to the caller
    // immediately with runId, then streams updates via shell.delta events.
    this.acp
      .call('session/prompt', { sessionId: params.sessionId, input: params.input })
      .then((result: unknown) => {
        this.emitFinal(runId, params.sessionId, 'final', startedAt, { result });
      })
      .catch((err: Error) => {
        this.emitFinal(runId, params.sessionId, 'error', startedAt, { errorMessage: err.message });
      });

    return { runId, startedAt };
  }

  private async handleCancel(params: ShellsCancelParams): Promise<ShellsCancelResponse> {
    const run = this.activeRuns.get(params.runId);
    if (!run) return { cancelled: false };
    try {
      await this.acp.call('session/cancel', { sessionId: run.sessionId });
      return { cancelled: true };
    } catch {
      return { cancelled: false };
    }
  }

  private async handleBackup(params: ShellsBackupNowParams): Promise<ShellsBackupNowResponse> {
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

    const payload: ShellDeltaPayload = {
      shellId: this.config.shellId,
      runId,
      sessionId,
      seq: nextSeq(this.activeRuns.get(runId)),
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
    const payload: ShellFinalPayload = {
      shellId: this.config.shellId,
      runId,
      sessionId,
      state,
      errorMessage: extra.errorMessage,
      durationMs: Date.now() - startedAt,
    };
    this.emitEvent(SHELLS_EVENTS.final, payload);
    this.activeRuns.delete(runId);
    this.acpSessionToRun.delete(sessionId);
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
