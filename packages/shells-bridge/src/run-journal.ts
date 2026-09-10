import type { DatabaseSync as NativeDatabase } from 'node:sqlite';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { closeSync, lstatSync, openSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import {
  normalizeShellOutcomeLimits, normalizeShellRunAdmission, normalizeShellRunOutcome,
  normalizeShellOutcomeReceipt, normalizeShellRunObservation, shellRunOutcomeText, shellOutcomeByteLength,
  type ShellOutcomeLimits, type ShellRunAdmission, type ShellRunOutcome,
  type ShellOutcomeReceipt, type ShellRunObservation,
} from '@minion-stack/shared';

const APPLICATION_ID = 0x4d534a31;
// Native builtin only; createRequire also avoids older Vite builtin tables.
// Unsupported distributions fail at module import; there is no fallback store.
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite') as typeof import('node:sqlite');
const SCHEMA = [
  ['table', 'metadata', 'CREATE TABLE metadata (id INTEGER PRIMARY KEY CHECK (id = 1), policy TEXT NOT NULL) STRICT'],
  ['table', 'runs', 'CREATE TABLE runs (run_id TEXT PRIMARY KEY NOT NULL, invocation_id TEXT NOT NULL, admission TEXT NOT NULL, reserved_bytes INTEGER NOT NULL CHECK (reserved_bytes > 0), uncertainty TEXT, cancellation TEXT, outcome TEXT) STRICT'],
  ['table', 'deliveries', 'CREATE TABLE deliveries (event_id TEXT PRIMARY KEY NOT NULL, run_id TEXT NOT NULL REFERENCES runs(run_id), outcome_digest TEXT NOT NULL, receipt TEXT) STRICT'],
  ['index', 'run_invocation', 'CREATE UNIQUE INDEX run_invocation ON runs(invocation_id)'],
  ['index', 'one_open_run', 'CREATE UNIQUE INDEX one_open_run ON runs((1)) WHERE outcome IS NULL'],
  ['index', 'delivery_run', 'CREATE UNIQUE INDEX delivery_run ON deliveries(run_id)'],
] as const;
const EXPECTED_SCHEMA = [
  ...SCHEMA.map(([type, name, sql]) => ({ type, name, sql })),
  { type: 'index', name: 'sqlite_autoindex_runs_1', sql: null },
  { type: 'index', name: 'sqlite_autoindex_deliveries_1', sql: null },
].sort((a, b) => a.name.localeCompare(b.name));

export class RunJournalError extends Error {
  constructor(readonly code: 'INVALID_STORE' | 'INVALID_PATH' | 'INVALID_POLICY' | 'CONFLICT' | 'BUSY' | 'CAPACITY' | 'NOT_FOUND' | 'CLOSED' | 'DIGEST' | 'TOO_LARGE') {
    super(`SHELL_JOURNAL_${code}`); this.name = 'RunJournalError';
  }
}
function fail(code: RunJournalError['code']): never { throw new RunJournalError(code); }
export interface RunJournalOptions {
  /** Explicit private, trusted path outside the restored harness tree. Never a caller field. */
  path: string;
  shellId: string;
  maxRuns: number;
  maxOutcomeBytes: number;
  limits: ShellOutcomeLimits;
}
export interface JournalRun {
  admission: ShellRunAdmission;
  uncertainty: ShellRunObservation | null;
  cancellation: ShellRunObservation | null;
  outcome: ShellRunOutcome | null;
}
function sqlText(value: unknown): string { if (typeof value !== 'string') return fail('INVALID_STORE'); return value; }
function parse(value: unknown): unknown { try { return JSON.parse(sqlText(value)); } catch { return fail('INVALID_STORE'); } }

/**
 * SQLite is the transaction engine; this adapter has no custom WAL/recovery format.
 * Trusted same-UID directory/process assumption: path inspection cannot prevent
 * arbitrary inode replacement by that principal between native opens.
 * TODO(handoff): Wire private path, process generation and startup uncertainty only after receiver14-12 and sender11-03 acceptance; this adapter is deliberately unused by Bridge. See meta proposals/2026-09-08-platform-qc-remediation.md (Shells lifecycle).
 */
export class RunJournal {
  private closed = false;
  private readonly limits: ShellOutcomeLimits;
  private readonly policy: string;
  private readonly db: NativeDatabase;
  private readonly shellId: string;
  private readonly maxRuns: number;
  private readonly maxOutcomeBytes: number;

  constructor(options: RunJournalOptions) {
    this.limits = normalizeShellOutcomeLimits(options.limits);
    if (!Number.isSafeInteger(options.maxRuns) || options.maxRuns <= 0 || !Number.isSafeInteger(options.maxOutcomeBytes) || options.maxOutcomeBytes <= 0 || options.maxOutcomeBytes > this.limits.recordBytes) fail('INVALID_POLICY');
    this.shellId = normalizeShellRunAdmission({ version: 1, shellId: options.shellId, runId: 'x', sessionId: 'x', invocationId: 'x', inputDigest: '0'.repeat(64), startedAt: 0 }, this.limits).shellId;
    this.maxRuns = options.maxRuns;
    this.maxOutcomeBytes = options.maxOutcomeBytes;
    this.policy = JSON.stringify({ version: 1, shellId: this.shellId, maxRuns: this.maxRuns, maxOutcomeBytes: this.maxOutcomeBytes, limits: this.limits });
    const nonempty = inspectPath(options.path);
    if (nonempty) {
      const reader = new DatabaseSync(options.path, { readOnly: true });
      try { this.validateStore(reader); } finally { reader.close(); }
    }
    this.db = new DatabaseSync(options.path);
    try {
      this.db.exec('PRAGMA busy_timeout = 100; PRAGMA foreign_keys = ON; PRAGMA trusted_schema = OFF');
      this.db.exec('BEGIN IMMEDIATE');
      try {
        if (nonempty || this.db.prepare('SELECT name FROM sqlite_schema LIMIT 1').get()) this.validateStore(this.db);
        else {
          if (this.pragma(this.db, 'application_id') !== 0 || this.pragma(this.db, 'user_version') !== 0) fail('INVALID_STORE');
          for (const [, , sql] of SCHEMA) this.db.exec(sql);
          this.db.prepare('INSERT INTO metadata(id, policy) VALUES(1, ?)').run(this.policy);
          this.db.exec(`PRAGMA application_id = ${APPLICATION_ID}; PRAGMA user_version = 1`);
        }
        this.db.exec('COMMIT');
      } catch (error) { this.rollback(); throw error; }
      this.db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL');
      if (this.pragma(this.db, 'journal_mode') !== 'wal' || this.pragma(this.db, 'synchronous') !== 2 || this.pragma(this.db, 'foreign_keys') !== 1) fail('INVALID_STORE');
      this.validateStore(this.db);
    } catch (error) { this.db.close(); this.closed = true; throw error; }
  }

  private pragma(db: NativeDatabase, name: 'application_id' | 'user_version' | 'journal_mode' | 'synchronous' | 'foreign_keys'): unknown {
    return db.prepare(`PRAGMA ${name}`).get()?.[name];
  }
  private validateStore(db: NativeDatabase): void {
    if (this.pragma(db, 'application_id') !== APPLICATION_ID || this.pragma(db, 'user_version') !== 1) fail('INVALID_STORE');
    // Compare all SQL definitions, including constraints and unexpected executable objects.
    const objects = db.prepare('SELECT type, name, sql FROM sqlite_schema ORDER BY name').all();
    const actual = objects.map((row) => ({ type: row.type, name: row.name, sql: row.sql })).sort((a, b) => String(a.name).localeCompare(String(b.name)));
    if (JSON.stringify(actual) !== JSON.stringify(EXPECTED_SCHEMA)) fail('INVALID_STORE');
    const metadata = db.prepare('SELECT id, policy FROM metadata').all();
    if (metadata.length !== 1 || metadata[0]?.id !== 1 || metadata[0]?.policy !== this.policy) fail('INVALID_STORE');
  }
  private rollback(): void { try { this.db.exec('ROLLBACK'); } catch { /* Preserve the original statement/COMMIT error. */ } }
  private transaction<T>(action: () => T): T {
    if (this.closed) fail('CLOSED');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.validateStore(this.db);
      const result = action();
      this.db.exec('COMMIT');
      return result;
    } catch (error) { this.rollback(); throw error; }
  }
  private readRun(runId: string): JournalRun | null {
    const row = this.db.prepare('SELECT admission, uncertainty, cancellation, outcome FROM runs WHERE run_id = ?').get(runId);
    if (!row) return null;
    return {
      admission: normalizeShellRunAdmission(parse(row.admission), this.limits),
      uncertainty: row.uncertainty === null ? null : normalizeShellRunObservation(parse(row.uncertainty), this.limits),
      cancellation: row.cancellation === null ? null : normalizeShellRunObservation(parse(row.cancellation), this.limits),
      outcome: row.outcome === null ? null : normalizeShellRunOutcome(parse(row.outcome), this.limits),
    };
  }
  inspect(runId: string): JournalRun | null { return this.transaction(() => this.readRun(runId)); }

  admit(value: unknown): JournalRun {
    const admission = normalizeShellRunAdmission(value, this.limits);
    if (admission.shellId !== this.shellId) fail('CONFLICT');
    return this.transaction(() => {
      const existing = this.db.prepare('SELECT run_id FROM runs WHERE run_id = ? OR invocation_id = ?').all(admission.runId, admission.invocationId);
      if (existing.length) {
        const stored = this.readRun(sqlText(existing[0]?.run_id));
        if (existing.length !== 1 || !stored || JSON.stringify(stored.admission) !== JSON.stringify(admission)) fail('CONFLICT');
        return stored;
      }
      if (Number(this.db.prepare('SELECT count(*) AS count FROM runs').get()?.count) >= this.maxRuns) fail('CAPACITY');
      if (this.db.prepare('SELECT run_id FROM runs WHERE outcome IS NULL LIMIT 1').get()) fail('BUSY');
      this.db.prepare('INSERT INTO runs(run_id, invocation_id, admission, reserved_bytes) VALUES(?, ?, ?, ?)').run(admission.runId, admission.invocationId, JSON.stringify(admission), this.maxOutcomeBytes);
      return { admission, uncertainty: null, cancellation: null, outcome: null };
    });
  }

  observe(runId: string, value: unknown): JournalRun {
    const observation = normalizeShellRunObservation(value, this.limits);
    return this.transaction(() => {
      const run = this.readRun(runId);
      if (!run) fail('NOT_FOUND');
      if (run.outcome) return run;
      const column = observation.kind === 'unresolved' ? 'uncertainty' : 'cancellation';
      const previous = run[column];
      // ACK is an observed fact, not termination. Clock ordering must neither
      // suppress that fact nor let a later request/unconfirmed result erase it.
      if (previous?.kind === 'cancel_acknowledged' && observation.kind !== 'cancel_acknowledged') return run;
      const firstAcknowledgment = observation.kind === 'cancel_acknowledged' && previous?.kind !== 'cancel_acknowledged';
      if (previous && previous.at > observation.at && !firstAcknowledgment) return run;
      if (previous && JSON.stringify(previous) === JSON.stringify(observation)) return run;
      // Equal timestamps are not identities: the serialized later update wins.
      this.db.prepare(`UPDATE runs SET ${column} = ? WHERE run_id = ?`).run(JSON.stringify(observation), runId);
      return { ...run, [column]: observation };
    });
  }

  commitOutcome(value: unknown): ShellRunOutcome {
    const outcome = normalizeShellRunOutcome(value, this.limits);
    if (outcome.shellId !== this.shellId) fail('CONFLICT');
    if (createHash('sha256').update(shellRunOutcomeText(outcome, this.limits), 'utf8').digest('hex') !== outcome.outcomeDigest) fail('DIGEST');
    return this.transaction(() => {
      const run = this.readRun(outcome.runId);
      if (!run) fail('NOT_FOUND');
      if (run.admission.invocationId !== outcome.invocationId || run.admission.sessionId !== outcome.sessionId || run.admission.inputDigest !== outcome.inputDigest) fail('CONFLICT');
      if (run.outcome) {
        if (JSON.stringify(run.outcome) !== JSON.stringify(outcome)) fail('CONFLICT');
        return run.outcome;
      }
      const bytes = this.db.prepare('SELECT reserved_bytes FROM runs WHERE run_id = ?').get(outcome.runId)?.reserved_bytes;
      if (typeof bytes !== 'number' || shellOutcomeByteLength(JSON.stringify(outcome)) > bytes) fail('TOO_LARGE');
      this.db.prepare('UPDATE runs SET outcome = ? WHERE run_id = ?').run(JSON.stringify(outcome), outcome.runId);
      // A duplicate event constraint failure here must roll back the earlier slot release.
      this.db.prepare('INSERT INTO deliveries(event_id, run_id, outcome_digest) VALUES(?, ?, ?)').run(outcome.eventId, outcome.runId, outcome.outcomeDigest);
      return outcome;
    });
  }

  pending(): ShellRunOutcome[] {
    return this.transaction(() => this.db.prepare('SELECT runs.outcome FROM deliveries JOIN runs USING(run_id) WHERE receipt IS NULL ORDER BY event_id').all().map((row) => normalizeShellRunOutcome(parse(row.outcome), this.limits)));
  }

  // TODO(handoff): Only receiver14-12 authenticated COMMIT receipts delivered on the current sender11-03 socket may call this API; local identity matching proves no remote authority. See meta proposals/2026-09-08-platform-qc-remediation.md (Shells lifecycle).
  acknowledge(value: unknown): ShellOutcomeReceipt {
    const receipt = normalizeShellOutcomeReceipt(value, this.limits);
    if (receipt.shellId !== this.shellId) fail('CONFLICT');
    return this.transaction(() => {
      const row = this.db.prepare('SELECT run_id, outcome_digest, receipt FROM deliveries WHERE event_id = ?').get(receipt.eventId);
      if (!row || row.run_id !== receipt.runId || row.outcome_digest !== receipt.outcomeDigest) fail('CONFLICT');
      if (row.receipt !== null) {
        const stored = normalizeShellOutcomeReceipt(parse(row.receipt), this.limits);
        if (JSON.stringify(stored) !== JSON.stringify(receipt)) fail('CONFLICT');
        return stored;
      }
      this.db.prepare('UPDATE deliveries SET receipt = ? WHERE event_id = ?').run(JSON.stringify(receipt), receipt.eventId);
      return receipt;
    });
  }
  close(): void { if (!this.closed) { this.db.close(); this.closed = true; } }
}

