// Minimal ACP (Agent Client Protocol) client.
//
// ACP is JSON-RPC 2.0 over stdio. The bridge spawns the harness as a child
// process, writes JSON-RPC requests to its stdin, and reads responses /
// streaming `session/update` notifications from its stdout. stderr is logged.
//
// This file intentionally keeps the surface minimal — the bridge only needs
// `session/prompt`, `session/cancel`, and the `session/update` notification.
// Adding more methods is a one-line addition to AcpClient.callRaw().
//
// Spec ref: ACP at https://hermes-agent.nousresearch.com/docs/developer-guide/architecture
// (HERMES exposes ACP via `acp_adapter/`). Same shape used by Zed, JetBrains, VS Code.

import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { createInterface } from 'node:readline';

export interface AcpClientOptions {
  command: string;
  args: string[];
  cwd: string;
  env?: NodeJS.ProcessEnv;
}

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: unknown;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
}

type JsonRpcInbound = JsonRpcResponse | JsonRpcNotification;

function isResponse(value: JsonRpcInbound): value is JsonRpcResponse {
  return typeof (value as JsonRpcResponse).id === 'number';
}

export class AcpClient extends EventEmitter {
  private proc: ChildProcessWithoutNullStreams | null = null;
  private nextId = 1;
  private pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  private exited = false;

  constructor(private readonly opts: AcpClientOptions) {
    super();
  }

  start(): void {
    if (this.proc) {
      throw new Error('AcpClient already started');
    }
    const proc = spawn(this.opts.command, this.opts.args, {
      cwd: this.opts.cwd,
      env: this.opts.env ?? process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    this.proc = proc;

    const lines = createInterface({ input: proc.stdout });
    lines.on('line', (line) => this.onStdoutLine(line));
    proc.stderr.on('data', (chunk: Buffer) => {
      this.emit('stderr', chunk.toString('utf8'));
    });
    proc.on('exit', (code, signal) => {
      this.exited = true;
      this.failAllPending(new Error(`harness exited code=${code} signal=${signal ?? 'none'}`));
      this.emit('exit', { code, signal });
    });
    proc.on('error', (err) => {
      this.emit('error', err);
    });
  }

  /** Send a JSON-RPC request; resolves with the `result` field. */
  call<T = unknown>(method: string, params?: unknown, timeoutMs = 60_000): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.proc || this.exited) {
        return reject(new Error('AcpClient not started or harness exited'));
      }
      const id = this.nextId++;
      const req: JsonRpcRequest = { jsonrpc: '2.0', id, method, params };
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`ACP call '${method}' timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      this.pending.set(id, {
        resolve: (v) => {
          clearTimeout(timer);
          resolve(v as T);
        },
        reject: (e) => {
          clearTimeout(timer);
          reject(e);
        },
      });
      this.proc.stdin.write(`${JSON.stringify(req)}\n`);
    });
  }

  /** Stop the harness gracefully. Caller may force-kill via .kill() if needed. */
  async stop(): Promise<void> {
    if (!this.proc || this.exited) return;
    this.proc.stdin.end();
    // Give the harness a chance to flush state.
    await new Promise<void>((resolve) => {
      if (!this.proc || this.exited) return resolve();
      const t = setTimeout(() => resolve(), 5_000);
      this.proc.once('exit', () => {
        clearTimeout(t);
        resolve();
      });
    });
  }

  kill(signal: NodeJS.Signals = 'SIGTERM'): void {
    if (this.proc && !this.exited) this.proc.kill(signal);
  }

  private onStdoutLine(line: string): void {
    const trimmed = line.trim();
    if (!trimmed) return;
    let msg: JsonRpcInbound;
    try {
      msg = JSON.parse(trimmed) as JsonRpcInbound;
    } catch (err) {
      this.emit('parse_error', { line: trimmed, error: err });
      return;
    }
    if (isResponse(msg)) {
      const p = this.pending.get(msg.id);
      if (!p) return;
      this.pending.delete(msg.id);
      if (msg.error) {
        p.reject(new Error(`ACP error ${msg.error.code}: ${msg.error.message}`));
      } else {
        p.resolve(msg.result);
      }
    } else {
      // Notification (no id). The only one we care about is `session/update`,
      // but emit them all so the bridge can subscribe broadly.
      this.emit('notification', msg);
    }
  }

  private failAllPending(err: Error): void {
    for (const p of this.pending.values()) p.reject(err);
    this.pending.clear();
  }
}
