import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestFrame, ResponseFrame, EventFrame, ShellsInvokeResponse } from '@minion-stack/shared';
import type { BridgeConfig } from './config.js';

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
vi.mock('ws', async () => {
  const { EventEmitter: Emitter } = await import('node:events');
  return { WebSocket: class extends Emitter {
    static OPEN = 1;
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
  } };
});
vi.mock('./backup.js', () => ({ backup: vi.fn(), restore: vi.fn() }));
const { Bridge } = await import('./bridge.js');

const config: BridgeConfig = {
  shellId: 'shell-fixture', gatewayUrl: 'ws://fixture.invalid', deviceToken: 'synthetic',
  harness: 'codex', harnessVersion: 'fixture', harnessCommand: 'never-spawn',
  harnessArgs: [], harnessWorkDir: '/nonexistent-fixture',
  heartbeatMs: 100, reconnectMinMs: 10, reconnectMaxMs: 20,
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

describe('Bridge session admission and correlation', () => {
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
