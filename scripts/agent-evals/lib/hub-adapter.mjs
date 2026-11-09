import path from 'node:path';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import crypto from 'node:crypto';
import { assert, object, canonical, parse } from './common.mjs';
import { verifyCheckout } from './manifest.mjs';
export class HubAdapter {
  constructor({ root, pin, bounds, onProvider, onDiagnostic = () => {}, unitCommand }) {
    if (!unitCommand) verifyCheckout(root, pin, true);
    this.maxBytes = bounds.maxBodyBytes;
    this.timeout = bounds.maxDurationMs;
    this.pin = pin;
    this.pending = new Map();
    this.seen = new Map();
    this.onProvider = onProvider;
    this.failure = null;
    this.providerTasks = new Set();
    const command = unitCommand ?? [
      process.execPath,
      path.join(root, 'tests/fixtures/critical-journeys/eval-adapter.mjs'),
      '--stdio',
    ];
    this.child = spawn(command[0], command.slice(1), {
      cwd: root,
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        LANG: 'C.UTF-8',
        MINION_EVAL_FIXTURE: '1',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    this.child.stdout.on('data', (chunk) => {
      this.currentBytes = (this.currentBytes ?? 0) + chunk.length;
      if (this.currentBytes > 64 * 1024 * 1024) this.abort(new Error('adapter output overflow'));
      let start = 0;
      for (let index = 0; index < chunk.length; index++)
        if (chunk[index] === 10) {
          this.lineBytes = (this.lineBytes ?? 0) + index - start;
          if (this.lineBytes > this.maxBytes) this.abort(new Error('adapter frame overflow'));
          this.lineBytes = 0;
          start = index + 1;
        }
      this.lineBytes = (this.lineBytes ?? 0) + chunk.length - start;
      if (this.lineBytes > this.maxBytes) this.abort(new Error('adapter frame overflow'));
    });
    this.child.stdin.on('error', (error) => this.abort(error));
    createInterface({ input: this.child.stdout, crlfDelay: Infinity }).on('line', (line) => {
      try {
        assert(Buffer.byteLength(line) <= this.maxBytes, 'adapter line too large');
        const msg = parse(line);
        object(msg, ['version', 'id', 'type', 'payload']);
        assert(msg.version === 1 && typeof msg.id === 'string', 'adapter protocol');
        if (this.seen.has(msg.id)) {
          assert(this.seen.get(msg.id) === canonical(msg), 'conflicting duplicate adapter reply');
          return;
        }
        this.seen.set(msg.id, canonical(msg));
        if (msg.type === 'provider_request') {
          assert(this.helloDone, 'provider before handshake');
          const task = this.handleProvider(msg).catch((e) => this.abort(e));
          this.providerTasks.add(task);
          task.finally(() => this.providerTasks.delete(task));
        } else {
          assert(['result', 'error'].includes(msg.type), 'unexpected adapter type');
          const p = this.pending.get(msg.id);
          assert(p, 'uncorrelated adapter reply');
          this.pending.delete(msg.id);
          clearTimeout(p.timer);
          if (msg.type === 'error') p.reject(new Error(`adapter error: ${canonical(msg.payload)}`));
          else p.resolve(msg.payload);
        }
      } catch (e) {
        this.abort(e);
      }
    });
    this.child.stderr.on('data', (c) => onDiagnostic(c.toString().slice(0, 4096)));
    this.child.once('error', (e) => this.abort(e));
    this.child.once('exit', (code, signal) => {
      if (!this.closing) this.abort(new Error(`adapter exited ${code ?? signal}`));
    });
  }
  abort(e) {
    this.failure ??= e;
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.reject(e);
    }
    this.pending.clear();
    this.child.kill('SIGTERM');
  }
  async handleProvider(msg) {
    const result = await this.onProvider(msg.payload);
    await this.send('provider_result', { requestId: msg.payload.requestId, ...result });
  }
  send(type, payload) {
    if (this.failure) return Promise.reject(this.failure);
    const id = crypto.randomUUID();
    const message = canonical({ version: 1, id, type, payload });
    assert(Buffer.byteLength(message) <= this.maxBytes, 'command too large');
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`adapter ${type} deadline`));
        this.abort(new Error('adapter timeout'));
      }, this.timeout);
      this.pending.set(id, { resolve, reject, timer });
      this.child.stdin.write(`${message}\n`);
    });
  }
  async hello() {
    const result = await this.send('hello', {
      protocol: 'minion-agent-eval-fixture/v1',
      lockHash: this.pin.lockSha256,
      adapterHash: this.pin.adapterSha256,
    });
    return this.adoptHello(result);
  }
  adoptHello(result) {
    assert(
      result.protocol === 'minion-agent-eval-fixture/v1' && result.disposable === true,
      'unqualified adapter',
    );
    assert(
      result.sourceSha === this.pin.commit &&
        result.lockHash === this.pin.lockSha256 &&
        result.adapterHash === this.pin.adapterSha256 &&
        result.sourceHash === this.pin.sourceSha256 &&
        result.buildHash === this.pin.buildSha256,
      'adapter provenance drift',
    );
    this.helloDone = true;
    return result;
  }
  async drain() {
    await Promise.all([...this.providerTasks]);
    if (this.failure) throw this.failure;
  }
  async close() {
    if (this.closed) return;
    this.closed = true;
    this.closing = true;
    try {
      if (!this.failure) await this.send('close', {});
    } finally {
      this.child.stdin.end();
      this.child.kill('SIGTERM');
      for (const p of this.pending.values()) clearTimeout(p.timer);
      this.pending.clear();
    }
  }
}
