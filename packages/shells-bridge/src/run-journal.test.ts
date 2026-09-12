import { afterEach, describe, expect, it } from 'vitest';
import type { DatabaseSync as NativeDatabase } from 'node:sqlite';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { shellRunOutcomeText, type ShellRunOutcome } from '@minion-stack/shared';
import { RunJournal, type RunJournalOptions } from './run-journal.js';

const limits = { identifierBytes: 128, textBytes: 256, recordBytes: 2048 };
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite') as typeof import('node:sqlite');
const admission = { version: 1, shellId: 'shell', runId: 'run', sessionId: 'session', invocationId: 'invoke', inputDigest: 'a'.repeat(64), startedAt: 1 };
function terminal(overrides: Partial<ShellRunOutcome> = {}): ShellRunOutcome {
  const value: ShellRunOutcome = { version: 1, shellId: 'shell', runId: 'run', sessionId: 'session', invocationId: 'invoke', inputDigest: 'a'.repeat(64), eventId: 'event', state: 'final', durationMs: 2, outcomeDigest: '0'.repeat(64), ...overrides };
  value.outcomeDigest = createHash('sha256').update(shellRunOutcomeText(value, limits)).digest('hex');
  return value;
}
function receipt(value = terminal()) { return { version: 1, shellId: value.shellId, runId: value.runId, eventId: value.eventId, outcomeDigest: value.outcomeDigest, receiptId: 'receipt', committedAt: 3 }; }
const directories: string[] = [];
const journals: RunJournal[] = [];
const handles: NativeDatabase[] = [];
function fixture(patch: Partial<RunJournalOptions> = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'shell-journal-test-')); directories.push(dir);
  const options: RunJournalOptions = { path: join(dir, 'journal.sqlite'), shellId: 'shell', maxRuns: 3, maxOutcomeBytes: 1024, limits, ...patch };
  return { dir, options, open: () => { const journal = new RunJournal(options); journals.push(journal); return journal; } };
}
function connection(path: string) { const db = new DatabaseSync(path); handles.push(db); return db; }
afterEach(() => { for (const journal of journals.splice(0)) journal.close(); for (const db of handles.splice(0)) db.close(); for (const dir of directories.splice(0)) rmSync(dir, { recursive: true, force: true }); });

