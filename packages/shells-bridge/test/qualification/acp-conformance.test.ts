// ACP v1 conformance for the bridge's stdio client.
//
// Two evidence tiers, deliberately separate:
//   1. `test/fixtures/acp-transcript.json` replayed by a scripted peer over real
//      child-process stdio. Synthetic: proves the adapter's protocol behaviour
//      (request/response/notification discrimination, permission ids, cancel,
//      malformed input, exit) — NOT that any real harness works.
//   2. The pinned official example agent from @agentclientprotocol/sdk@1.4.0,
//      resolved from its exact installed package; absent artifacts fail the suite.
//      Credential-free and model-free; it is SDK interoperability, not a paid harness.
// The credential-free example is mandatory here; paid-provider acceptance remains separate.
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  AcpClient,
  type PermissionOutcome,
  type PermissionRequestParams,
} from './sdk-acp-client.js';

const FIXTURE = fileURLToPath(
  new URL('../fixtures/acp-transcript.json', import.meta.url),
);
const MAX_LINE_BYTES = 64 * 1024;

// Scripted peer: walks one scenario, emits agent->client steps, checks each
// client->agent line against the expected kind/method/match, echoes what it
// received as `RECV <line>` on stderr, exits 3 on the first mismatch.
const REPLAYER = `
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
const [fixturePath, name, maxLineBytes] = process.argv.slice(2);
const fx = JSON.parse(readFileSync(fixturePath, 'utf8'));
const sc = fx.scenarios.find((s) => s.name === name);
if (!sc) { process.stderr.write('FIXTURE no scenario ' + name + '\\n'); process.exit(4); }
const steps = sc.steps; let i = 0; let lastClientReqId = null; let lastAgentReqId = null;
const out = (s) => process.stdout.write(s + '\\n');
const fail = (m) => { process.stderr.write('FIXTURE MISMATCH step ' + i + ': ' + m + '\\n'); process.exit(3); };
const subset = (obj, sub) => sub !== null && typeof sub === 'object'
  ? obj !== null && typeof obj === 'object' && Object.keys(sub).every((k) => subset(obj[k], sub[k]))
  : Object.is(obj, sub);
function flush() {
  while (i < steps.length && steps[i].dir === 'agent->client') {
    const st = steps[i++];
    if (st.kind === 'exit') process.exit(st.code);
    if (st.kind === 'malformed') { out(st.raw === '$oversize' ? 'x'.repeat(Number(maxLineBytes) + 1) : st.raw); continue; }
    const m = { ...st.message };
    if (m.id === '$last') m.id = lastClientReqId;
    if (st.kind === 'request') lastAgentReqId = m.id;
    out(JSON.stringify(m));
  }
}
flush();
const rl = createInterface({ input: process.stdin });
rl.on('line', (line) => {
  process.stderr.write('RECV ' + line + '\\n');
  const st = steps[i];
  if (!st || st.dir !== 'client->agent') return fail('unexpected client line ' + line);
  let msg; try { msg = JSON.parse(line); } catch { return fail('unparseable ' + line); }
  if (st.kind === 'request') { if (msg.method !== st.message.method || msg.id === undefined) fail('expected request ' + st.message.method + ' got ' + line); lastClientReqId = msg.id; }
  else if (st.kind === 'notification') { if (msg.method !== st.message.method || 'id' in msg) fail('expected notification ' + st.message.method + ' got ' + line); }
  else if (st.kind === 'response') { if (!Object.is(msg.id, lastAgentReqId)) fail('expected response to ' + JSON.stringify(lastAgentReqId) + ' got ' + line); }
  if (st.match && !subset(msg, st.match)) fail('match ' + JSON.stringify(st.match) + ' vs ' + line);
  i++; flush();
});
rl.on('close', () => { if (!sc.holdOnEof) process.exit(0); setTimeout(() => {}, 30_000); });
`;

let work: string;
let replayer: string;
const live: AcpClient[] = [];
beforeAll(() => {
  work = mkdtempSync(join(tmpdir(), 'acp-conformance-'));
  replayer = join(work, 'replayer.mjs');
  writeFileSync(replayer, REPLAYER);
});
afterAll(() => rmSync(work, { recursive: true, force: true }));
afterEach(async () => {
  for (const c of live.splice(0)) {
    if ((await c.stop(30)).exited) continue;
    const exited = once(c, 'exit');
    c.kill('SIGKILL');
    await exited;
  }
});

