import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  assert,
  object,
  uuid,
  string,
  integer,
  digest,
  canonical,
  safePath,
  writePrivate,
  syncDir,
  jsonl,
} from './common.mjs';
export const identity = (s) => ({ dev: s.dev, ino: s.ino });
const equalIdentity = (actual, expected) =>
  actual.dev === expected.dev && actual.ino === expected.ino;
export function initializeRegistry({ root, registryId, scopeId, ownerRef, purpose }) {
  for (
    let ancestor = path.dirname(root);
    ancestor !== path.dirname(ancestor);
    ancestor = path.dirname(ancestor)
  )
    assert(
      !['result.json', 'active-writer.json', 'events.jsonl'].some((f) =>
        fs.existsSync(path.join(ancestor, f)),
      ),
      'registry cannot initialize inside generated run outputs',
    );
  safePath(root, { existing: false, directory: true });
  assert(!fs.existsSync(root), 'registry already exists');
  assert(!root.split(path.sep).includes('runs'), 'registry must be outside generated runs');
  uuid(registryId);
  uuid(scopeId);
  string(ownerRef);
  string(purpose);
  safePath(path.dirname(root), { directory: true });
  fs.mkdirSync(root, { mode: 0o700 });
  const metadata = {
    version: 1,
    accountingRegistryId: registryId,
    scopes: [{ accountingScopeId: scopeId, ownerRef, purpose }],
    nonce: crypto.randomUUID(),
  };
  const genesis = {
    version: 1,
    sequence: 0,
    kind: 'genesis',
    previous: null,
    metadataSha256: digest(metadata),
  };
  const metadataPath = path.join(root, 'registry.json'),
    journalPath = path.join(root, 'budget.jsonl');
  writePrivate(metadataPath, metadata);
  writePrivate(journalPath, `${canonical(genesis)}\n`);
  syncDir(root);
  syncDir(path.dirname(root));
  return {
    version: 1,
    accountingRegistryId: registryId,
    root,
    metadataPath,
    journalPath,
    genesisSha256: digest(genesis),
    identities: {
      root: identity(fs.statSync(root)),
      metadata: identity(fs.statSync(metadataPath)),
      journal: identity(fs.statSync(journalPath)),
    },
    scopes: metadata.scopes,
  };
}
export function openBudget(config, { journalAssertion } = {}) {
  if (journalAssertion !== undefined)
    assert(
      journalAssertion === config.journalPath,
      'budget journal is only a canonical path assertion',
    );
  const opened = [];
  let lockFd,
    lockOwned = false;
  function validatePaths() {
    for (const [kind, p] of [
      ['root', config.root],
      ['metadata', config.metadataPath],
      ['journal', config.journalPath],
    ]) {
      safePath(p, { directory: kind === 'root' });
      const s = fs.statSync(p);
      assert(
        equalIdentity(identity(s), config.identities[kind]),
        `registry ${kind} identity replaced`,
      );
      assert((s.mode & 0o077) === 0, 'registry permissions must be private');
    }
    for (const { fd, kind } of opened)
      assert(
        equalIdentity(identity(fs.fstatSync(fd)), config.identities[kind]),
        'opened registry identity mismatch',
      );
  }
  function release() {
    for (const { fd } of opened.splice(0)) fs.closeSync(fd);
    if (lockFd !== undefined) {
      fs.closeSync(lockFd);
      lockFd = undefined;
    }
    if (lockOwned) {
      fs.unlinkSync(path.join(config.root, 'writer.lock'));
      syncDir(config.root);
      lockOwned = false;
    }
  }
  try {
    validatePaths();
    for (const [kind, p, flags] of [
      ['metadata', config.metadataPath, fs.constants.O_RDONLY],
      ['journal', config.journalPath, fs.constants.O_RDWR | fs.constants.O_APPEND],
    ])
      opened.push({ kind, fd: fs.openSync(p, flags | fs.constants.O_NOFOLLOW) });
    validatePaths();
    const meta = JSON.parse(fs.readFileSync(opened.find((x) => x.kind === 'metadata').fd, 'utf8'));
    assert(
      meta.version === 1 && meta.accountingRegistryId === config.accountingRegistryId,
      'registry id mismatch',
    );
    assert(
      canonical(meta.scopes) === canonical(config.scopes),
      'registry scope authority mismatch',
    );
    const lockPath = path.join(config.root, 'writer.lock');
    lockFd = fs.openSync(lockPath, 'wx', 0o600);
    lockOwned = true;
    fs.writeSync(lockFd, canonical({ pid: process.pid, at: new Date().toISOString() }));
    fs.fsyncSync(lockFd);
    syncDir(config.root);
    validatePaths();
    let entries = jsonl(config.journalPath);
    assert(
      entries.length &&
        digest(entries[0]) === config.genesisSha256 &&
        entries[0].metadataSha256 === digest(meta),
      'registry genesis mismatch',
    );
    for (let i = 1; i < entries.length; i++) {
      const e = entries[i];
      assert(
        e.sequence === i && e.previous === digest(entries[i - 1]) && e.version === 1,
        'journal corruption',
      );
      assert(
        [
          'alias',
          'reserved',
          'dispatched',
          'received',
          'settled',
          'unknown',
          'retired',
          'not_dispatched',
        ].includes(e.kind),
        'unknown journal record',
      );
    }
    const journalFd = opened.find((x) => x.kind === 'journal').fd;
    function push(data) {
      validatePaths();
      const entry = {
        version: 1,
        sequence: entries.length,
        previous: digest(entries.at(-1)),
        at: new Date().toISOString(),
        ...data,
      };
      fs.writeSync(journalFd, `${canonical(entry)}\n`);
      fs.fsyncSync(journalFd);
      entries.push(entry);
      return entry;
    }
    function attempts(scope) {
      const map = new Map();
      for (const e of entries.filter((x) => x.scope === scope && x.attemptId)) {
        if (e.kind === 'reserved') {
          assert(!map.has(e.attemptId), 'duplicate reservation');
          map.set(e.attemptId, { reservation: e, state: e.kind, received: null, settled: null });
        } else {
          const a = map.get(e.attemptId);
          assert(a, 'orphan attempt');
          if (e.kind === 'dispatched')
            assert(a.state === 'reserved', 'invalid dispatch transition');
          if (e.kind === 'received') {
            assert(a.state === 'dispatched', 'invalid receive transition');
            a.received = e;
          }
          if (e.kind === 'settled') {
            assert(a.state === 'received' && !a.settled, 'duplicate settlement');
            assert(
              e.costMicroUsd === a.received.costMicroUsd &&
                Number.isSafeInteger(e.costMicroUsd) &&
                e.costMicroUsd >= 0,
              'invalid settled bill',
            );
            a.settled = e;
          }
          if (e.kind === 'not_dispatched') {
            assert(
              ['reserved', 'dispatched'].includes(a.state) &&
                e.proof === 'live_adapter_transport_not_entered_v1',
              'invalid not-dispatched proof',
            );
            a.notDispatched = e;
          }
          if (e.kind === 'unknown')
            assert(
              ['reserved', 'dispatched', 'received'].includes(a.state),
              'invalid unknown transition',
            );
          a.state = e.kind;
        }
      }
      return map;
    }
    // A persisted known response can settle locally. Missing response is fenced forever.
    for (const scope of config.scopes)
      for (const [id, a] of attempts(scope.accountingScopeId))
        if (
          a.state === 'received' &&
          a.received.costStatus === 'known' &&
          a.received.billingComplete === true
        )
          push({
            kind: 'settled',
            scope: scope.accountingScopeId,
            attemptId: id,
            costMicroUsd: a.received.costMicroUsd,
            recovered: true,
          });
    function status(scope) {
      const map = attempts(scope);
      return {
        attempts: map,
        retired: entries.some((e) => e.scope === scope && e.kind === 'retired'),
        unknown: [...map.values()].some((a) => !['settled', 'not_dispatched'].includes(a.state)),
        overshoot: [...map.values()].some(
          (a) => a.settled && a.settled.costMicroUsd > a.reservation.upperMicroUsd,
        ),
      };
    }
    return {
      get entries() {
        return [...entries];
      },
      validate: validatePaths,
      close: release,
      reserve({
        scope,
        alias,
        attemptId,
        runId,
        upperMicroUsd,
        bounds,
        day = new Date().toISOString().slice(0, 10),
        binding,
      }) {
        uuid(attemptId);
        uuid(runId);
        integer(upperMicroUsd, 1);
        assert(
          config.scopes.some((s) => s.accountingScopeId === scope),
          'unknown scope',
        );
        string(alias);
        const s = status(scope);
        assert(!s.retired, 'scope permanently retired');
        assert(!s.unknown, 'unknown exposure fence');
        assert(!s.overshoot, 'billing overshoot fence');
        assert(!s.attempts.has(attemptId), 'attempt already admitted');
        const rows = [...s.attempts.values()];
        const cost = (a) =>
          a.notDispatched ? 0 : a.settled ? a.settled.costMicroUsd : a.reservation.upperMicroUsd;
        const runTotal = rows
            .filter((a) => a.reservation.runId === runId)
            .reduce((v, a) => v + cost(a), 0),
          dayTotal = rows.filter((a) => a.reservation.day === day).reduce((v, a) => v + cost(a), 0);
        assert(
          upperMicroUsd <= bounds.perCallMicroUsd &&
            runTotal + upperMicroUsd <= bounds.runMicroUsd &&
            dayTotal + upperMicroUsd <= bounds.dayMicroUsd,
          'budget exhausted',
        );
        const prior = entries.find((e) => e.kind === 'alias' && e.alias === alias);
        if (prior) assert(prior.scope === scope, 'approval alias authority conflict');
        else push({ kind: 'alias', scope, alias });
        return push({
          kind: 'reserved',
          scope,
          alias,
          attemptId,
          runId,
          day,
          upperMicroUsd,
          binding,
        });
      },
      dispatched(scope, attemptId) {
        const a = attempts(scope).get(attemptId);
        assert(a?.state === 'reserved', 'dispatch without reservation');
        return push({ kind: 'dispatched', scope, attemptId });
      },
      notDispatched(scope, attemptId, { transportEntered, reason }) {
        const a = attempts(scope).get(attemptId);
        assert(
          a && ['reserved', 'dispatched'].includes(a.state) && transportEntered === false,
          'cannot prove transport not entered',
        );
        return push({
          kind: 'not_dispatched',
          scope,
          attemptId,
          costMicroUsd: 0,
          proof: 'live_adapter_transport_not_entered_v1',
          reason,
        });
      },
      received(scope, attemptId, receipt) {
        const a = attempts(scope).get(attemptId);
        assert(a?.state === 'dispatched', 'response without dispatch');
        object(receipt, [
          'costStatus',
          'costMicroUsd',
          'billingComplete',
          'responseSha256',
          'resolvedModel',
        ]);
        assert(['known', 'unknown'].includes(receipt.costStatus), 'receipt cost status');
        if (receipt.costStatus === 'known') integer(receipt.costMicroUsd);
        else assert(receipt.costMicroUsd === null, 'unknown bill');
        return push({ kind: 'received', scope, attemptId, ...receipt });
      },
      settle(scope, attemptId) {
        const a = attempts(scope).get(attemptId);
        assert(
          a?.state === 'received' &&
            a.received.costStatus === 'known' &&
            a.received.billingComplete === true,
          'cannot settle unknown bill',
        );
        const row = push({
          kind: 'settled',
          scope,
          attemptId,
          costMicroUsd: a.received.costMicroUsd,
        });
        assert(
          row.costMicroUsd <= a.reservation.upperMicroUsd,
          'provider exceeded reserved exposure; admission fenced',
        );
        return row;
      },
      unknown(scope, attemptId, reason) {
        const a = attempts(scope).get(attemptId);
        assert(
          a && ['reserved', 'dispatched', 'received'].includes(a.state),
          'unknown attempt state',
        );
        return push({ kind: 'unknown', scope, attemptId, reason });
      },
      retire(alias) {
        const record = entries.find((e) => e.kind === 'alias' && e.alias === alias);
        assert(record, 'unknown approval namespace');
        if (!status(record.scope).retired) push({ kind: 'retired', scope: record.scope, alias });
        return { scope: record.scope, retired: true };
      },
      status,
    };
  } catch (e) {
    release();
    throw e;
  }
}
