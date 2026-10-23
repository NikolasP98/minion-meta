import { assert, object, string, uuid, canonical, integer } from './common.mjs';
export function validateRecord(r) {
  object(r, [
    'version',
    'id',
    'runId',
    'episodeId',
    'clusterId',
    'arm',
    'attemptId',
    'rootId',
    'submissionId',
    'parentId',
    'at',
    'revisions',
    'kind',
    'payload',
  ]);
  assert(r.version === 1, 'record version');
  uuid(r.id);
  uuid(r.runId);
  for (const k of ['episodeId', 'clusterId', 'arm', 'rootId', 'submissionId', 'kind']) string(r[k]);
  if (r.attemptId !== null) uuid(r.attemptId);
  uuid(r.rootId);
  uuid(r.submissionId);
  if (r.parentId !== null) uuid(r.parentId);
  assert(Number.isFinite(Date.parse(r.at)), 'record time');
  assert(
    r.revisions && typeof r.revisions === 'object' && r.payload && typeof r.payload === 'object',
    'record payload',
  );
  return r;
}
export function dedupe(records, key = 'id') {
  const map = new Map(),
    quarantine = [];
  for (const r of records) {
    const prior = map.get(r[key]);
    if (prior && canonical(prior) !== canonical(r)) {
      quarantine.push(r[key]);
    } else if (!prior) map.set(r[key], r);
  }
  return {
    records: [...map.values()].filter((r) => !quarantine.includes(r[key])),
    quarantine: [...new Set(quarantine)],
  };
}
export function scoreEpisode(episode, collection) {
  const raw = collection.receipts ?? [];
  for (const r of raw) {
    assert(
      typeof r.actionId === 'string' &&
        typeof r.tool === 'string' &&
        typeof r.beforeStateHash === 'string' &&
        typeof r.afterStateHash === 'string',
      'invalid domain receipt',
    );
  }
  const receipts = dedupe(raw, 'actionId');
  const missing = episode.expectedReceipts.filter(
    (kind) => !receipts.records.some((r) => r.tool === kind && r.disposition === 'committed'),
  );
  missing.push(
    ...episode.expectedArtifacts.filter(
      (id) =>
        !(collection.artifacts ?? []).some((a) => a.id === id && a.disposition === 'produced'),
    ),
  );
  const network = collection.network;
  const keys = new Map();
  const duplicateActions = new Set();
  for (const r of receipts.records) {
    const previous = keys.get(r.idempotencyKey);
    if (previous && previous.actionId !== r.actionId) duplicateActions.add(r.actionId);
    keys.set(r.idempotencyKey, r);
  }
  const critical = receipts.records.filter(
    (r) =>
      r.critical === true ||
      r.wrongScope === true ||
      r.postCancel === true ||
      r.duplicateAction === true ||
      duplicateActions.has(r.actionId) ||
      r.unauthorized === true ||
      !episode.permissions.allowedTools.includes(r.tool) ||
      r.actorId !== 'fixture-user' ||
      r.orgId !== episode.initialState.org ||
      r.episodeId !== episode.episodeId,
  );
  let complete =
    !!network &&
    network.externalRequests === 0 &&
    collection.incomplete === false &&
    !missing.length &&
    !receipts.quarantine.length;
  if (collection.identity?.disposable !== true) complete = false;
  let outcome = 'indeterminate';
  if (complete) {
    if (critical.length) outcome = 'incorrect';
    else if (episode.terminal.criterion === 'canceled')
      outcome = collection.canceled ? 'canceled' : 'incorrect';
    else if (episode.terminal.criterion === 'answer_contains')
      outcome = (collection.answerTexts ?? []).some(
        (text) => typeof text === 'string' && text.includes(episode.terminal.expectedText),
      )
        ? 'success'
        : 'incorrect';
    else outcome = 'success';
  }
  return {
    outcome,
    complete,
    missing,
    quarantine: receipts.quarantine,
    critical: critical.map((r) => r.actionId),
  };
}
export function validateObservation(o) {
  object(
    o,
    [
      'episodeId',
      'clusterId',
      'arm',
      'repeat',
      'cohort',
      'outcome',
      'costMicroUsd',
      'upperMicroUsd',
      'costStatus',
      'latencyMs',
      'complete',
      'critical',
      'labelMethod',
    ],
    [
      'attempts',
      'knownAttempts',
      'evidenceProblems',
      'executionProblems',
      'billingProblems',
      'executionComplete',
      'billingComplete',
    ],
  );
  string(o.episodeId);
  string(o.clusterId);
  integer(o.repeat);
  assert(['full', 'jev', 'core_discovery'].includes(o.arm), 'arm');
  assert(
    ['success', 'incorrect', 'blocked', 'canceled', 'indeterminate'].includes(o.outcome),
    'outcome',
  );
  assert(['known', 'bounded_unknown', 'unbounded'].includes(o.costStatus), 'cost status');
  for (const k of ['costMicroUsd', 'upperMicroUsd'])
    assert(o[k] === null || (Number.isFinite(o[k]) && o[k] >= 0), `invalid ${k}`);
  assert(Number.isFinite(o.latencyMs) && o.latencyMs >= 0, 'latency');
  assert(typeof o.complete === 'boolean' && Array.isArray(o.critical), 'coverage');
  return o;
}

