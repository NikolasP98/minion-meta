import { EventEmitter } from 'node:events';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebSocketServer, type WebSocket as RealWebSocket } from 'ws';
import {
  SHELL_DURABLE_V1_OUTCOME_LIMITS,
  type RequestFrame, type ResponseFrame, type EventFrame, type ShellsInvokeResponse,
  type ShellRunAdmission, type ShellRunOutcome, type ShellOutcomeReceipt,
} from '@minion-stack/shared';
import type { BridgeConfig } from './config.js';
import { RunJournal, type RunJournalOptions } from './run-journal.js';

interface PendingCall {
  method: string;
  params: unknown;
  resolve(value: unknown): void;
  reject(error: Error): void;
}
interface FakeAcpHandle extends EventEmitter {
  calls: PendingCall[];
  beforePrompt?: () => void;
  call(method: string, params?: unknown): Promise<unknown>;
}
interface FakeWsHandle extends EventEmitter {
  readyState: number;
  frames: Array<RequestFrame | ResponseFrame | EventFrame>;
  close(): void;
}
const fakes = vi.hoisted(() => ({
  acps: [] as FakeAcpHandle[],
  sockets: [] as FakeWsHandle[],
}));
vi.mock('./acp-client.js', async () => {
  const { EventEmitter: Emitter } = await import('node:events');
  return { AcpClient: class extends Emitter {
    calls: PendingCall[] = [];
    beforePrompt?: () => void;
    constructor() { super(); fakes.acps.push(this); }
    start() {}
    async stop() {}
    call(method: string, params: unknown): Promise<unknown> {
      return new Promise((resolve, reject) => {
        this.calls.push({ method, params, resolve, reject });
        if (method === 'session/prompt') this.beforePrompt?.();
      });
    }
  } };
});
// Loopback URLs get the real client so the durable lane can talk to a synthetic
// receiver; every other URL keeps the in-memory fake the legacy suite relies on.
vi.mock('ws', async (importOriginal) => {
  const real = await importOriginal<typeof import('ws')>();
  const { EventEmitter: Emitter } = await import('node:events');
  class FakeSocket extends Emitter {
    readyState = 1;
    frames: Array<RequestFrame | ResponseFrame | EventFrame> = [];
    constructor() { super(); fakes.sockets.push(this); }
    send(raw: string) {
      const frame = JSON.parse(raw) as RequestFrame | ResponseFrame | EventFrame;
      this.frames.push(frame);
      if (frame.type === 'req') {
        this.emit('message', JSON.stringify({ type: 'res', id: frame.id, ok: true, payload: { heartbeatMs: 100 } }));
      }
    }
    close() { this.readyState = 3; this.emit('close'); }
  }
  return {
    ...real,
    WebSocket: new Proxy(real.WebSocket, {
      construct(target, args: [string, unknown]) {
        return String(args[0]).startsWith('ws://127.0.0.1:')
          ? Reflect.construct(target, args)
          : new FakeSocket();
      },
    }),
  };
});
vi.mock('./backup.js', () => ({ backup: vi.fn(), restore: vi.fn() }));
const { Bridge } = await import('./bridge.js');

const config: BridgeConfig = {
  shellId: 'shell-fixture', gatewayUrl: 'ws://fixture.invalid', deviceToken: 'synthetic',
  harness: 'codex', harnessVersion: 'fixture', harnessCommand: 'never-spawn',
  harnessArgs: [], harnessWorkDir: '/nonexistent-fixture',
  heartbeatMs: 100, reconnectMinMs: 10, reconnectMaxMs: 20,
  durable: { mode: 'disabled' },
};
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
let bridge: InstanceType<typeof Bridge>;
let ws: FakeWsHandle;
let acp: FakeAcpHandle;
function params(sessionId = 'session-a', text = 'hello') {
  return { shellId: config.shellId, sessionId, input: { kind: 'text', text } };
}
async function request(socket: FakeWsHandle, id: string, method: string, body: unknown) {
  socket.emit('message', JSON.stringify({ type: 'req', id, method, params: body }));
  await flush();
}
function responses(socket: FakeWsHandle, id: string): ResponseFrame[] {
  return socket.frames.filter((f): f is ResponseFrame => f.type === 'res' && f.id === id);
}
function result(socket: FakeWsHandle, id: string): ShellsInvokeResponse {
  const response = responses(socket, id).at(-1);
  expect(response?.ok).toBe(true);
  return response!.payload as ShellsInvokeResponse;
}
function events(socket: FakeWsHandle, name: string): EventFrame[] {
  return socket.frames.filter((f): f is EventFrame => f.type === 'event' && f.event === name);
}
function prompts() { return acp.calls.filter((c) => c.method === 'session/prompt'); }