interface Harness {
  client: AcpClient;
  sent: Array<Record<string, unknown>>;
  stderr: string[];
  notifications: Array<{ method: string; params?: unknown }>;
  parseErrors: unknown[];
  exited: Promise<{
    code: number | null;
    signal: NodeJS.Signals | null;
    error?: Error;
  }>;
}
function start(
  scenario: string,
  extra: { command?: string; args?: string[] } = {},
): Harness {
  const client = new AcpClient({
    command: extra.command ?? process.execPath,
    args: extra.args ?? [replayer, FIXTURE, scenario, String(MAX_LINE_BYTES)],
    cwd: work,
    // Allowlisted environment only: no ambient credential reaches the peer.
    env: { PATH: process.env.PATH ?? '', HOME: work, TMPDIR: work },
    maxLineBytes: MAX_LINE_BYTES,
  });
  const h: Harness = {
    client,
    sent: [],
    stderr: [],
    notifications: [],
    parseErrors: [],
    exited: new Promise((resolve) => client.once('exit', resolve)),
  };
  client.on('stderr', (chunk: string) => {
    for (const line of chunk.split('\n')) {
      if (!line) continue;
      h.stderr.push(line);
      if (line.startsWith('RECV '))
        h.sent.push(JSON.parse(line.slice(5)) as Record<string, unknown>);
    }
  });
  client.on('notification', (m: { method: string; params?: unknown }) =>
    h.notifications.push(m),
  );
  client.on('parse_error', (e: unknown) => h.parseErrors.push(e));
  client.start();
  live.push(client);
  return h;
}
const once = <T>(
  client: AcpClient,
  event: string,
  when: (v: T) => boolean = () => true,
): Promise<T> =>
  new Promise((resolve) => {
    const on = (v: T) => {
      if (when(v)) {
        client.off(event, on);
        resolve(v);
      }
    };
    client.on(event, on);
  });
const noMismatch = (h: Harness) =>
  expect(h.stderr.filter((l) => l.startsWith('FIXTURE'))).toEqual([]);
// The peer's `RECV` echo is complete only once it has exited (client `exit` = child close, stdio drained).
const drain = async (h: Harness) => {
  await h.client.stop(2_000);
  await h.exited;
};

