import path from 'node:path';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import {
  assert,
  object,
  one,
  string,
  hash,
  integer,
  number,
  digest,
  readJSON,
  safePath,
  uuid,
} from './common.mjs';
export const ARMS = ['full', 'jev', 'core_discovery'];
export function sourceDigest(root) {
  const source = path.join(root, 'scripts/agent-evals');
  const visit = (directory) =>
    fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const file = path.join(directory, entry.name);
      assert(!entry.isSymbolicLink(), 'evaluation source symlink forbidden');
      if (entry.isDirectory()) return visit(file);
      return /(?:\.mjs|\.schema\.json)$/.test(entry.name)
        ? [{ path: path.relative(root, file), sha256: digest(fs.readFileSync(file)) }]
        : [];
    });
  return digest(visit(source).sort((a, b) => a.path.localeCompare(b.path)));
}
const revisions = [
  'tool',
  'catalog',
  'data',
  'fixture',
  'schema',
  'question',
  'gate',
  'threshold',
  'rubric',
];
export function validateManifest(m) {
  object(
    m,
    [
      'version',
      'experimentId',
      'purpose',
      'mode',
      'createdAt',
      'seed',
      'operatorRef',
      'provenance',
      'corpus',
      'scope',
      'bounds',
      'evidence',
      'gates',
    ],
    ['approvalRef', 'accounting'],
  );
  assert(m.version === 1, 'manifest version');
  string(m.experimentId);
  one(m.purpose, ['software_fixture', 'router', 'screen', 'complaint']);
  one(m.mode, ['fixture', 'live']);
  assert(Number.isFinite(Date.parse(m.createdAt)), 'createdAt');
  integer(m.seed, 0, 0xffffffff);
  string(m.operatorRef);
  const p = m.provenance;
  object(p, ['meta', 'hub', 'model', 'provider', ...revisions], ['gateway']);
  for (const repo of ['meta', 'hub', ...(p.gateway ? ['gateway'] : [])]) {
    object(
      p[repo],
      ['commit', 'lockSha256'],
      repo === 'hub'
        ? ['adapterSha256', 'buildSha256', 'sourceSha256']
        : repo === 'gateway'
          ? ['schemaSha256', 'exporterSha256', 'fixtureSha256']
          : ['sourceSha256'],
    );
    assert(/^[a-f0-9]{40}$/.test(p[repo].commit), 'exact source commit required');
    hash(p[repo].lockSha256);
    if (repo === 'meta') hash(p[repo].sourceSha256);
  }
  hash(p.hub.adapterSha256);
  hash(p.hub.buildSha256);
  hash(p.hub.sourceSha256);
  if (p.gateway)
    for (const k of ['schemaSha256', 'exporterSha256', 'fixtureSha256']) hash(p.gateway[k]);
  object(p.model, ['requested', 'resolved'], ['classifier']);
  if (p.model.classifier) {
    object(p.model.classifier, ['requested', 'resolved']);
    string(p.model.classifier.requested);
    assert(
      Array.isArray(p.model.classifier.resolved) && p.model.classifier.resolved.length,
      'classifier resolved identities',
    );
    p.model.classifier.resolved.forEach(string);
  }
  string(p.model.requested);
  assert(Array.isArray(p.model.resolved) && p.model.resolved.length > 0, 'resolved identities');
  p.model.resolved.forEach(string);
  object(p.provider, ['profile', 'revision', 'prices', 'boundPolicy']);
  one(p.provider.profile, ['openrouter-v1']);
  string(p.provider.revision);
  one(p.provider.boundPolicy, ['utf8-bytes-v1']);
  object(p.provider.prices, ['revision', 'inputMicroUsdPerToken', 'outputMicroUsdPerToken']);
  string(p.provider.prices.revision);
  number(p.provider.prices.inputMicroUsdPerToken);
  number(p.provider.prices.outputMicroUsdPerToken);
  revisions.forEach((k) => string(p[k]));
  object(
    m.corpus,
    ['root', 'splitSha256', 'split', 'episodeIds', 'stopping', 'expansion', 'repeatAggregation'],
    ['unblinding'],
  );
  safePath(m.corpus.root, { directory: true });
  hash(m.corpus.splitSha256);
  one(m.corpus.split, ['development', 'holdout']);
  assert(Array.isArray(m.corpus.episodeIds) && m.corpus.episodeIds.length, 'episode selection');
  assert(
    new Set(m.corpus.episodeIds).size === m.corpus.episodeIds.length,
    'duplicate episode selection',
  );
  m.corpus.episodeIds.forEach(string);
  string(m.corpus.stopping);
  string(m.corpus.expansion);
  one(m.corpus.repeatAggregation, ['single', 'all_repeats']);
  object(m.scope, [
    'fixtureOnly',
    'actor',
    'org',
    'allowedEffects',
    'deniedProductionEndpoints',
    'credentialRef',
  ]);
  assert(m.scope.fixtureOnly === true, 'fixture tools required');
  string(m.scope.actor);
  string(m.scope.org);
  assert(
    Array.isArray(m.scope.allowedEffects) &&
      m.scope.allowedEffects.every((x) => x === 'disposable_fixture'),
    'side effects outside fixture',
  );
  assert(m.scope.deniedProductionEndpoints === true, 'production endpoints forbidden');
  assert(
    m.scope.credentialRef === null || typeof m.scope.credentialRef === 'string',
    'credential reference',
  );
  object(m.bounds, [
    'maxCalls',
    'maxAttempts',
    'maxRequestBytes',
    'maxOutputTokens',
    'perCallMicroUsd',
    'runMicroUsd',
    'dayMicroUsd',
    'maxDurationMs',
    'maxBodyBytes',
    'stopConditions',
  ]);
  for (const k of [
    'maxCalls',
    'maxAttempts',
    'maxRequestBytes',
    'maxOutputTokens',
    'maxDurationMs',
    'maxBodyBytes',
  ])
    integer(m.bounds[k], 1, k === 'maxDurationMs' ? 3600000 : 16000000);
  for (const k of ['perCallMicroUsd', 'runMicroUsd', 'dayMicroUsd']) integer(m.bounds[k]);
  assert(
    Array.isArray(m.bounds.stopConditions) && m.bounds.stopConditions.includes('unknown_cost'),
    'stop conditions',
  );
  object(m.evidence, ['expectedKinds', 'retentionUntil', 'namespaceUntil']);
  assert(
    Array.isArray(m.evidence.expectedKinds) && m.evidence.expectedKinds.length,
    'expected receipt kinds',
  );
  m.evidence.expectedKinds.forEach(string);
  for (const k of ['retentionUntil', 'namespaceUntil'])
    assert(Number.isFinite(Date.parse(m.evidence[k])), 'retention date');
  assert(
    Date.parse(m.evidence.namespaceUntil) >= Date.parse(m.evidence.retentionUntil),
    'namespace retention',
  );
  object(m.gates, ['router', 'screen', 'complaint']);
  object(m.gates.router, [
    'draws',
    'successTolerance',
    'latencyRatio',
    'minimumClusters',
    'humanCorpusRequired',
  ]);
  assert(
    m.gates.router.draws === 10000 &&
      m.gates.router.successTolerance === -0.02 &&
      m.gates.router.latencyRatio === 1.1,
    'frozen parent gates',
  );
  integer(m.gates.router.minimumClusters, 2);
  assert(m.gates.router.humanCorpusRequired === true, 'independent human corpus required');
  if (m.gates.screen !== null) {
    object(m.gates.screen, [
      'budget',
      'controls',
      'seed',
      'missBounds',
      'uncertainty',
      'labelRevision',
    ]);
    integer(m.gates.screen.budget, 1);
    integer(m.gates.screen.controls, 1);
    assert(m.gates.screen.controls < m.gates.screen.budget, 'screen controls');
    one(m.gates.screen.uncertainty, ['stratified_bootstrap_v1']);
    object(m.gates.screen.missBounds, ['major', 'urgent', 'critical']);
    Object.values(m.gates.screen.missBounds).forEach((v) => number(v, 0, 1));
    string(m.gates.screen.labelRevision);
  }
  if (m.gates.complaint !== null) {
    object(m.gates.complaint, [
      'thresholdRevision',
      'developmentEvidenceSha256',
      'severityBounds',
      'controlSample',
      'labelRevision',
    ]);
    string(m.gates.complaint.thresholdRevision);
    hash(m.gates.complaint.developmentEvidenceSha256);
    integer(m.gates.complaint.controlSample, 1);
    string(m.gates.complaint.labelRevision);
    object(m.gates.complaint.severityBounds, ['urgent', 'critical']);
    Object.values(m.gates.complaint.severityBounds).forEach((v) => number(v, 0, 1));
  }
  if (m.mode === 'live') {
    string(m.approvalRef);
    object(m.accounting, [
      'accountingRegistryId',
      'accountingScopeId',
      'trustedOperatorConfigSha256',
    ]);
    uuid(m.accounting.accountingRegistryId);
    uuid(m.accounting.accountingScopeId);
    hash(m.accounting.trustedOperatorConfigSha256);
    assert(
      m.bounds.perCallMicroUsd > 0 && m.bounds.runMicroUsd > 0 && m.bounds.dayMicroUsd > 0,
      'zero live budget',
    );
    assert(m.scope.credentialRef !== null, 'explicit credential reference required');
  } else assert(!m.accounting && !m.approvalRef, 'fixture cannot claim paid authority');
  return m;
}
export function loadManifest(p) {
  const m = validateManifest(readJSON(p));
  return { manifest: m, sha256: digest(m) };
}
export function verifyCheckout(root, pin, adapter = false) {
  safePath(root, { directory: true });
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  assert(commit === pin.commit, 'source commit drift');
  if (!adapter && pin.sourceSha256)
    assert(sourceDigest(root) === pin.sourceSha256, 'evaluation runtime source drift');
  const lock = adapter ? 'bun.lock' : 'pnpm-lock.yaml';
  assert(
    digest(fs.readFileSync(path.join(root, lock))) === pin.lockSha256,
    'dependency lock drift',
  );
  if (adapter) {
    const file = path.join(root, 'tests/fixtures/critical-journeys/eval-adapter.mjs');
    safePath(file);
    assert(digest(fs.readFileSync(file)) === pin.adapterSha256, 'adapter drift');
  }
  return commit;
}
