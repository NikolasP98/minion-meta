import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { digest, writePrivate } from '../lib/common.mjs';
import { initializeRegistry } from '../lib/budget.mjs';
import { sourceDigest } from '../lib/manifest.mjs';
export const ROOT = path.resolve(import.meta.dirname, '../../..');
export const fixtureRoot = path.join(ROOT, 'audits/2026-10-22-agent-use-transcripts/spec/fixtures');
export function temp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'minion-eval-test-'));
}
export function episode(id = 'e1', locale = 'en', family = 'informational_question') {
  return {
    version: 1,
    episodeId: id,
    clusterId: id,
    leakageGroupId: id,
    family,
    locale,
    provenance: 'synthetic_software',
    truth: { references: ['synthetic:answer'], sha256: digest('fixture answer') },
    initialState: {
      fixtureId: 'empty',
      sha256: digest(JSON.stringify({ fixture: 'empty', seed: 7, persona: 'owner' })),
      persona: 'owner',
      org: 'fixture-org',
      surface: 'home',
      sandbox: false,
    },
    permissions: {
      allowedTools: [],
      forbiddenTools: ['send_email'],
      allowedActions: [],
      forbiddenActions: ['production_write'],
    },
    steps: [
      {
        type: 'turn',
        payload: { text: `${locale === 'es' ? 'Responde' : 'Answer'} fixture answer ${id}` },
      },
    ],
    expectedReceipts: [],
    expectedArtifacts: [],
    terminal: {
      criterion: 'answer_contains',
      expectedText: 'fixture answer',
      forbiddenSideEffects: ['production_write'],
    },
    maxEffort: { calls: 4, durationMs: 15000, steps: 10 },
    consequential: false,
    history:
      family === 'compacted_history'
        ? { revision: 'synthetic-v1', compacted: true, sourceHash: digest('synthetic history') }
        : null,
  };
}
export function label(e) {
  return {
    version: 1,
    labelId: `label-${e.episodeId}`,
    revision: 1,
    episodeId: e.episodeId,
    sourceSha256: digest(e),
    actorRef: 'synthetic-author',
    reviewerRef: 'synthetic-reviewer',
    method: 'synthetic_software',
    rubricRevision: 'rubric-v1',
    outcome: 'success',
    findings: [],
    adjudicationRef: 'synthetic',
    adjudicatedAt: '2026-10-23T00:00:00Z',
    supersedes: null,
    blindToScreen: true,
  };
}
export function corpus(root, episodes = [episode()], holdouts = []) {
  fs.mkdirSync(root, { mode: 0o700 });
  const entries = [];
  for (const [split, items] of [
    ['development', episodes],
    ['holdout', holdouts],
  ]) {
    fs.mkdirSync(path.join(root, split), { mode: 0o700 });
    for (const e of items) {
      const labels = [label(e)];
      const body = `${split}/${e.episodeId}.json`,
        lp = `${split}/${e.episodeId}.labels.json`;
      writePrivate(path.join(root, body), e);
      writePrivate(path.join(root, lp), labels);
      entries.push({
        episodeId: e.episodeId,
        clusterId: e.clusterId,
        leakageGroupId: e.leakageGroupId,
        contentSha256: digest({ truth: e.truth, steps: e.steps }),
        episodeSha256: digest(e),
        labelSha256: digest(labels),
        split,
        body,
        labels: lp,
      });
    }
  }
  const s = { version: 1, revision: 'synthetic-v1', entries };
  writePrivate(path.join(root, 'split.json'), s);
  return s;
}
export function unitHub(root) {
  fs.mkdirSync(root, { mode: 0o700 });
  fs.mkdirSync(path.join(root, 'tests/fixtures/critical-journeys'), { recursive: true });
  const adapter = path.join(root, 'tests/fixtures/critical-journeys/eval-adapter.mjs');
  fs.copyFileSync(path.join(ROOT, 'scripts/agent-evals/fixtures/unit-hub-adapter.mjs'), adapter);
  fs.writeFileSync(path.join(root, 'bun.lock'), 'synthetic unit lock');
  const gitEnv = {
    PATH: process.env.PATH,
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: '/dev/null',
  };
  for (const cmd of [
    ['init', '--quiet'],
    ['add', '.'],
    [
      '-c',
      'user.name=Unit Fixture',
      '-c',
      'user.email=fixture@example.invalid',
      'commit',
      '--quiet',
      '-m',
      'synthetic protocol unit fixture',
    ],
  ])
    execFileSync('git', cmd, { cwd: root, stdio: 'pipe', env: gitEnv });
  return {
    commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    lockSha256: digest(fs.readFileSync(path.join(root, 'bun.lock'))),
    adapterSha256: digest(fs.readFileSync(adapter)),
    buildSha256: 'b'.repeat(64),
    sourceSha256: 'a'.repeat(64),
  };
}
export function manifest(root, hubPin, corpusRoot, split) {
  const d = 'v1';
  return {
    version: 1,
    experimentId: 'synthetic-software',
    purpose: 'software_fixture',
    mode: 'fixture',
    createdAt: '2026-10-23T00:00:00Z',
    seed: 7,
    operatorRef: 'test-owner',
    provenance: {
      meta: {
        sourceSha256: sourceDigest(ROOT),
        commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(),
        lockSha256: digest(fs.readFileSync(path.join(ROOT, 'pnpm-lock.yaml'))),
      },
      hub: hubPin,
      model: {
        requested: 'fixture/main',
        resolved: ['fixture/main'],
        classifier: { requested: '~typesafe/jev-latest', resolved: ['~typesafe/jev-latest'] },
      },
      provider: {
        profile: 'openrouter-v1',
        revision: d,
        prices: { revision: 'test-price-v1', inputMicroUsdPerToken: 1, outputMicroUsdPerToken: 1 },
        boundPolicy: 'utf8-bytes-v1',
      },
      ...Object.fromEntries(
        [
          'tool',
          'catalog',
          'data',
          'fixture',
          'schema',
          'question',
          'gate',
          'threshold',
          'rubric',
        ].map((k) => [k, d]),
      ),
    },
    corpus: {
      root: corpusRoot,
      splitSha256: digest(split),
      split: 'development',
      episodeIds: split.entries.filter((e) => e.split === 'development').map((e) => e.episodeId),
      stopping: 'fixed synthetic cases',
      expansion: 'none',
      repeatAggregation: 'single',
    },
    scope: {
      fixtureOnly: true,
      actor: 'fixture-user',
      org: 'fixture-org',
      allowedEffects: ['disposable_fixture'],
      deniedProductionEndpoints: true,
      credentialRef: null,
    },
    bounds: {
      maxCalls: 20,
      maxAttempts: 20,
      maxRequestBytes: 64000,
      maxOutputTokens: 1024,
      perCallMicroUsd: 100000,
      runMicroUsd: 1000000,
      dayMicroUsd: 1000000,
      maxDurationMs: 60000,
      maxBodyBytes: 2 * 1024 * 1024,
      stopConditions: ['unknown_cost', 'cancel', 'drift'],
    },
    evidence: {
      expectedKinds: ['adapter_identity', 'reset', 'collection', 'provider_settled'],
      retentionUntil: '2026-10-24T00:00:00Z',
      namespaceUntil: '2027-10-24T00:00:00Z',
    },
    gates: {
      router: {
        draws: 10000,
        successTolerance: -0.02,
        latencyRatio: 1.1,
        minimumClusters: 60,
        humanCorpusRequired: true,
      },
      screen: null,
      complaint: null,
    },
  };
}
export function setup() {
  const root = temp(),
    hub = path.join(root, 'hub'),
    pin = unitHub(hub),
    croot = path.join(root, 'corpus'),
    split = corpus(croot);
  const m = manifest(root, pin, croot, split);
  m.provenance.rubric = 'rubric-v1';
  const manifestPath = path.join(root, 'manifest.json');
  writePrivate(manifestPath, m);
  return { root, hub, pin, croot, split, m, manifestPath, out: path.join(root, 'output') };
}
export function liveSetup() {
  const s = setup();
  const registry = initializeRegistry({
    root: path.join(s.root, 'registry'),
    registryId: crypto.randomUUID(),
    scopeId: crypto.randomUUID(),
    ownerRef: 'test-owner',
    purpose: 'software_fixture',
  });
  const pair = crypto.generateKeyPairSync('ed25519');
  const publicKey = pair.publicKey.export({ type: 'spki', format: 'pem' });
  const keyPath = path.join(s.root, 'test-only-public.pem');
  writePrivate(keyPath, publicKey);
  const config = {
    ...registry,
    ownerRef: 'test-owner',
    keySha256: digest(pair.publicKey.export({ type: 'spki', format: 'der' })),
  };
  const configPath = path.join(s.root, 'operator.json');
  writePrivate(configPath, config);
  s.m.mode = 'live';
  s.m.scope.credentialRef = 'explicit-test-only-file';
  s.m.approvalRef = 'test-only-approval';
  s.m.accounting = {
    accountingRegistryId: config.accountingRegistryId,
    accountingScopeId: config.scopes[0].accountingScopeId,
    trustedOperatorConfigSha256: digest(config),
  };
  writePrivate(s.manifestPath, s.m, false);
  const approvalPath = path.join(s.root, 'approval.json');
  function approve(alias = 'test-alias') {
    const payload = {
      version: 1,
      manifestSha256: digest(s.m),
      approvalRef: s.m.approvalRef,
      ownerRef: 'test-owner',
      issuedAt: new Date(Date.now() - 60000).toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      permittedMode: 'live',
      scopeHash: digest(s.m.scope),
      budgetHash: digest(s.m.bounds),
      approvalNamespace: alias,
      ...s.m.accounting,
    };
    const approval = {
      algorithm: 'Ed25519',
      payload,
      signature: crypto
        .sign(
          null,
          Buffer.from(
            (function c(v) {
              if (v && typeof v === 'object' && !Array.isArray(v))
                return (
                  '{' +
                  Object.keys(v)
                    .sort()
                    .map((k) => JSON.stringify(k) + ':' + c(v[k]))
                    .join(',') +
                  '}'
                );
              return JSON.stringify(v);
            })(payload),
          ),
          pair.privateKey,
        )
        .toString('base64'),
    };
    writePrivate(approvalPath, approval, false);
    return approval;
  }
  approve();
  const credentialFile = path.join(s.root, 'test-credential');
  writePrivate(credentialFile, 'test-only-no-real-key');
  const counter = path.join(s.root, 'requests.jsonl');
  writePrivate(counter, '');
  return {
    ...s,
    config,
    configPath,
    keyPath,
    approvalPath,
    credentialFile,
    counter,
    approve,
    pair,
  };
}
export function cli(s, extra = [], behavior) {
  return spawnSync(
    process.execPath,
    [
      '--import',
      path.join(ROOT, 'scripts/agent-evals/fixtures/stub-provider.mjs'),
      path.join(ROOT, 'scripts/agent-evals/run.mjs'),
      '--manifest',
      s.manifestPath,
      '--hub-root',
      s.hub,
      '--out',
      s.out,
      ...(s.config
        ? [
            '--live',
            '--approval',
            s.approvalPath,
            '--operator-config',
            s.configPath,
            '--trusted-key',
            s.keyPath,
            '--owner-ref',
            'test-owner',
            '--credential-file',
            s.credentialFile,
          ]
        : []),
      ...extra,
    ],
    {
      cwd: ROOT,
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        MINION_EVAL_TEST_COUNTER: s.counter ?? '',
        MINION_EVAL_TEST_BEHAVIOR: behavior ?? '',
      },
      encoding: 'utf8',
      timeout: 80000,
    },
  );
}