describe('AcpClient against the scripted peer over real stdio', () => {
  it('initialize negotiates version 1 and returns agent capabilities', async () => {
    const h = start('initialize');
    const init = await h.client.initialize({
      fs: { readTextFile: false, writeTextFile: false },
      terminal: false,
    });
    expect(init.protocolVersion).toBe(1);
    expect(init.agentCapabilities).toMatchObject({ loadSession: false });
    expect(await h.client.stop(2_000)).toEqual({ exited: true });
    await h.exited;
    expect(h.sent[0]).toMatchObject({
      jsonrpc: '2.0',
      method: 'initialize',
      params: { protocolVersion: 1 },
    });
    noMismatch(h);
  });

  it('rejects an agent that answers with a different protocol version', async () => {
    const h = start('initialize-version-mismatch');
    await expect(h.client.initialize()).rejects.toThrow(/protocol version/);
    noMismatch(h);
  });

  it('surfaces a JSON-RPC error response as a rejection with its code', async () => {
    const h = start('initialize-error');
    await expect(h.client.initialize()).rejects.toThrow(
      /-32000.*agent refused/,
    );
    noMismatch(h);
  });

  it('session/new returns the agent-owned session id', async () => {
    const h = start('session-new');
    await h.client.initialize();
    await expect(h.client.newSession('/private/work')).resolves.toEqual({
      sessionId: 'sess-a1',
    });
    await drain(h);
    expect(h.sent[1]).toMatchObject({
      method: 'session/new',
      params: { cwd: '/private/work', mcpServers: [] },
    });
    noMismatch(h);
  });

  it('rejects a session/new result without a session id', async () => {
    const h = start('session-new-missing-id');
    await h.client.initialize();
    await expect(h.client.newSession('/private/work')).rejects.toThrow(
      /sessionId/,
    );
    noMismatch(h);
  });

  it('answers a numeric permission id that collides with the pending prompt id, then completes the turn', async () => {
    const h = start('prompt-permission-numeric-id-collision');
    const seen: PermissionRequestParams[] = [];
    h.client.setPermissionHandler((p): PermissionOutcome => {
      seen.push(p);
      return { outcome: 'selected', optionId: 'allow' };
    });
    await h.client.initialize();
    const { sessionId } = await h.client.newSession('/private/work');
    const result = await h.client.prompt(sessionId, [
      { type: 'text', text: 'update the config' },
    ]);
    expect(result).toEqual({ stopReason: 'end_turn' });
    expect(seen).toHaveLength(1);
    expect(seen[0]!.options.map((o) => o.optionId)).toEqual([
      'allow',
      'reject',
    ]);
    await drain(h);
    const promptId = h.sent.find((m) => m.method === 'session/prompt')!.id;
    const answer = h.sent.find((m) => 'result' in m && !('method' in m))!;
    expect(answer).toEqual({
      jsonrpc: '2.0',
      id: promptId,
      result: { outcome: { outcome: 'selected', optionId: 'allow' } },
    });
    expect(
      h.notifications.map(
        (n) =>
          (n.params as { update: { sessionUpdate: string } }).update
            .sessionUpdate,
      ),
    ).toEqual(['agent_message_chunk', 'tool_call', 'tool_call_update']);
    noMismatch(h);
  });

  it('answers a string permission id with the reject option when no policy is installed', async () => {
    const h = start('prompt-permission-string-id-default-reject');
    await h.client.initialize();
    const { sessionId } = await h.client.newSession('/private/work');
    await expect(
      h.client.prompt(sessionId, [{ type: 'text', text: 'delete everything' }]),
    ).resolves.toEqual({ stopReason: 'end_turn' });
    await drain(h);
    expect(h.sent.find((m) => m.id === 'perm-7')).toEqual({
      jsonrpc: '2.0',
      id: 'perm-7',
      result: { outcome: { outcome: 'selected', optionId: 'no' } },
    });
    noMismatch(h);
  });

  it('cancel is a notification; only the prompt response confirms cancellation', async () => {
    const h = start('cancel-mid-turn');
    await h.client.initialize();
    const { sessionId } = await h.client.newSession('/private/work');
    const turn = h.client.prompt(sessionId, [
      { type: 'text', text: 'long task' },
    ]);
    await once(h.client, 'notification');
    await h.client.cancel(sessionId);
    await expect(turn).resolves.toEqual({ stopReason: 'cancelled' });
    await drain(h);
    const cancelMsg = h.sent.find((m) => m.method === 'session/cancel')!;
    expect(cancelMsg).toEqual({
      jsonrpc: '2.0',
      method: 'session/cancel',
      params: { sessionId },
    });
    expect(cancelMsg).not.toHaveProperty('id');
    // A late update after cancel was sent still reaches the subscriber until the turn settles.
    expect(h.notifications).toHaveLength(2);
    noMismatch(h);
  });

  it('cancel answers a pending permission request with outcome cancelled before notifying', async () => {
    const h = start('cancel-during-permission');
    let asked!: () => void;
    const askedP = new Promise<void>((r) => {
      asked = r;
    });
    h.client.setPermissionHandler(() => {
      asked();
      return new Promise<PermissionOutcome>(() => {});
    });
    await h.client.initialize();
    const { sessionId } = await h.client.newSession('/private/work');
    const turn = h.client.prompt(sessionId, [
      { type: 'text', text: 'risky task' },
    ]);
    await askedP;
    await h.client.cancel(sessionId);
    await expect(turn).resolves.toEqual({ stopReason: 'cancelled' });
    await drain(h);
    const order = h.sent
      .slice(3)
      .map(
        (m) =>
          m.method ??
          `response:${JSON.stringify((m.result as { outcome: unknown }).outcome)}`,
      );
    expect(order).toEqual([
      'response:{"outcome":"cancelled"}',
      'session/cancel',
    ]);
    noMismatch(h);
  });

  it('rejects pending calls and emits exit when the harness dies mid-call', async () => {
    const h = start('harness-exit-mid-call');
    await h.client.initialize();
    // Protocol EOF can precede child close; the separate exit observation carries the exit code.
    await expect(h.client.newSession('/private/work')).rejects.toThrow(
      /connection closed|harness exited/,
    );
    await expect(h.exited).resolves.toMatchObject({ code: 3 });
    await expect(h.client.call('session/new', {})).rejects.toThrow(/exited/);
    noMismatch(h);
  });

  it('reports a failed spawn as exit with error instead of an unhandled error event', async () => {
    const h = start('unused', {
      command: join(work, 'no-such-harness'),
      args: [],
    });
    await expect(h.client.initialize()).rejects.toThrow(/ENOENT|exited/);
    const exit = await h.exited;
    expect(exit.code).not.toBe(0);
    expect(exit.error?.message).toMatch(/ENOENT/);
  });

  it('stop reports exited:false when the peer ignores EOF, and kill then produces exit', async () => {
    const h = start('hold-on-eof');
    await h.client.initialize();
    await expect(h.client.stop(300)).resolves.toEqual({ exited: false });
    h.client.kill('SIGKILL');
    await expect(h.exited).resolves.toMatchObject({ signal: 'SIGKILL' });
    noMismatch(h);
  });
});