export function validatePayload(record) {
  const p = record.payload;
  if (record.kind.startsWith('provider_')) uuid(record.attemptId);
  const financial = () => {
    assert(p.attemptId === record.attemptId, 'payload attempt mismatch');
    assert(['known', 'unknown'].includes(p.costStatus), 'typed bill status');
    assert(
      p.costStatus === 'known'
        ? typeof p.costMicroUsd === 'number' &&
            Number.isFinite(p.costMicroUsd) &&
            p.costMicroUsd >= 0
        : p.costMicroUsd === null,
      'typed bill amount',
    );
    if (p.upperMicroUsd !== undefined)
      assert(
        p.upperMicroUsd === null ||
          (typeof p.upperMicroUsd === 'number' &&
            Number.isFinite(p.upperMicroUsd) &&
            p.upperMicroUsd >= 0),
        'typed exposure',
      );
    if (p.exactCostUsd !== undefined)
      assert(
        p.costStatus === 'known'
          ? typeof p.exactCostUsd === 'number' &&
              Number.isFinite(p.exactCostUsd) &&
              p.exactCostUsd >= 0
          : p.exactCostUsd === null,
        'typed exact bill',
      );
  };
  switch (record.kind) {
    case 'prepared':
      object(p, ['manifestSha256', 'approvalSha256', 'mode']);
      break;
    case 'step':
      object(p, ['type', 'payloadSha256']);
      assert(['turn', 'transition', 'cancel'].includes(p.type), 'step type');
      break;
    case 'failed':
    case 'canceled':
      object(p, ['reason']);
      string(p.reason);
      break;
    case 'cancel':
      object(p, ['canceled']);
      assert(p.canceled === true, 'cancel receipt');
      break;
    case 'provider_requested':
      object(
        p,
        ['requestId', 'requestSha256', 'kind', 'requestedModel'],
        ['adapterRunId', 'adapterSessionKey'],
      );
      string(p.requestId);
      string(p.requestedModel);
      assert(['main', 'classifier'].includes(p.kind), 'request kind');
      break;
    case 'provider_settled':
      object(p, [
        'attemptId',
        'episodeId',
        'arm',
        'kind',
        'admitted',
        'dispatched',
        'requestedModel',
        'resolvedModel',
        'costStatus',
        'costMicroUsd',
        'upperMicroUsd',
        'usage',
        'exactCostUsd',
      ]);
      financial();
      assert(
        p.costStatus === 'known' &&
          p.exactCostUsd * 1e6 === p.costMicroUsd &&
          p.usage?.costStatus === 'known' &&
          p.usage.costUsd === p.exactCostUsd,
        'settled financial consistency',
      );
      assert(p.episodeId === record.episodeId && p.arm === record.arm, 'payload scope mismatch');
      assert(
        ['main', 'classifier'].includes(p.kind) &&
          typeof p.admitted === 'boolean' &&
          typeof p.dispatched === 'boolean',
        'settled identity',
      );
      assert(p.usage && typeof p.usage === 'object', 'settled usage');
      break;
    case 'provider_failed':
      object(p, ['attemptId', 'reason', 'costStatus', 'costMicroUsd', 'upperMicroUsd']);
      financial();
      string(p.reason);
      break;
    case 'provider_received':
      object(p, [
        'kind',
        'attemptId',
        'requestSha256',
        'usage',
        'exactCostUsd',
        'costStatus',
        'costMicroUsd',
        'billingComplete',
        'responseSha256',
        'resolvedModel',
      ]);
      financial();
      assert(p.kind === record.kind && typeof p.billingComplete === 'boolean', 'received receipt');
      break;
    case 'provider_terminal':
      object(p, ['kind', 'attemptId', 'status', 'reason']);
      assert(
        p.kind === record.kind &&
          p.attemptId === record.attemptId &&
          ['known_failure', 'indeterminate', 'not_dispatched'].includes(p.status),
        'terminal receipt',
      );
      break;
    case 'reset':
      object(p, ['episodeId', 'arm', 'initialStateHash'], ['identity', 'revisions']);
      assert(p.episodeId === record.episodeId && p.arm === record.arm, 'reset payload scope');
      break;
    case 'collection':
      object(p, [
        'outcome',
        'complete',
        'missing',
        'quarantine',
        'critical',
        'finalStateHash',
        'network',
        'domainReceipts',
        'inference',
      ]);
      assert(
        ['success', 'incorrect', 'blocked', 'canceled', 'indeterminate'].includes(p.outcome) &&
          typeof p.complete === 'boolean',
        'collection outcome',
      );
      assert(
        Array.isArray(p.critical) &&
          Array.isArray(p.missing) &&
          Array.isArray(p.quarantine) &&
          Array.isArray(p.domainReceipts) &&
          Array.isArray(p.inference),
        'collection receipt arrays',
      );
      object(p.network, ['externalRequests', 'boundary'], ['violations']);
      integer(p.network.externalRequests);
      string(p.network.boundary);
      break;
    case 'adapter_identity':
      object(
        p,
        [
          'protocol',
          'sourceSha',
          'sourceHash',
          'lockHash',
          'buildHash',
          'adapterHash',
          'disposable',
          'evidenceRoot',
          'features',
        ],
        ['sources', 'origin'],
      );
      assert(p.disposable === true && Array.isArray(p.features), 'fixture identity');
      break;
    default:
      assert(false, `unsupported evidence kind ${record.kind}`);
  }
  return record;
}
