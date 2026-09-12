// Qualified SDK candidate; not imported by the production bridge.
// TODO(handoff): Adopt only with persistent caller-to-ACP session mapping, load/restart
// recovery and late-update fences; never turn a caller conversation into fresh turns.
// See proposals/2026-09-08-platform-qc-remediation.md (11-04 ACP SDK continuation).
// Stable ACP v1 dispatch and inbound request schemas belong to the pinned official SDK.
// This adapter owns the child process, finite transport/request budgets and permission policy.
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { Readable, Writable } from 'node:stream';
import {
  client,
  ndJsonStream,
  PROTOCOL_VERSION,
  RequestError,
  type ClientConnection,
  type ClientCapabilities,
  type ContentBlock,
  type InitializeResponse,
  type PromptResponse,
  type RequestPermissionRequest,
  type RequestPermissionResponse,
  type JsonRpcId,
  type McpServer,
  type AnyMessage,
} from '@agentclientprotocol/sdk';

export const ACP_PROTOCOL_VERSION = PROTOCOL_VERSION;
export type { ContentBlock };
export type PermissionRequestParams = RequestPermissionRequest;
export type PermissionOutcome = RequestPermissionResponse['outcome'];
export type PermissionHandler = (
  params: PermissionRequestParams,
) => PermissionOutcome | Promise<PermissionOutcome>;
export interface AcpClientOptions {
  command: string;
  args: string[];
  cwd: string;
  env?: NodeJS.ProcessEnv;
  maxLineBytes?: number;
  maxPendingRequests?: number;
}
interface Permission {
  sessionId: string;
  settle(outcome: PermissionOutcome): void;
  written: Promise<void>;
  finish(): void;
}
export const rejectByDefault = (
  params: PermissionRequestParams,
): PermissionOutcome => {
  const option = params.options.find(
    (item) => item.kind === 'reject_once' || item.kind === 'reject_always',
  );
  return option
    ? { outcome: 'selected', optionId: option.optionId }
    : { outcome: 'cancelled' };
};

export class AcpClient extends EventEmitter {
  private proc: ChildProcessWithoutNullStreams | null = null;
  private connection: ClientConnection | null = null;
  private exited = false;
  private stopping = false;
  private inFlight = 0;
  private permissionHandler: PermissionHandler = rejectByDefault;
  private permissions = new Map<JsonRpcId, Permission>();
  private readonly maxLineBytes: number;
  private readonly maxPendingRequests: number;

  constructor(private readonly opts: AcpClientOptions) {
    super();
    this.maxLineBytes = opts.maxLineBytes ?? 4 * 1024 * 1024;
    this.maxPendingRequests = opts.maxPendingRequests ?? 64;
    if (
      !Number.isSafeInteger(this.maxLineBytes) ||
      this.maxLineBytes < 1 ||
      !Number.isSafeInteger(this.maxPendingRequests) ||
      this.maxPendingRequests < 1
    ) {
      throw new Error('ACP budgets must be positive safe integers');
    }
  }