describe('Bridge session admission and correlation', () => {
beforeEach(async () => {
  vi.useFakeTimers();
  vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  fakes.acps.length = 0;
  fakes.sockets.length = 0;
  bridge = new Bridge(config);
  bridge.start();
  ws = fakes.sockets[0]!;
  acp = fakes.acps[0]!;
  ws.emit('open');
  await flush();
});
afterEach(async () => {
  await bridge.shutdown();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

  it.each(['null', '[]', '[{"type":"req"}]', '"text"', '42', 'true', '{'])('ignores malformed frame %s and preserves subsequent admission', async (raw) => {
    const framesBefore = ws.frames.length;
    expect(() => ws.emit('message', raw)).not.toThrow();
    await flush();
    expect(ws.frames).toHaveLength(framesBefore);
    expect(acp.calls).toHaveLength(0);
    await request(ws, 'valid-after-malformed', 'shells.invoke', params());
    const owner = result(ws, 'valid-after-malformed');
    expect(prompts()).toHaveLength(1);
    await request(ws, 'overlap-after-malformed', 'shells.invoke', params('session-b'));
    expect(responses(ws, 'overlap-after-malformed').at(-1)).toMatchObject({ ok: false, error: { message: 'BRIDGE_BUSY' } });
    acp.emit('notification', { method: 'session/update', params: { sessionId: 'session-a', update: 'healthy' } });
    expect(events(ws, 'shell.delta').at(-1)?.payload).toMatchObject({ runId: owner.runId, seq: 1 });
  });

  it.each(['session-a', 'session-b'])('enforces advertised instance max1 for concurrent %s', async (sessionId) => {
    await request(ws, 'first', 'shells.invoke', params());
    const owner = result(ws, 'first');
    await request(ws, 'second', 'shells.invoke', params(sessionId));
    expect(responses(ws, 'second')).toEqual([expect.objectContaining({
      ok: false, error: { code: 'BRIDGE_ERROR', message: 'BRIDGE_BUSY' },
    })]);
    expect(prompts()).toHaveLength(1);
    acp.emit('notification', { method: 'session/update', params: { sessionId: 'session-a', update: 'one' } });
    expect(events(ws, 'shell.delta').at(-1)?.payload).toMatchObject({ runId: owner.runId, sessionId: 'session-a', seq: 1 });
    const registration = ws.frames.find((f): f is RequestFrame => f.type === 'req' && f.method === 'shells.register');
    expect(registration?.params).toMatchObject({ capabilities: { maxConcurrentRuns: 1 } });
  });

  it('replays an identical active request ID without another prompt and rejects conflicting reuse', async () => {
    await request(ws, 'same', 'shells.invoke', params());
    const owner = result(ws, 'same');
    await request(ws, 'same', 'shells.invoke', params());
    expect(responses(ws, 'same')).toHaveLength(2);
    expect(result(ws, 'same')).toEqual(owner);
    await request(ws, 'same', 'shells.invoke', params('session-a', 'different'));
    expect(responses(ws, 'same').at(-1)).toMatchObject({ ok: false, error: { message: 'BRIDGE_DUPLICATE_REQUEST' } });
    expect(prompts()).toHaveLength(1);
  });

  it('releases the completed owner and ignores a stale final against a newer owner', async () => {
    await request(ws, 'old', 'shells.invoke', params());
    const old = result(ws, 'old');
    prompts()[0]!.resolve({ stopReason: 'end' });
    await flush();
    await request(ws, 'new', 'shells.invoke', params());
    const current = result(ws, 'new');
    expect(current.runId).not.toBe(old.runId);
    // Simulate a stale completion callback; real ACP promise settlement is once-only.
    const completion = bridge as unknown as { emitFinal: (runId: string, sessionId: string, state: 'final', startedAt: number, extra: { result: unknown }) => void };
    completion.emitFinal(old.runId, 'session-a', 'final', old.startedAt, { result: {} });
    acp.emit('notification', { method: 'session/update', params: { sessionId: 'session-a', update: 'current' } });
    expect(events(ws, 'shell.final')).toHaveLength(1);
    expect(events(ws, 'shell.delta').at(-1)?.payload).toMatchObject({ runId: current.runId, seq: 1 });
    await request(ws, 'cancel-current', 'shells.cancel', { shellId: config.shellId, runId: current.runId });
    expect(acp.calls.at(-1)).toMatchObject({ method: 'session/cancel', params: { sessionId: 'session-a' } });
  });

  it('returns false for unknown cancellation without calling ACP', async () => {
    await request(ws, 'cancel-missing', 'shells.cancel', { shellId: config.shellId, runId: 'unknown' });
    expect(responses(ws, 'cancel-missing').at(-1)).toMatchObject({ ok: true, payload: { cancelled: false } });
    expect(acp.calls).toHaveLength(0);
  });

  it('keeps ownership after cancel acknowledgment until the prompt actually settles', async () => {
    await request(ws, 'owner', 'shells.invoke', params());
    const owner = result(ws, 'owner');
    await request(ws, 'cancel', 'shells.cancel', { shellId: config.shellId, runId: owner.runId });
    acp.calls.find((call) => call.method === 'session/cancel')!.resolve({});
    await flush();
    expect(responses(ws, 'cancel').at(-1)).toMatchObject({ ok: true, payload: { cancelled: true } });
    await request(ws, 'still-busy', 'shells.invoke', params('session-b'));
    expect(responses(ws, 'still-busy').at(-1)).toMatchObject({ ok: false, error: { message: 'BRIDGE_BUSY' } });
    prompts()[0]!.resolve({});
    await flush();
    await request(ws, 'next', 'shells.invoke', params('session-b'));
    expect(result(ws, 'next').runId).not.toBe(owner.runId);
  });

  it('releases only the failed reservation on synchronous ACP failure', async () => {
    vi.spyOn(acp, 'call').mockImplementationOnce(() => { throw new Error('synthetic synchronous failure'); });
    await request(ws, 'failed', 'shells.invoke', params());
    expect(responses(ws, 'failed').at(-1)).toMatchObject({ ok: false, error: { message: 'synthetic synchronous failure' } });
    await request(ws, 'next', 'shells.invoke', params());
    expect(result(ws, 'next').runId).toMatch(/^run_/);
    expect(prompts()).toHaveLength(1);
  });

  it('rejects wrong-shell invocation and cancellation before touching the owner', async () => {
    await request(ws, 'wrong', 'shells.invoke', { ...params(), shellId: 'other-shell' });
    expect(responses(ws, 'wrong').at(-1)).toMatchObject({ ok: false, error: { message: 'BRIDGE_INVALID_REQUEST' } });
    await request(ws, 'owner', 'shells.invoke', params());
    const owner = result(ws, 'owner');
    await request(ws, 'wrong-cancel', 'shells.cancel', { shellId: 'other-shell', runId: owner.runId });
    expect(responses(ws, 'wrong-cancel').at(-1)).toMatchObject({ ok: false, error: { message: 'BRIDGE_INVALID_REQUEST' } });
    expect(acp.calls).toHaveLength(1);
  });

  it('keeps reservation across socket close and ignores late old-socket frames', async () => {
    acp.beforePrompt = () => ws.close();
    await request(ws, 'old', 'shells.invoke', params());
    expect(prompts()).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(10);
    const replacement = fakes.sockets.at(-1)!;
    expect(replacement).not.toBe(ws);
    replacement.emit('open');
    await flush();
    await request(replacement, 'new', 'shells.invoke', params('session-b'));
    expect(responses(replacement, 'new').at(-1)).toMatchObject({ ok: false, error: { message: 'BRIDGE_BUSY' } });
    await request(ws, 'stale', 'shells.invoke', params('session-b'));
    expect(prompts()).toHaveLength(1);
    // Old socket close must not erase the current connection.
    ws.emit('close');
    await request(replacement, 'health', 'shells.health', {});
    expect(responses(replacement, 'health').at(-1)).toMatchObject({ ok: true });
  });

  it('denies admission after harness exit, including an exit during the preceding prompt', async () => {
    acp.beforePrompt = () => acp.emit('exit', { code: 1, signal: null });
    await request(ws, 'first', 'shells.invoke', params());
    prompts()[0]!.reject(new Error('harness exited'));
    await flush();
    await request(ws, 'after-exit', 'shells.invoke', params('session-b'));
    expect(responses(ws, 'after-exit').at(-1)).toMatchObject({ ok: false, error: { message: 'BRIDGE_UNAVAILABLE' } });
    expect(prompts()).toHaveLength(1);
  });

  it('does not admit late frames after shutdown', async () => {
    await bridge.shutdown();
    await request(ws, 'late', 'shells.invoke', params());
    expect(prompts()).toHaveLength(0);
  });
});

// =============================================================================
// Durable sender lane — real loopback socket, real SQLite journal, synthetic v1
// receiver. The receiver is a contract peer, not the gateway: nothing here
// establishes end-to-end durability against a real gateway.
// =============================================================================

interface Deferred<T> { promise: Promise<T>; resolve(v: T): void }
function deferred<T>(): Deferred<T> {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}

const DIGEST_A = createHash('sha256').update('hello', 'utf8').digest('hex');
const DIGEST_B = createHash('sha256').update('different', 'utf8').digest('hex');

function admission(over: Record<string, unknown> = {}): ShellRunAdmission {
  return {
    version: 1, shellId: config.shellId, runId: 'run-durable-1', sessionId: 'sess-1',
    invocationId: 'inv-1', inputDigest: DIGEST_A, startedAt: 1_700_000_000_000, ...over,
  } as ShellRunAdmission;
}

/** Synthetic v1 gateway receiver over an owned loopback socket. */
class Receiver {
  readonly wss: WebSocketServer;
  readonly url: string;
  conns: RealWebSocket[] = [];
  /** Wire value advertised in the registration response; `undefined` omits the field. */
  advertise: unknown = 1;
  registrations = 0;
  commits: ShellRunOutcome[] = [];
  events: EventFrame[] = [];
  receipts = new Map<string, ShellOutcomeReceipt>();
  mutateReceipt?: (receipt: ShellOutcomeReceipt) => unknown;
  /** Close the connection instead of replying to commit_outcome. */
  dropCommit = false;
  rejectCommit = false;
  private registered = deferred<void>();
  private commitSeen = deferred<void>();
  private nextId = 1;
  private waiting = new Map<string, (frame: ResponseFrame) => void>();

  private constructor(wss: WebSocketServer, port: number) {
    this.wss = wss;
    this.url = `ws://127.0.0.1:${port}`;
    wss.on('connection', (socket) => {
      this.conns.push(socket);
      socket.on('message', (raw) => this.onFrame(socket, String(raw)));
    });
  }

  static async listen(): Promise<Receiver> {
    const wss = new WebSocketServer({ host: '127.0.0.1', port: 0 });
    await new Promise<void>((resolve) => wss.once('listening', () => resolve()));
    const address = wss.address();
    if (!address || typeof address === 'string') throw new Error('unexpected pipe address');
    return new Receiver(wss, address.port);
  }

  get current(): RealWebSocket { return this.conns.at(-1)!; }
  whenRegistered(): Promise<void> { return this.registered.promise; }
  whenCommitted(): Promise<void> { return this.commitSeen.promise; }
  expectRegistration(): void { this.registered = deferred(); }
  expectCommit(): void { this.commitSeen = deferred(); }

  private onFrame(socket: RealWebSocket, raw: string): void {
    const frame = JSON.parse(raw) as RequestFrame | ResponseFrame | EventFrame;
    if (frame.type === 'res') { this.waiting.get(frame.id)?.(frame); this.waiting.delete(frame.id); return; }
    if (frame.type === 'event') { this.events.push(frame); return; }
    if (frame.type !== 'req') return;
    const reply = (payload: unknown) => socket.send(JSON.stringify({ type: 'res', id: frame.id, ok: true, payload }));
    if (frame.method === 'shells.register') {
      this.registrations++;
      reply({ shellId: config.shellId, heartbeatMs: 3_600_000, ...(this.advertise === undefined ? {} : { durableOutcomeVersion: this.advertise }) });
      this.registered.resolve();
      return;
    }
    if (frame.method === 'shells.commit_outcome') {
      const outcome = frame.params as ShellRunOutcome;
      this.commits.push(outcome);
      this.commitSeen.resolve();
      if (this.dropCommit) { socket.close(); return; }
      if (this.rejectCommit) {
        socket.send(JSON.stringify({ type: 'res', id: frame.id, ok: false, error: { code: 'GATEWAY_REFUSED', message: 'refused' } }));
        return;
      }
      // Stable per-event receipt: a duplicate commit returns the original.
      const stored = this.receipts.get(outcome.eventId) ?? {
        version: 1 as const, shellId: outcome.shellId, runId: outcome.runId, eventId: outcome.eventId,
        outcomeDigest: outcome.outcomeDigest, receiptId: `rcpt-${this.receipts.size + 1}`, committedAt: 1_700_000_009_000,
      };
      this.receipts.set(outcome.eventId, stored);
      reply(this.mutateReceipt ? this.mutateReceipt(stored) : stored);
      return;
    }
    reply({ ts: 1 });
  }

  /** Forward an admitted invocation the way the gateway's machine endpoint would. */
  invokeDurable(params: unknown, socket: RealWebSocket = this.current): Promise<ResponseFrame> {
    const id = `g${this.nextId++}`;
    return new Promise((resolve) => {
      this.waiting.set(id, resolve);
      socket.send(JSON.stringify({ type: 'req', id, method: 'shells.invoke_durable', params }));
    });
  }

  request(method: string, params: unknown, socket: RealWebSocket = this.current): Promise<ResponseFrame> {
    const id = `g${this.nextId++}`;
    return new Promise((resolve) => {
      this.waiting.set(id, resolve);
      socket.send(JSON.stringify({ type: 'req', id, method, params }));
    });
  }

  async close(): Promise<void> {
    for (const socket of this.conns) socket.terminate();
    await new Promise<void>((resolve) => this.wss.close(() => resolve()));
  }
}

describe('Bridge durable sender', () => {
  let receiver: Receiver;
  let durable: InstanceType<typeof Bridge> | null;
  let dir: string;
  let journalOptions: RunJournalOptions;
  const bridges: Array<InstanceType<typeof Bridge>> = [];

  /** Second handle onto the same store, used to observe durability independently. */
  function readJournal<T>(read: (journal: RunJournal) => T): T {
    const journal = new RunJournal(journalOptions);
    try { return read(journal); } finally { journal.close(); }
  }

  async function startBridge(): Promise<InstanceType<typeof Bridge>> {
    receiver.expectRegistration();
    const instance = new Bridge({
      ...config, gatewayUrl: receiver.url, harnessWorkDir: join(dir, 'work'),
      durable: { mode: 'required', journalPath: journalOptions.path, maxRuns: 8, maxOutcomeBytes: 57_344 },
    });
    bridges.push(instance);
    instance.start();
    await receiver.whenRegistered();
    await settle();
    return instance;
  }

  const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 25));
  const acpOf = () => fakes.acps.at(-1)!;
  const promptsOf = () => acpOf().calls.filter((c) => c.method === 'session/prompt');

  beforeEach(async () => {
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    fakes.acps.length = 0;
    fakes.sockets.length = 0;
    bridges.length = 0;
    dir = mkdtempSync(join(tmpdir(), 'shells-11-03-'));
    mkdirSync(join(dir, 'work'));
    journalOptions = {
      path: join(dir, 'journal.db'), shellId: config.shellId,
      maxRuns: 8, maxOutcomeBytes: 57_344, limits: SHELL_DURABLE_V1_OUTCOME_LIMITS,
    };
    receiver = await Receiver.listen();
    durable = await startBridge();
  });

  afterEach(async () => {
    for (const instance of bridges) await instance.shutdown();
    durable = null;
    await receiver.close();
    vi.restoreAllMocks();
    rmSync(dir, { recursive: true, force: true });
  });

  it('executes under the receiver-issued identity and replies with the strict response', async () => {
    const admitted = admission();
    const response = await receiver.invokeDurable({ version: 1, admission: admitted, input: { kind: 'text', text: 'hello' } });
    expect(response).toMatchObject({ ok: true });
    expect(response.payload).toEqual({ version: 1, durability: 'required', runId: 'run-durable-1', startedAt: 1_700_000_000_000 });
    expect(promptsOf()).toHaveLength(1);
    expect(promptsOf()[0]!.params).toEqual({ sessionId: 'sess-1', input: { kind: 'text', text: 'hello' } });
    // The admission is durable and unchanged; nothing was minted locally.
    expect(readJournal((j) => j.inspect('run-durable-1'))).toMatchObject({ admission: admitted, outcome: null });
    expect(JSON.stringify(response.payload)).not.toMatch(/run_/);
  });

  it('refuses an admission for another shell before any journal or ACP work', async () => {
    const response = await receiver.invokeDurable({ version: 1, admission: admission({ shellId: 'other-shell' }), input: { kind: 'text', text: 'hello' } });
    expect(response).toMatchObject({ ok: false, error: { message: 'BRIDGE_INVALID_REQUEST' } });
    expect(promptsOf()).toHaveLength(0);
    expect(readJournal((j) => j.inspect('run-durable-1'))).toBeNull();
  });

  it.each([
    ['missing', undefined],
    ['non-object', 'text'],
    ['array', []],
    ['wrong version', { version: 2, admission: admission(), input: { kind: 'text', text: 'hello' } }],
    ['extra field', { version: 1, admission: admission(), input: { kind: 'text', text: 'hello' }, extra: 1 }],
    ['missing input', { version: 1, admission: admission() }],
  ])('refuses a %s envelope', async (_name, params) => {
    const response = await receiver.invokeDurable(params);
    expect(response).toMatchObject({ ok: false, error: { message: 'BRIDGE_INVALID_REQUEST' } });
    expect(promptsOf()).toHaveLength(0);
    expect(readJournal((j) => j.inspect('run-durable-1'))).toBeNull();
  });

  it('refuses a prototype-polluted envelope', async () => {
    const raw = `{"version":1,"admission":${JSON.stringify(admission())},"input":{"kind":"text","text":"hello"},"__proto__":{"polluted":true}}`;
    const response = await receiver.invokeDurable(JSON.parse(raw) as unknown);
    expect(response).toMatchObject({ ok: false });
    expect(promptsOf()).toHaveLength(0);
  });

  it.each([
    ['bad digest', { inputDigest: 'not-a-digest' }],
    ['over-long identifier', { runId: 'r'.repeat(300) }],
    ['negative startedAt', { startedAt: -1 }],
    ['unpaired surrogate', { sessionId: '\ud800' }],
  ])('delegates %s to the canonical admission normalizer', async (_name, over) => {
    const response = await receiver.invokeDurable({ version: 1, admission: admission(over), input: { kind: 'text', text: 'hello' } });
    expect(response).toMatchObject({ ok: false, error: { message: 'INVALID_SHELL_OUTCOME' } });
    expect(promptsOf()).toHaveLength(0);
  });

  it('replays an identical admission without a second prompt and refuses a conflicting one', async () => {
    const first = await receiver.invokeDurable({ version: 1, admission: admission(), input: { kind: 'text', text: 'hello' } });
    const second = await receiver.invokeDurable({ version: 1, admission: admission(), input: { kind: 'text', text: 'hello' } });
    expect(second.payload).toEqual(first.payload);
    expect(promptsOf()).toHaveLength(1);
    const conflict = await receiver.invokeDurable({ version: 1, admission: admission({ inputDigest: DIGEST_B }), input: { kind: 'text', text: 'different' } });
    expect(conflict).toMatchObject({ ok: false, error: { message: 'SHELL_JOURNAL_CONFLICT' } });
    expect(promptsOf()).toHaveLength(1);
  });

  it('refuses a second concurrent admission through the journal single-run index', async () => {
    await receiver.invokeDurable({ version: 1, admission: admission(), input: { kind: 'text', text: 'hello' } });
    const busy = await receiver.invokeDurable({ version: 1, admission: admission({ runId: 'run-durable-2', invocationId: 'inv-2', sessionId: 'sess-2' }), input: { kind: 'text', text: 'hello' } });
    expect(busy).toMatchObject({ ok: false, error: { message: 'SHELL_JOURNAL_BUSY' } });
    expect(promptsOf()).toHaveLength(1);
  });

  it('refuses durable admission after shutdown and refuses legacy invocation in required mode', async () => {
    const legacy = await receiver.request('shells.invoke', { shellId: config.shellId, sessionId: 'sess-1', input: { kind: 'text', text: 'hello' } });
    expect(legacy).toMatchObject({ ok: false, error: { message: 'BRIDGE_DURABLE_REQUIRED' } });
    expect(promptsOf()).toHaveLength(0);
    const socket = receiver.current;
    await durable!.shutdown();
    socket.send(JSON.stringify({ type: 'req', id: 'late', method: 'shells.invoke_durable', params: { version: 1, admission: admission(), input: { kind: 'text', text: 'hello' } } }));
    await settle();
    expect(promptsOf()).toHaveLength(0);
    expect(readJournal((j) => j.inspect('run-durable-1'))).toBeNull();
  });

  it('journals the terminal before the frame is sent and acknowledges only after a valid receipt', async () => {
    await receiver.invokeDurable({ version: 1, admission: admission(), input: { kind: 'text', text: 'hello' } });
    receiver.expectCommit();
    receiver.rejectCommit = true;
    promptsOf()[0]!.resolve({ stopReason: 'end_turn' });
    await receiver.whenCommitted();
    // Observed from an independent handle: durable terminal, no receipt.
    const pendingBefore = readJournal((j) => j.pending());
    expect(pendingBefore).toHaveLength(1);
    expect(pendingBefore[0]).toMatchObject({ runId: 'run-durable-1', state: 'final', stopReason: 'end_turn', inputDigest: DIGEST_A });
    expect(receiver.commits[0]).toEqual(pendingBefore[0]);
    await settle();
    expect(readJournal((j) => j.pending())).toHaveLength(1);
  });

  it('acknowledges a valid receipt exactly once and never emits shell.final for a durable run', async () => {
    await receiver.invokeDurable({ version: 1, admission: admission(), input: { kind: 'text', text: 'hello' } });
    receiver.expectCommit();
    promptsOf()[0]!.resolve({ stopReason: 'end_turn' });
    await receiver.whenCommitted();
    await settle();
    expect(readJournal((j) => j.pending())).toHaveLength(0);
    expect(receiver.commits).toHaveLength(1);
    expect(receiver.events.filter((f) => f.event === 'shell.final')).toHaveLength(0);
  });

  it.each([
    ['wrong eventId', (r: ShellOutcomeReceipt) => ({ ...r, eventId: 'evt-foreign' })],
    ['wrong runId', (r: ShellOutcomeReceipt) => ({ ...r, runId: 'run-foreign' })],
    ['wrong digest', (r: ShellOutcomeReceipt) => ({ ...r, outcomeDigest: DIGEST_B })],
    ['foreign shellId', (r: ShellOutcomeReceipt) => ({ ...r, shellId: 'other-shell' })],
    ['malformed shape', (r: ShellOutcomeReceipt) => ({ ...r, committedAt: 'later' })],
  ])('leaves the terminal pending for a %s receipt', async (_name, mutate) => {
    receiver.mutateReceipt = mutate as (receipt: ShellOutcomeReceipt) => unknown;
    await receiver.invokeDurable({ version: 1, admission: admission(), input: { kind: 'text', text: 'hello' } });
    receiver.expectCommit();
    promptsOf()[0]!.resolve({ stopReason: 'end_turn' });
    await receiver.whenCommitted();
    await settle();
    expect(readJournal((j) => j.pending())).toHaveLength(1);
  });

  it('replays an unacknowledged terminal after reconnect with no additional prompt', async () => {
    await receiver.invokeDurable({ version: 1, admission: admission(), input: { kind: 'text', text: 'hello' } });
    receiver.expectCommit();
    receiver.dropCommit = true;
    promptsOf()[0]!.resolve({ stopReason: 'end_turn' });
    await receiver.whenCommitted();
    receiver.dropCommit = false;
    expect(readJournal((j) => j.pending())).toHaveLength(1);
    receiver.expectRegistration();
    await receiver.whenRegistered();
    await settle();
    expect(readJournal((j) => j.pending())).toHaveLength(0);
    // Same stored terminal re-sent; the receiver returned its original receipt.
    expect(receiver.commits).toHaveLength(2);
    expect(receiver.commits[1]).toEqual(receiver.commits[0]);
    expect(receiver.receipts.size).toBe(1);
    expect(promptsOf()).toHaveLength(1);
  });

  it('replays a terminal that survived a bridge restart, exactly once and without a prompt', async () => {
    await receiver.invokeDurable({ version: 1, admission: admission(), input: { kind: 'text', text: 'hello' } });
    receiver.expectCommit();
    receiver.rejectCommit = true;
    promptsOf()[0]!.resolve({ stopReason: 'end_turn' });
    await receiver.whenCommitted();
    await settle();
    await durable!.shutdown();
    expect(readJournal((j) => j.pending())).toHaveLength(1);
    receiver.rejectCommit = false;
    const restarted = await startBridge();
    await settle();
    expect(readJournal((j) => j.pending())).toHaveLength(0);
    expect(receiver.commits).toHaveLength(2);
    expect(receiver.commits[1]).toEqual(receiver.commits[0]);
    expect(promptsOf()).toHaveLength(0);
    expect(restarted).toBeDefined();
  });

  it('keeps the socket legacy when registration omits durableOutcomeVersion', async () => {
    await durable!.shutdown();
    receiver.advertise = undefined;
    await startBridge();
    await receiver.invokeDurable({ version: 1, admission: admission(), input: { kind: 'text', text: 'hello' } });
    receiver.expectCommit();
    promptsOf()[0]!.resolve({ stopReason: 'end_turn' });
    await settle();
    expect(receiver.commits).toHaveLength(0);
    expect(readJournal((j) => j.pending())).toHaveLength(1);
  });

  it('refuses a malformed durable advertisement instead of treating it as absence', async () => {
    await durable!.shutdown();
    receiver.advertise = 2;
    const before = receiver.registrations;
    await startBridge();
    await settle();
    // Registration failed and the socket was dropped; the bridge retries rather than
    // silently downgrading to legacy the way an omitted field would.
    expect(receiver.registrations).toBeGreaterThan(before + 1);
    expect(receiver.commits).toHaveLength(0);
    receiver.expectRegistration();
    receiver.advertise = 1;
    await receiver.whenRegistered();
    await settle();
    const accepted = await receiver.invokeDurable({ version: 1, admission: admission(), input: { kind: 'text', text: 'hello' } });
    expect(accepted).toMatchObject({ ok: true });
  });

  it('never puts raw error text in errorMessage', async () => {
    await receiver.invokeDurable({ version: 1, admission: admission(), input: { kind: 'text', text: 'hello' } });
    receiver.expectCommit();
    promptsOf()[0]!.reject(new Error('provider said SECRET_TOKEN=abc at /home/agent/state/key.pem'));
    await receiver.whenCommitted();
    expect(receiver.commits[0]).toMatchObject({ state: 'error', errorMessage: 'harness prompt failed' });
    expect(JSON.stringify(receiver.commits[0])).not.toMatch(/SECRET_TOKEN|key\.pem/);
  });

  it('records a cancellation request as its own observation without producing a terminal', async () => {
    await receiver.invokeDurable({ version: 1, admission: admission(), input: { kind: 'text', text: 'hello' } });
    void receiver.request('shells.cancel', { shellId: config.shellId, runId: 'run-durable-1' });
    await settle();
    const requested = readJournal((j) => j.inspect('run-durable-1'));
    expect(requested).toMatchObject({ cancellation: { kind: 'cancel_requested' }, outcome: null });
    // Still reserved: the slot is not released by asking.
    const busy = await receiver.invokeDurable({ version: 1, admission: admission({ runId: 'run-durable-2', invocationId: 'inv-2', sessionId: 'sess-2' }), input: { kind: 'text', text: 'hello' } });
    expect(busy).toMatchObject({ ok: false, error: { message: 'SHELL_JOURNAL_BUSY' } });
    // An expired or failed local wait is uncertainty, never proof the harness stopped.
    acpOf().calls.find((c) => c.method === 'session/cancel')!.reject(new Error('ACP call timed out'));
    await settle();
    expect(readJournal((j) => j.inspect('run-durable-1'))).toMatchObject({ cancellation: { kind: 'cancel_unconfirmed' } });
    // A terminal arriving after cancellation still wins and commits.
    receiver.expectCommit();
    promptsOf()[0]!.resolve({ stopReason: 'cancelled' });
    await receiver.whenCommitted();
    await settle();
    expect(receiver.commits[0]).toMatchObject({ state: 'aborted', stopReason: 'cancelled' });
    // A cancellation request after the terminal changes nothing.
    await receiver.request('shells.cancel', { shellId: config.shellId, runId: 'run-durable-1' });
    expect(readJournal((j) => j.inspect('run-durable-1'))).toMatchObject({ cancellation: { kind: 'cancel_unconfirmed' } });
  });
});