// Tier 2 always runs the example agent shipped inside the exact installed SDK.
// No PATH/npm fallback, credentialed provider or skip-by-environment.
const EXAMPLE_AGENT = join(
  dirname(createRequire(import.meta.url).resolve('@agentclientprotocol/sdk')),
  'examples/agent.js',
);
describe('pinned @agentclientprotocol/sdk@1.4.0 example agent over stdio', () => {
  const startAgent = () =>
    start('n/a', { command: process.execPath, args: [EXAMPLE_AGENT!] });

  it('completes initialize → session/new → prompt with permission allow → end_turn', async () => {
    const h = startAgent();
    const asked: PermissionRequestParams[] = [];
    h.client.setPermissionHandler((p) => {
      asked.push(p);
      return { outcome: 'selected', optionId: 'allow' };
    });
    const init = await h.client.initialize();
    expect(init.protocolVersion).toBe(1);
    expect(init.agentCapabilities).toMatchObject({ loadSession: false });
    const { sessionId } = await h.client.newSession(work);
    expect(sessionId).toMatch(/^[0-9a-f]{32}$/);
    await expect(
      h.client.prompt(sessionId, [{ type: 'text', text: 'hello' }]),
    ).resolves.toEqual({ stopReason: 'end_turn' });
    expect(asked).toHaveLength(1);
    expect(asked[0]!.options.map((o) => o.kind)).toEqual([
      'allow_once',
      'reject_once',
    ]);
    const kinds = h.notifications.map(
      (n) =>
        (n.params as { update: { sessionUpdate: string } }).update
          .sessionUpdate,
    );
    expect(kinds).toEqual([
      'agent_message_chunk',
      'tool_call',
      'tool_call_update',
      'agent_message_chunk',
      'tool_call',
      'tool_call_update',
      'agent_message_chunk',
    ]);
    expect(h.parseErrors).toEqual([]);
  }, 30_000);

  it('cancel during model work yields stopReason cancelled', async () => {
    const h = startAgent();
    await h.client.initialize();
    const { sessionId } = await h.client.newSession(work);
    const turn = h.client.prompt(sessionId, [{ type: 'text', text: 'hello' }]);
    await once(h.client, 'notification');
    await h.client.cancel(sessionId);
    await expect(turn).resolves.toEqual({ stopReason: 'cancelled' });
  }, 30_000);

  it('NEGATIVE (upstream 1.4.0 example defect): cancel while permission is pending returns end_turn, not cancelled', async () => {
    const h = startAgent();
    let asked!: () => void;
    const askedP = new Promise<void>((r) => {
      asked = r;
    });
    h.client.setPermissionHandler(() => {
      asked();
      return new Promise<PermissionOutcome>(() => {});
    });
    await h.client.initialize();
    const { sessionId } = await h.client.newSession(work);
    const turn = h.client.prompt(sessionId, [{ type: 'text', text: 'hello' }]);
    await askedP;
    await h.client.cancel(sessionId);
    // agent.ts:198-199 returns normally from simulateTurn on a cancelled permission, so
    // prompt() reports end_turn. Recorded as observed behaviour; the bridge must not treat
    // end_turn after a cancel request as cancellation acknowledgement.
    await expect(turn).resolves.toEqual({ stopReason: 'end_turn' });
  }, 30_000);
});