describe('native run journal', () => {
  it('grants fresh dispatch only to the committed inserter across two native handles', () => {
    const f = fixture(); const first = f.open(); const second = f.open();
    const winner = first.admitForDispatch(admission);
    expect(winner).toEqual({ fresh: true, run: { admission, uncertainty: null, cancellation: null, outcome: null } });
    expect(second.admitForDispatch(admission)).toEqual({ fresh: false, run: winner.run });
    expect(first.admitForDispatch(admission).fresh).toBe(false);
    expect(second.admit(admission)).toEqual(winner.run);
    first.close(); second.close();
    expect(f.open().admitForDispatch(admission).fresh).toBe(false);
  });
  it('does not turn a compatibility admission into later dispatch permission', () => {
    const journal = fixture().open();
    expect(journal.admit(admission).admission).toEqual(admission);
    expect(journal.admitForDispatch(admission).fresh).toBe(false);
    expect(() => journal.admitForDispatch({ ...admission, inputDigest: 'b'.repeat(64) })).toThrow('CONFLICT');
    expect(() => journal.admitForDispatch({ ...admission, runId: 'other', invocationId: 'other' })).toThrow('BUSY');
  });
  it('cannot return fresh permission while another native transaction owns the lock', () => {
    const f = fixture(); const journal = f.open(); const lock = connection(f.options.path);
    lock.exec('BEGIN IMMEDIATE');
    expect(() => journal.admitForDispatch(admission)).toThrow(/locked/);
    lock.exec('ROLLBACK');
    expect(journal.inspect('run')).toBeNull();
    expect(journal.admitForDispatch(admission).fresh).toBe(true);
  });
  it('accepts a valid one-byte identifier policy without hidden sample identifiers', () => {
    const journal = fixture({ shellId: 's', limits: { ...limits, identifierBytes: 1 } }).open();
    expect(journal.admit({ ...admission, shellId: 's', runId: 'r', sessionId: 's', invocationId: 'i' }).admission.shellId).toBe('s');
  });
  it('commits/reopens an immutable outcome and exact ACK with tombstone replay', () => {
    const f = fixture({ maxRuns: 1 }); let journal = f.open();
    expect(journal.admit(admission).admission).toEqual(admission);
    expect(journal.commitOutcome(terminal())).toEqual(terminal());
    journal.close(); journal = f.open();
    expect(journal.pending()).toEqual([terminal()]);
    expect(journal.acknowledge(receipt())).toEqual(receipt());
    journal.close(); journal = f.open();
    expect(journal.pending()).toEqual([]);
    expect(journal.admit(admission).outcome).toEqual(terminal());
    expect(journal.commitOutcome(terminal())).toEqual(terminal());
    expect(journal.acknowledge(receipt())).toEqual(receipt());
    expect(() => journal.admit({ ...admission, runId: 'other', invocationId: 'other' })).toThrow('CAPACITY');
  });
  it('denies cross-shell and conflicting run/invocation/session/input replay', () => {
    const journal = fixture().open(); journal.admit(admission);
    for (const patch of [{ shellId: 'foreign' }, { runId: 'other' }, { invocationId: 'other' }, { sessionId: 'other' }, { inputDigest: 'b'.repeat(64) }, { startedAt: 2 }]) {
      expect(() => journal.admit({ ...admission, ...patch })).toThrow('CONFLICT');
    }
    expect(() => journal.admit({ ...admission, runId: 'other', invocationId: 'other' })).toThrow('BUSY');
  });
  it('keeps a finite observation shape through repeated uncertainty and cancellation', () => {
    const f = fixture(); const journal = f.open(); journal.admit(admission);
    for (let i = 1; i <= 100; i++) {
      journal.observe('run', { version: 1, kind: 'unresolved', at: i, reason: 'timeout' });
      journal.observe('run', { version: 1, kind: 'cancel_acknowledged', at: i });
    }
    expect(journal.inspect('run')?.uncertainty?.at).toBe(100);
    expect(journal.inspect('run')?.cancellation?.kind).toBe('cancel_acknowledged');
    expect(() => journal.admit({ ...admission, runId: 'other', invocationId: 'other' })).toThrow('BUSY');
    const db = connection(f.options.path);
    expect(db.prepare('SELECT count(*) AS n FROM runs').get()?.n).toBe(1);
    expect(Number(db.prepare('SELECT length(uncertainty) + length(cancellation) AS n FROM runs').get()?.n)).toBeLessThan(256);
    journal.commitOutcome(terminal());
    journal.observe('run', { version: 1, kind: 'cancel_unconfirmed', at: 101 });
    expect(journal.inspect('run')?.outcome).toEqual(terminal());
    expect(journal.inspect('run')?.cancellation?.kind).toBe('cancel_acknowledged');
  });
  it('suppresses older metadata and accepts serialized replacement at the same timestamp', () => {
    const journal = fixture().open(); journal.admit(admission);
    journal.observe('run', { version: 1, kind: 'unresolved', at: 5, reason: 'timeout' });
    journal.observe('run', { version: 1, kind: 'unresolved', at: 4, reason: 'older' });
    expect(journal.inspect('run')?.uncertainty?.reason).toBe('timeout');
    journal.observe('run', { version: 1, kind: 'unresolved', at: 5, reason: 'latest' });
    expect(journal.inspect('run')?.uncertainty?.reason).toBe('latest');
  });
  it.each([5, 4])('records an ACK at time %i after a request at5 without releasing the slot', (at) => {
    const journal = fixture().open(); journal.admit(admission);
    journal.observe('run', { version: 1, kind: 'cancel_requested', at: 5 });
    journal.observe('run', { version: 1, kind: 'cancel_acknowledged', at });
    expect(journal.inspect('run')?.cancellation?.kind).toBe('cancel_acknowledged');
    expect(() => journal.admit({ ...admission, runId: 'other', invocationId: 'other' })).toThrow('BUSY');
    journal.commitOutcome(terminal());
    journal.observe('run', { version: 1, kind: 'cancel_requested', at: 99 });
    expect(journal.inspect('run')?.outcome).toEqual(terminal());
    expect(journal.inspect('run')?.cancellation?.kind).toBe('cancel_acknowledged');
  });
  it.each(['cancel_requested', 'cancel_unconfirmed'])('does not let later %s erase an observed ACK', (kind) => {
    const journal = fixture().open(); journal.admit(admission);
    journal.observe('run', { version: 1, kind: 'cancel_acknowledged', at: 5, reason: 'first' });
    journal.observe('run', { version: 1, kind, at: 6 });
    expect(journal.inspect('run')?.cancellation?.kind).toBe('cancel_acknowledged');
    journal.observe('run', { version: 1, kind: 'cancel_acknowledged', at: 5, reason: 'latest' });
    expect(journal.inspect('run')?.cancellation?.reason).toBe('latest');
    journal.observe('run', { version: 1, kind: 'cancel_acknowledged', at: 4, reason: 'older' });
    expect(journal.inspect('run')?.cancellation?.reason).toBe('latest');
  });
  it('recomputes the digest and rejects changed terminal identity/content', () => {
    const journal = fixture().open(); journal.admit(admission);
    expect(() => journal.commitOutcome({ ...terminal(), durationMs: 99 })).toThrow('DIGEST');
    for (const patch of [{ sessionId: 'other' }, { invocationId: 'other' }, { inputDigest: 'b'.repeat(64) }]) expect(() => journal.commitOutcome(terminal(patch))).toThrow('CONFLICT');
    journal.commitOutcome(terminal());
    expect(() => journal.commitOutcome(terminal({ state: 'error' }))).toThrow('CONFLICT');
    expect(journal.pending()).toEqual([terminal()]);
  });
  it('rejects mismatched or conflicting ACK without losing the pending outcome', () => {
    const journal = fixture().open(); journal.admit(admission); journal.commitOutcome(terminal());
    for (const patch of [{ shellId: 'other' }, { eventId: 'other' }, { runId: 'other' }, { outcomeDigest: 'b'.repeat(64) }]) expect(() => journal.acknowledge({ ...receipt(), ...patch })).toThrow('CONFLICT');
    expect(journal.pending()).toHaveLength(1);
    journal.acknowledge(receipt());
    expect(() => journal.acknowledge({ ...receipt(), receiptId: 'other' })).toThrow('CONFLICT');
  });
  it('rolls back the earlier terminal write when the outbox event constraint fails', () => {
    // TODO(handoff): This proves statement-failure rollback, not failed-COMMIT or process/power-loss recovery; those require separately admitted deterministic qualification. See meta proposals/2026-09-08-platform-qc-remediation.md (Shells lifecycle).
    const f = fixture(); const journal = f.open(); const observer = f.open();
    journal.admit(admission); journal.commitOutcome(terminal());
    journal.admit({ ...admission, runId: 'second', invocationId: 'second' });
    expect(() => journal.commitOutcome(terminal({ runId: 'second', invocationId: 'second' }))).toThrow('UNIQUE constraint failed: deliveries.event_id');
    expect(observer.inspect('second')?.outcome).toBeNull();
    expect(observer.pending()).toEqual([terminal()]);
    expect(() => observer.admit({ ...admission, runId: 'third', invocationId: 'third' })).toThrow('BUSY');
    const second = terminal({ runId: 'second', invocationId: 'second', eventId: 'second' });
    expect(journal.commitOutcome(second)).toEqual(second);
    expect(observer.pending()).toHaveLength(2);
  });
  it('serializes two handles and refuses admission while another transaction owns the write lock', () => {
    const f = fixture(); const first = f.open(); const second = f.open();
    const raw = connection(f.options.path); raw.exec('BEGIN IMMEDIATE');
    expect(() => second.admit(admission)).toThrow(/locked/);
    raw.exec('ROLLBACK');
    expect(first.admit(admission).admission).toEqual(second.admit(admission).admission);
    expect(() => second.admit({ ...admission, runId: 'second', invocationId: 'second' })).toThrow('BUSY');
  });
  it('selects effective WAL/FULL and rejects changed persisted policy', () => {
    const f = fixture(); f.open(); const db = connection(f.options.path);
    expect(db.prepare('PRAGMA journal_mode').get()?.journal_mode).toBe('wal');
    // synchronous is connection-local; the adapter verifies its own setting before use.
    for (const patch of [{ maxRuns: 4 }, { maxOutcomeBytes: 1000 }, { shellId: 'other' }, { limits: { ...limits, textBytes: 300 } }]) expect(() => new RunJournal({ ...f.options, ...patch })).toThrow('INVALID_STORE');
  });
  it('reserves a terminal size bound and leaves oversized work unresolved', () => {
    const bytes = Buffer.byteLength(JSON.stringify(terminal()));
    const f = fixture({ maxRuns: 1, maxOutcomeBytes: bytes }); const journal = f.open(); journal.admit(admission);
    expect(() => journal.commitOutcome(terminal({ errorMessage: 'x' }))).toThrow('TOO_LARGE');
    expect(journal.inspect('run')?.outcome).toBeNull();
    expect(journal.commitOutcome(terminal())).toEqual(terminal());
  });
  it.each(['trigger', 'view', 'index', 'constraint', 'table_constraint', 'header', 'version'])('refuses %s changes without modifying existing bytes', (kind) => {
    const f = fixture(); f.open().close(); const db = new DatabaseSync(f.options.path);
    if (kind === 'trigger') db.exec('CREATE TRIGGER unexpected AFTER INSERT ON runs BEGIN DELETE FROM runs; END');
    if (kind === 'view') db.exec('CREATE VIEW unexpected AS SELECT * FROM runs');
    if (kind === 'index') db.exec('CREATE INDEX unexpected ON runs(reserved_bytes)');
    if (kind === 'constraint') { db.exec('DROP INDEX one_open_run'); db.exec('CREATE INDEX one_open_run ON runs((1)) WHERE outcome IS NULL'); }
    if (kind === 'table_constraint') db.exec('ALTER TABLE metadata RENAME TO old_metadata; CREATE TABLE metadata (id INTEGER PRIMARY KEY, policy TEXT NOT NULL) STRICT; INSERT INTO metadata SELECT * FROM old_metadata; DROP TABLE old_metadata');
    if (kind === 'header') db.exec('PRAGMA application_id = 1');
    if (kind === 'version') db.exec('PRAGMA user_version = 2');
    db.close(); const before = readFileSync(f.options.path);
    expect(() => f.open()).toThrow('INVALID_STORE');
    expect(readFileSync(f.options.path)).toEqual(before);
  });
  it('revalidates schema on the already-open handle before any trigger could run', () => {
    const f = fixture(); const journal = f.open(); const db = connection(f.options.path);
    db.exec('CREATE TRIGGER unexpected AFTER INSERT ON runs BEGIN DELETE FROM runs; END');
    expect(() => journal.admit(admission)).toThrow('INVALID_STORE');
    expect(db.prepare('SELECT count(*) AS n FROM runs').get()?.n).toBe(0);
  });
  it('rejects a foreign database and corrupt bytes without relabeling', () => {
    const f = fixture(); const db = new DatabaseSync(f.options.path); db.exec('CREATE TABLE foreign_data (value TEXT)'); db.close(); chmodSync(f.options.path, 0o600);
    const before = readFileSync(f.options.path); expect(() => f.open()).toThrow(); expect(readFileSync(f.options.path)).toEqual(before);
    writeFileSync(f.options.path, 'corrupt', { mode: 0o600 }); expect(() => f.open()).toThrow(); expect(readFileSync(f.options.path, 'utf8')).toBe('corrupt');
  });
  it('rejects linked files, sidecars and parents without creating a main file', () => {
    const f = fixture(); const target = join(f.dir, 'target'); writeFileSync(target, 'untouched', { mode: 0o600 });
    symlinkSync(target, `${f.options.path}-wal`);
    expect(() => f.open()).toThrow('INVALID_PATH');
    expect(existsSync(f.options.path)).toBe(false);
    expect(readFileSync(target, 'utf8')).toBe('untouched');
  });
  it('rejects permissive parents and post-close operations', () => {
    const f = fixture(); chmodSync(f.dir, 0o755); expect(() => f.open()).toThrow('INVALID_PATH'); chmodSync(f.dir, 0o700);
    const journal = f.open(); journal.close(); journal.close();
    expect(() => journal.inspect('run')).toThrow('CLOSED');
    expect(() => journal.admit(admission)).toThrow('CLOSED');
    expect(() => journal.pending()).toThrow('CLOSED');
  });
  it.each(['-wal', '-shm'])('rejects orphan regular %s before creating a new database', (suffix) => {
    const f = fixture(); writeFileSync(`${f.options.path}${suffix}`, 'orphan', { mode: 0o600 });
    expect(() => f.open()).toThrow('INVALID_PATH');
    expect(existsSync(f.options.path)).toBe(false);
    expect(readFileSync(`${f.options.path}${suffix}`, 'utf8')).toBe('orphan');
  });
  it.each(['database', 'parent', 'shm'])('rejects a linked %s path', (kind) => {
    const f = fixture(); const target = join(f.dir, 'target'); writeFileSync(target, '', { mode: 0o600 });
    if (kind === 'database') symlinkSync(target, f.options.path);
    if (kind === 'shm') symlinkSync(target, `${f.options.path}-shm`);
    if (kind === 'parent') { const link = join(f.dir, 'linked'); symlinkSync(f.dir, link); f.options.path = join(link, 'journal.sqlite'); }
    expect(() => f.open()).toThrow('INVALID_PATH');
    expect(readFileSync(target, 'utf8')).toBe('');
  });
  it('cannot acknowledge an admission that has no committed terminal', () => {
    const journal = fixture().open(); journal.admit(admission);
    expect(() => journal.acknowledge(receipt())).toThrow('CONFLICT');
    expect(journal.pending()).toEqual([]);
    expect(journal.inspect('run')?.outcome).toBeNull();
  });
});

// TODO(handoff): Qualify an actually unsupported distribution and the workstation image before fleet-runtime acceptance. See meta proposals/2026-09-08-platform-qc-remediation.md (Shells lifecycle).

describe('emitted private module', () => {
  it('uses the actual emitted shared contract in a no-flag raw Node process', () => {
    const path = join(process.cwd(), 'dist/run-journal.js');
    expect(existsSync(path), 'build the isolated candidate before this test').toBe(true);
    const output = execFileSync(process.execPath, [join(process.cwd(), 'scripts/journal-smoke.mjs'), path], { env: { LANG: 'C.UTF-8', TMPDIR: tmpdir() }, encoding: 'utf8', timeout: 10000 });
    expect(JSON.parse(output)).toMatchObject({ runtime: process.version, execArgv: [], reopened: true, acknowledged: true });
  });
});