  start(): void {
    if (this.proc) throw new Error('AcpClient already started');
    const proc = spawn(this.opts.command, this.opts.args, {
      cwd: this.opts.cwd,
      env: this.opts.env ?? process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    this.proc = proc;
    proc.stderr.on('data', (chunk: Buffer) =>
      this.emit('stderr', chunk.toString('utf8')),
    );
    proc.stdin.on('error', () => {
      /* SDK write rejection/child close owns pending requests. */
    });
    let processError: Error | undefined;
    proc.on('close', (code, signal) =>
      this.settleExit({
        code,
        signal,
        ...(processError ? { error: processError } : {}),
      }),
    );
    proc.on('error', (error) => {
      processError = error;
      this.connection?.close(error);
      this.emit('process_error', error);
      // Failed kill/send is not process exit. Even failed spawn emits close.
    });
    let lineBytes = 0;
    const guarded = Readable.toWeb(proc.stdout).pipeThrough(
      new TransformStream<Uint8Array, Uint8Array>({
        transform: (chunk, controller) => {
          for (const byte of chunk) {
            if (byte === 10) lineBytes = 0;
            else if (++lineBytes > this.maxLineBytes) {
              const error = new Error(
                `ACP stdout line exceeds ${this.maxLineBytes} bytes`,
              );
              this.emit('parse_error', { error });
              throw error; // Close protocol; do not falsely report child exit.
            }
          }
          controller.enqueue(chunk);
        },
      }),
    );
    const stream = ndJsonStream(Writable.toWeb(proc.stdin), guarded);
    const writer = stream.writable.getWriter();
    const observed = new WritableStream<AnyMessage>({
      write: async (message) => {
        await writer.write(message);
        // Observe SDK-written permission responses solely to order cancellation.
        // The SDK still owns request classification, validation and response generation.
        if ('id' in message && !('method' in message)) {
          const permission = this.permissions.get(message.id);
          if (permission) {
            this.permissions.delete(message.id);
            permission.finish();
          }
        }
      },
      close: () => writer.close(),
      abort: (reason) => writer.abort(reason),
    });
    this.connection = client({ name: 'minion-shells-bridge' })
      .onRequest('session/request_permission', (ctx) =>
        this.permission(ctx.requestId!, ctx.params),
      )
      .onNotification('session/update', (ctx) => {
        this.emit('notification', {
          method: 'session/update',
          params: ctx.params,
        });
      })
      .connect({ readable: stream.readable, writable: observed });
    void this.connection.closed.then(() => {
      for (const permission of this.permissions.values()) {
        permission.settle({ outcome: 'cancelled' });
        permission.finish();
      }
      this.permissions.clear();
      this.emit('protocol_close');
    });
  }

  setPermissionHandler(handler: PermissionHandler): void {
    this.permissionHandler = handler;
  }

  async initialize(
    clientCapabilities: ClientCapabilities = {},
  ): Promise<InitializeResponse> {
    const result = await this.call<InitializeResponse>('initialize', {
      protocolVersion: ACP_PROTOCOL_VERSION,
      clientCapabilities,
    });
    if (!result || result.protocolVersion !== ACP_PROTOCOL_VERSION)
      throw new Error(
        `ACP protocol version mismatch: expected ${ACP_PROTOCOL_VERSION}`,
      );
    return result;
  }
  async newSession(
    cwd: string,
    mcpServers: McpServer[] = [],
  ): Promise<{ sessionId: string }> {
    const result = await this.call<{ sessionId: string }>('session/new', {
      cwd,
      mcpServers,
    });
    if (
      !result ||
      typeof result.sessionId !== 'string' ||
      !result.sessionId.trim()
    )
      throw new Error('ACP session/new returned no sessionId');
    return { sessionId: result.sessionId };
  }
  async prompt(
    sessionId: string,
    prompt: ContentBlock[],
  ): Promise<PromptResponse> {
    const result = await this.call<PromptResponse>(
      'session/prompt',
      { sessionId, prompt },
      0,
    );
    // SDK 1.4.0 does not validate generic request results. Keep terminal evidence
    // bounded to the stable protocol reasons; malformed results are not completion.
    if (
      !result ||
      ![
        'end_turn',
        'max_tokens',
        'max_turn_requests',
        'refusal',
        'cancelled',
      ].includes(result.stopReason)
    ) {
      throw new Error('ACP prompt returned an invalid stopReason');
    }
    return result;
  }
  /** Sending cancellation is not acknowledgement; only the prompt stopReason can acknowledge it. */
  async cancel(sessionId: string): Promise<void> {
    const permissions = [...this.permissions.values()].filter(
      (entry) => entry.sessionId === sessionId,
    );
    for (const permission of permissions)
      permission.settle({ outcome: 'cancelled' });
    await Promise.all(permissions.map((entry) => entry.written));
    await this.activeConnection().agent.notify('session/cancel', { sessionId });
  }

  /** Low-level requests: SDK dispatches JSON-RPC; callers must validate results they consume. */
  async call<T = unknown>(
    method: string,
    params?: unknown,
    timeoutMs = 60_000,
  ): Promise<T> {
    const connection = this.activeConnection();
    if (this.inFlight >= this.maxPendingRequests)
      throw new Error('ACP pending request budget exceeded');
    this.inFlight++;
    // SDK request cancellation is cooperative and keeps the request pending. A local
    // deadline therefore closes this connection to release SDK state; it does not prove exit.
    const timeout =
      timeoutMs > 0
        ? setTimeout(
            () =>
              connection.close(
                new Error(
                  `ACP call '${method}' timed out after ${timeoutMs}ms`,
                ),
              ),
            timeoutMs,
          )
        : null;
    try {
      return await connection.agent.request<T>(method, params);
    } catch (error) {
      if (error instanceof RequestError)
        throw new Error(`ACP error ${error.code}: ${error.message}`);
      throw error;
    } finally {
      if (timeout) clearTimeout(timeout);
      this.inFlight--;
    }
  }

  async stop(timeoutMs = 5_000): Promise<{ exited: boolean }> {
    if (!this.proc || this.exited) return { exited: true };
    this.stopping = true;
    this.proc.stdin.end();
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.off('exit', done);
        resolve({ exited: false });
      }, timeoutMs);
      const done = () => {
        clearTimeout(timer);
        resolve({ exited: true });
      };
      this.once('exit', done);
    });
  }
  kill(signal: NodeJS.Signals = 'SIGTERM'): void {
    if (this.proc && !this.exited) this.proc.kill(signal);
  }
  private activeConnection(): ClientConnection {
    if (
      !this.connection ||
      this.exited ||
      this.stopping ||
      this.connection.signal.aborted
    )
      throw new Error('ACP harness unavailable or protocol exited');
    return this.connection;
  }
  private settleExit(info: {
    code: number | null;
    signal: NodeJS.Signals | null;
    error?: Error;
  }): void {
    if (this.exited) return;
    this.exited = true;
    this.connection?.close(
      info.error ??
        new Error(
          `harness exited code=${info.code} signal=${info.signal ?? 'none'}`,
        ),
    );
    this.emit('exit', info); // Child close, not protocol close, certifies process exit and drained stdio.
  }
  private permission(
    id: JsonRpcId,
    params: PermissionRequestParams,
  ): Promise<RequestPermissionResponse> {
    if (this.permissions.size >= this.maxPendingRequests)
      return Promise.resolve({ outcome: { outcome: 'cancelled' } });
    let resolve!: (value: RequestPermissionResponse) => void;
    const answer = new Promise<RequestPermissionResponse>((done) => {
      resolve = done;
    });
    let finished!: () => void;
    const written = new Promise<void>((done) => {
      finished = done;
    });
    let settled = false;
    const permission: Permission = {
      sessionId: params.sessionId,
      written,
      finish: finished,
      settle: (outcome) => {
        if (!settled) {
          settled = true;
          resolve({ outcome });
        }
      },
    };
    this.permissions.set(id, permission);
    Promise.resolve()
      .then(() => this.permissionHandler(params))
      .then(
        (outcome) => {
          const valid =
            outcome?.outcome === 'cancelled' ||
            (outcome?.outcome === 'selected' &&
              params.options.some(
                (option) => option.optionId === outcome.optionId,
              ));
          permission.settle(valid ? outcome : rejectByDefault(params));
        },
        () => permission.settle(rejectByDefault(params)),
      );
    return answer;
  }
}