function inspectPath(path: string): boolean {
  if (typeof path !== 'string' || !isAbsolute(path) || path.includes('\0') || resolve(path) !== path) fail('INVALID_PATH');
  const parent = dirname(path);
  for (let cursor = parent; ; cursor = dirname(cursor)) {
    const stat = lstatSync(cursor);
    if (stat.isSymbolicLink() || !stat.isDirectory()) fail('INVALID_PATH');
    if (cursor === parent && ((stat.mode & 0o077) !== 0 || (process.getuid && stat.uid !== process.getuid()))) fail('INVALID_PATH');
    if (dirname(cursor) === cursor) break;
  }
  let nonempty = false;
  let missingMain = false;
  let hasSidecar = false;
  for (const candidate of [path, `${path}-wal`, `${path}-shm`]) {
    try {
      const stat = lstatSync(candidate);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || (stat.mode & 0o077) !== 0 || (process.getuid && stat.uid !== process.getuid())) fail('INVALID_PATH');
      if (candidate === path) nonempty = stat.size > 0;
      else hasSidecar = true;
    } catch (error) {
      if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')) throw error;
      if (candidate === path) missingMain = true;
    }
  }
  if (!nonempty && hasSidecar) fail('INVALID_PATH');
  if (missingMain) closeSync(openSync(path, 'wx', 0o600));
  return nonempty;
}