describe('SDK transport resource and malformed-frame boundaries', () => {
  it('uses official parse errors and unknown-method refusal, then continues a healthy exchange', async () => {
    const script = `import {createInterface} from 'node:readline';
      const send = value => process.stdout.write(JSON.stringify(value)+'\\n');
      createInterface({input:process.stdin}).on('line', line => {
        const m=JSON.parse(line); process.stderr.write('RECV '+line+'\\n');
        if(m.method==='initialize') {
          process.stdout.write('{\\nnull\\n');
          send({jsonrpc:'2.0',id:'unknown-method',method:'fixture/unsupported',params:{}});
          send({jsonrpc:'2.0',id:m.id,result:{protocolVersion:1,agentCapabilities:{}}});
        }
      });`;
    const h = start('unused', { args: ['--input-type=module', '-e', script] });
    await expect(h.client.initialize()).resolves.toMatchObject({
      protocolVersion: 1,
    });
    await drain(h);
    expect(
      h.sent
        .filter((m) => 'error' in m)
        .map((m) => (m.error as { code: number }).code)
        .sort((a, b) => a - b),
    ).toEqual([-32700, -32601, -32600]);
  });
  it('closes bounded protocol state for an oversized unterminated line without inventing process exit', async () => {
    const h = start('unused', {
      args: [
        '--input-type=module',
        '-e',
        `process.stdin.on('data',()=>process.stdout.write('x'.repeat(${MAX_LINE_BYTES + 1})));setInterval(()=>{},1000);`,
      ],
    });
    let exitObserved = false;
    h.client.once('exit', () => {
      exitObserved = true;
    });
    await expect(h.client.initialize()).rejects.toThrow(/exceeds/);
    expect(h.parseErrors).toHaveLength(1);
    expect(exitObserved).toBe(false);
    expect(await h.client.stop(30)).toEqual({ exited: false });
    h.client.kill('SIGKILL');
    await h.exited;
  });
  it('bounds pending calls; a local deadline closes protocol but remains an unconfirmed process stop', async () => {
    const client = new AcpClient({
      command: process.execPath,
      args: [
        '--input-type=module',
        '-e',
        'process.stdin.on("data",()=>{});setInterval(()=>{},1000);',
      ],
      cwd: work,
      env: { PATH: process.env.PATH ?? '', HOME: work, TMPDIR: work },
      maxPendingRequests: 1,
    });
    live.push(client);
    client.start();
    const pending = client.call('fixture/hold', {}, 100);
    await expect(client.call('fixture/other', {})).rejects.toThrow(/budget/);
    await expect(pending).rejects.toThrow(/timed out/);
    expect(await client.stop(30)).toEqual({ exited: false });
  });
});

describe('untrusted successful response payloads', () => {
  it.each([
    ['initialize', null, /protocol version/],
    ['session/new', { sessionId: 42 }, /sessionId/],
    ['session/prompt', { stopReason: 'done' }, /stopReason/],
  ])('rejects invalid %s evidence', async (method, result, error) => {
    const script = `import {createInterface} from 'node:readline';
      createInterface({input:process.stdin}).on('line', line=> {
        const m=JSON.parse(line); process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:m.id,result:${JSON.stringify(result)}})+'\\n');
      });`;
    const h = start('unused', { args: ['--input-type=module', '-e', script] });
    const call =
      method === 'initialize'
        ? h.client.initialize()
        : method === 'session/new'
          ? h.client.newSession(work)
          : h.client.prompt('s', [{ type: 'text', text: 'hi' }]);
    await expect(call).rejects.toThrow(error);
  });
});

describe('child lifecycle evidence', () => {
  it('a process error while the child is alive does not certify exit', async () => {
    const h = start('unused', {
      args: [
        '--input-type=module',
        '-e',
        `process.stdin.on('data',()=>{});process.stderr.write('READY');setInterval(()=>{},1000);`,
      ],
    });
    await once<string>(h.client, 'stderr', (value) => value.includes('READY'));
    let exited = false;
    h.client.once('exit', () => {
      exited = true;
    });
    const turn = h.client.call('fixture/hold', {});
    // Node can emit error for a failed kill/send while the child remains alive.
    // Inject that event on the real spawned process, then verify actual close separately.
    const proc = Reflect.get(h.client, 'proc') as {
      emit(event: string, error: Error): boolean;
      kill(signal: NodeJS.Signals): boolean;
    };
    try {
      proc.emit('error', new Error('synthetic kill failure'));
      await expect(turn).rejects.toThrow(/synthetic kill failure/);
      expect(exited).toBe(false);
      expect(await h.client.stop(30)).toEqual({ exited: false });
      h.client.kill('SIGKILL');
      await expect(h.exited).resolves.toMatchObject({ signal: 'SIGKILL' });
      expect(await h.client.stop(30)).toEqual({ exited: true });
    } finally {
      proc.kill('SIGKILL');
    }
  });
});
