import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  assert,
  canonical,
  digest,
  readJSON,
  safePath,
  writePrivate,
  append,
  args,
  direct,
  main,
  rng,
  shuffled,
  syncDir,
  jsonl,
} from './lib/common.mjs';
import { ARMS, loadManifest, verifyCheckout } from './lib/manifest.mjs';
import { loadCorpus, readiness } from './corpus.mjs';
import { HubAdapter } from './lib/hub-adapter.mjs';
import { fixtureProvider, liveProvider } from './lib/live-provider.mjs';
import { verifyApproval, loadConfig, assertApprovalCurrent } from './lib/approval.mjs';
import { initializeRegistry, openBudget } from './lib/budget.mjs';
import { prepare } from './prepare.mjs';
import { scoreEpisode } from './lib/receipts.mjs';
export async function runEvaluation(options) {
  const { manifest, sha256 } = loadManifest(options.manifest);
  const live = options.live === true;
  assert((manifest.mode === 'live') === live, '--live and manifest mode must agree');
  if (options.mode) assert(options.mode === manifest.mode, 'mode mismatch');
  const metaRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  verifyCheckout(metaRoot, manifest.provenance.meta);
  const hubRoot = options.hubRoot;
  safePath(hubRoot, { directory: true });
  verifyCheckout(hubRoot, manifest.provenance.hub, true);
  const corpus = loadCorpus(manifest.corpus.root, {
    mode: manifest.corpus.split,
    splitSha256: manifest.corpus.splitSha256,
    unblinding: manifest.corpus.unblinding,
    episodeIds: manifest.corpus.episodeIds,
  });
  assert(corpus.episodes.length === manifest.corpus.episodeIds.length, 'episode coverage');
  const readinessCorpora = [corpus];
  if (manifest.corpus.split === 'holdout')
    readinessCorpora.push(
      loadCorpus(manifest.corpus.root, {
        mode: 'development',
        splitSha256: manifest.corpus.splitSha256,
      }),
    );
  assert(
    readinessCorpora.every((set) =>
      set.labels.every((label) => label.rubricRevision === manifest.provenance.rubric),
    ),
    'independent rubric revision drift',
  );
  const output = options.out;
  safePath(output, { existing: false, directory: true });
  assert(!fs.existsSync(output), 'run output already exists');
  safePath(path.dirname(output), { directory: true });
  let approval, budget, credential;
  if (live) {
    for (const key of ['approval', 'operatorConfig', 'trustedKey', 'ownerRef', 'credentialFile'])
      assert(options[key], `missing live ${key}`);
    for (const p of [
      options.approval,
      options.operatorConfig,
      options.trustedKey,
      options.credentialFile,
    ])
      assert(!path.resolve(p).startsWith(`${output}/`), 'trust/credentials outside generated run');
    approval = verifyApproval({
      manifest,
      manifestSha256: sha256,
      approvalPath: options.approval,
      configPath: options.operatorConfig,
      keyPath: options.trustedKey,
      ownerRef: options.ownerRef,
    });
    assert(
      output !== approval.config.root &&
        !output.startsWith(`${approval.config.root}/`) &&
        !approval.config.root.startsWith(`${output}/`),
      'registry outside run outputs',
    );
    safePath(options.credentialFile);
    assert(
      (fs.statSync(options.credentialFile).mode & 0o077) === 0,
      'credential input must be private',
    );
    credential = fs.readFileSync(options.credentialFile, 'utf8').trim();
    assert(credential.length >= 4, 'empty explicit credential');
    budget = openBudget(approval.config, { journalAssertion: options.budgetJournal });
  } else
    assert(
      !options.approval &&
        !options.operatorConfig &&
        !options.credentialFile &&
        !options.budgetJournal,
      'fixture cannot use paid inputs',
    );
  const runId = crypto.randomUUID();
  let adapter,
    episode,
    arm,
    current,
    attemptCount = 0,
    canceled = false,
    closed = false;
  const observations = [],
    orders = [],
    resetHashes = {},
    attempts = [],
    rawFiles = [];
  const controller = new AbortController();
  fs.mkdirSync(output, { mode: 0o700 });
  writePrivate(path.join(output, 'active-writer.json'), { pid: process.pid, runId });
  fs.mkdirSync(path.join(output, 'raw'), { mode: 0o700 });
  writePrivate(path.join(output, 'manifest.json'), manifest);
  writePrivate(path.join(output, 'events.jsonl'), '');
  writePrivate(path.join(output, 'receipts.jsonl'), '');
  syncDir(output);
  const raw = (name, value) => {
    assert(/^[A-Za-z0-9_-]{1,128}$/.test(name), 'opaque raw filename required');
    const relative = `raw/${name}.json`;
    const destination = path.resolve(output, relative);
    assert(
      path.dirname(destination) === path.join(output, 'raw'),
      'raw destination escaped private root',
    );
    safePath(path.join(output, 'raw'), { directory: true });
    writePrivate(destination, value);
    rawFiles.push(relative);
  };
  const record = (file, kind, payload, attemptId = null) => {
    append(path.join(output, file), {
      version: 1,
      id: crypto.randomUUID(),
      runId,
      episodeId: episode?.episodeId ?? 'run',
      clusterId: episode?.clusterId ?? 'run',
      arm: arm ?? 'run',
      attemptId,
      rootId: current?.rootId ?? runId,
      submissionId: current?.submissionId ?? runId,
      parentId: current?.parentId ?? null,
      at: new Date().toISOString(),
      revisions: manifest.provenance,
      kind,
      payload,
    });
  };
  const onCancel = () => {
    canceled = true;
    controller.abort(new Error('operator cancellation'));
    record('events.jsonl', 'canceled', { reason: 'operator' });
  };
  process.once('SIGINT', onCancel);
  process.once('SIGTERM', onCancel);
  let failure = null;
  try {
    record('events.jsonl', 'prepared', {
      manifestSha256: sha256,
      approvalSha256: approval?.approvalSha256 ?? null,
      mode: manifest.mode,
    });
    raw('episodes', corpus.episodes);
    const onProvider = async (request) => {
      assert(!canceled && !controller.signal.aborted, 'provider admission canceled');
      assert(episode && arm && current, 'provider without active episode');
      assert(
        Buffer.byteLength(canonical(request)) <= manifest.bounds.maxRequestBytes,
        'provider request payload bound exceeded',
      );
      assert(
        ++attemptCount <= manifest.bounds.maxCalls && attemptCount <= manifest.bounds.maxAttempts,
        'run effort exceeded',
      );
      assert(current.calls++ < episode.maxEffort.calls, 'episode effort exceeded');
      const attemptId = crypto.randomUUID();
      const attempt = {
        attemptId,
        episodeId: episode.episodeId,
        arm,
        kind: request.kind,
        admitted: false,
        dispatched: false,
        requestedModel: request.model,
        resolvedModel: null,
        costStatus: live ? 'unknown' : 'known',
        costMicroUsd: live ? null : 0,
        upperMicroUsd: live ? null : 0,
        usage: null,
      };
      attempts.push(attempt);
      raw(`request-${attemptId}`, request);
      record(
        'events.jsonl',
        'provider_requested',
        {
          requestId: request.requestId,
          requestSha256: digest(request),
          kind: request.kind,
          requestedModel: request.model,
          adapterRunId: request.runId ?? null,
          adapterSessionKey: request.sessionKey ?? null,
        },
        attemptId,
      );
      const onReceipt = async (receipt) => {
        if (receipt.kind === 'provider_received') {
          raw(`provider-${attemptId}`, receipt);
          Object.assign(attempt, {
            costStatus: receipt.costStatus,
            costMicroUsd: receipt.exactCostUsd === null ? null : receipt.exactCostUsd * 1e6,
            exactCostUsd: receipt.exactCostUsd,
            resolvedModel: receipt.resolvedModel,
            usage: receipt.usage,
          });
        }
        record(
          'receipts.jsonl',
          receipt.kind,
          Object.fromEntries(
            Object.entries(receipt).filter(([k]) => !['raw', 'result'].includes(k)),
          ),
          attemptId,
        );
      };
      try {
        const result = live
          ? await liveProvider({
              request,
              manifest,
              credential,
              budget,
              scope: manifest.accounting.accountingScopeId,
              alias: approval.payload.approvalNamespace,
              attemptId,
              runId,
              signal: controller.signal,
              onReceipt,
              authorize: () => {
                const current = verifyApproval({
                  manifest,
                  manifestSha256: sha256,
                  approvalPath: options.approval,
                  configPath: options.operatorConfig,
                  keyPath: options.trustedKey,
                  ownerRef: options.ownerRef,
                });
                assert(
                  current.approvalSha256 === approval.approvalSha256,
                  'approval changed during run',
                );
                assertApprovalCurrent(current.payload);
              },
            })
          : await fixtureProvider({
              request,
              episode,
              index: current.providerIndices[request.kind]++,
            });
        Object.assign(attempt, {
          costStatus: result.usage.costStatus,
          costMicroUsd: result.usage.costUsd * 1e6,
          exactCostUsd: result.usage.costUsd,
          admitted: live,
          dispatched: live,
          upperMicroUsd: result.upperMicroUsd,
          resolvedModel: result.resolvedModel,
          usage: result.usage,
        });
        record('receipts.jsonl', 'provider_settled', { ...attempt }, attemptId);
        const { upperMicroUsd, ...payload } = result;
        return payload;
      } catch (error) {
        const reservation = budget
          ?.status(manifest.accounting.accountingScopeId)
          .attempts.get(attemptId);
        if (reservation) {
          attempt.upperMicroUsd = reservation.reservation.upperMicroUsd;
          attempt.admitted = true;
          if (reservation.state === 'not_dispatched') {
            attempt.costStatus = 'known';
            attempt.costMicroUsd = 0;
            attempt.exactCostUsd = 0;
            attempt.upperMicroUsd = 0;
          }
          attempt.dispatched =
            reservation.state !== 'not_dispatched' &&
            budget.entries.some((e) => e.kind === 'dispatched' && e.attemptId === attemptId);
        } else if (live) {
          attempt.costStatus = 'known';
          attempt.costMicroUsd = 0;
          attempt.upperMicroUsd = 0;
          attempt.exactCostUsd = 0;
        }
        record(
          'receipts.jsonl',
          'provider_failed',
          {
            attemptId,
            reason: error.message,
            costStatus: attempt.costStatus,
            costMicroUsd: attempt.costMicroUsd,
            upperMicroUsd: attempt.upperMicroUsd,
          },
          attemptId,
        );
        throw error;
      }
    };
    adapter =
      options.preparedAdapter ??
      new HubAdapter({
        root: hubRoot,
        pin: manifest.provenance.hub,
        bounds: manifest.bounds,
        onProvider,
      });
    adapter.onProvider = onProvider;
    adapter.pin = manifest.provenance.hub;
    const hello = options.preparedIdentity
      ? adapter.adoptHello(options.preparedIdentity)
      : await adapter.hello();
    record('receipts.jsonl', 'adapter_identity', { ...hello, evidenceRoot: hello.evidenceRoot });
    const random = rng(manifest.seed);
    const deadline = Date.now() + manifest.bounds.maxDurationMs;
    for (episode of corpus.episodes) {
      const order = shuffled(ARMS, random);
      orders.push({ episodeId: episode.episodeId, order });
      let initialHash = null;
      for (arm of order) {
        if (canceled) break;
        assert(Date.now() < deadline, 'run duration exceeded');
        current = {
          rootId: crypto.randomUUID(),
          submissionId: crypto.randomUUID(),
          parentId: null,
          calls: 0,
          providerIndices: { main: 0, classifier: 0 },
          started: Date.now(),
        };
        const started = current.started;
        const reset = await adapter.send('reset', {
          episodeId: episode.episodeId,
          arm,
          seed: manifest.seed,
          persona: episode.initialState.persona,
          initialState: episode.initialState.fixtureId,
          ...(initialHash ? { initialStateHash: initialHash } : {}),
          locale: episode.locale,
          surface: episode.initialState.surface,
          sandbox: episode.initialState.sandbox,
          revisions: { boundedLabels: digest(manifest.provenance) },
          allowedTools: episode.permissions.allowedTools,
          model: {
            requestedModel: manifest.provenance.model.requested,
            boundDescriptor: manifest.provenance.provider.boundPolicy,
          },
        });
        assert(
          reset.episodeId === episode.episodeId && reset.arm === arm,
          'reset identity mismatch',
        );
        assert(
          reset.initialStateHash === episode.initialState.sha256,
          'initial fixture state drift',
        );
        initialHash ??= reset.initialStateHash;
        assert(initialHash === reset.initialStateHash, 'arms did not reset identical state');
        resetHashes[`${episode.episodeId}:${arm}`] = reset.initialStateHash;
        record('receipts.jsonl', 'reset', reset);
        let collection;
        let armCanceled = false;
        for (const step of episode.steps) {
          assert(
            Date.now() < deadline && Date.now() - started < episode.maxEffort.durationMs,
            'episode deadline',
          );
          if (canceled) break;
          current.parentId = current.submissionId;
          current.submissionId = crypto.randomUUID();
          record('events.jsonl', 'step', { type: step.type, payloadSha256: digest(step.payload) });
          const before = attempts.length;
          const stepReceipt = await adapter.send(step.type, step.payload);
          if (step.type === 'cancel') {
            assert(stepReceipt.canceled === true, 'missing actual cancellation receipt');
            record('receipts.jsonl', 'cancel', stepReceipt);
            armCanceled = true;
            break;
          }
          let stable = 0;
          do {
            await new Promise((resolve) => setTimeout(resolve, 80));
            await adapter.drain();
            collection = await adapter.send('collect', {});
            const done =
              !collection.incomplete &&
              collection.pendingProviders === 0 &&
              (step.type !== 'turn' || attempts.length > before);
            stable = done ? stable + 1 : 0;
            assert(
              Date.now() < deadline && Date.now() - started < episode.maxEffort.durationMs,
              'trajectory did not settle',
            );
          } while (stable < 2);
        }
        await adapter.drain();
        collection = await adapter.send('collect', {});
        if (armCanceled) collection.canceled = true;
        assert(
          collection.episodeId === episode.episodeId && collection.arm === arm,
          'collection identity mismatch',
        );
        raw(`collection-${digest({ episodeId: episode.episodeId, arm })}`, collection);
        const score = scoreEpisode(episode, collection);
        record('receipts.jsonl', 'collection', {
          ...score,
          finalStateHash: collection.finalStateHash,
          network: collection.network,
          domainReceipts: collection.receipts,
          inference: collection.inference,
        });
        const calls = attempts.filter((a) => a.episodeId === episode.episodeId && a.arm === arm),
          known = calls.every((a) => a.costStatus === 'known'),
          bounded = calls.every((a) => a.upperMicroUsd !== null);
        observations.push({
          episodeId: episode.episodeId,
          clusterId: episode.clusterId,
          arm,
          repeat: 0,
          cohort: manifest.provenance,
          outcome: score.outcome,
          costMicroUsd: known ? calls.reduce((n, a) => n + a.costMicroUsd, 0) : null,
          upperMicroUsd: bounded ? calls.reduce((n, a) => n + a.upperMicroUsd, 0) : null,
          costStatus: known ? 'known' : bounded ? 'bounded_unknown' : 'unbounded',
          latencyMs: Date.now() - started,
          complete: score.complete,
          critical: score.critical,
          labelMethod:
            corpus.labels.find((l) => l.episodeId === episode.episodeId)?.method ?? 'unadjudicated',
          attempts: calls.length,
        });
      }
    }
  } catch (error) {
    failure = error;
    record('events.jsonl', 'failed', { reason: error.message });
    if (
      episode &&
      arm &&
      !observations.some((o) => o.episodeId === episode.episodeId && o.arm === arm)
    ) {
      const calls = attempts.filter((a) => a.episodeId === episode.episodeId && a.arm === arm),
        known = calls.every((a) => a.costStatus === 'known'),
        bounded = calls.every((a) => a.upperMicroUsd !== null);
      observations.push({
        episodeId: episode.episodeId,
        clusterId: episode.clusterId,
        arm,
        repeat: 0,
        cohort: manifest.provenance,
        outcome: canceled ? 'canceled' : 'indeterminate',
        costMicroUsd: known ? calls.reduce((n, a) => n + a.costMicroUsd, 0) : null,
        upperMicroUsd: bounded ? calls.reduce((n, a) => n + a.upperMicroUsd, 0) : null,
        costStatus: known ? 'known' : bounded ? 'bounded_unknown' : 'unbounded',
        latencyMs: Date.now() - (current?.started ?? Date.now()),
        complete: false,
        critical: [],
        labelMethod:
          corpus.labels.find((l) => l.episodeId === episode.episodeId)?.method ?? 'unadjudicated',
        attempts: calls.length,
      });
    }
  } finally {
    process.off('SIGINT', onCancel);
    process.off('SIGTERM', onCancel);
    try {
      await adapter?.close();
    } catch (error) {
      failure ??= error;
    }
    budget?.close();
    credential = undefined;
    closed = true;
  }
  const complete =
    !failure &&
    !canceled &&
    observations.length === corpus.episodes.length * 3 &&
    observations.every((o) => o.complete);
  const result = {
    version: 1,
    runId,
    manifestSha256: sha256,
    approvalSha256: approval?.approvalSha256 ?? null,
    status: canceled ? 'canceled' : complete ? 'complete' : 'incomplete',
    error: failure?.message ?? null,
    qualification:
      manifest.purpose === 'software_fixture' ? 'synthetic_software_only' : 'evaluation_software',
    paidRequests: attempts.filter((a) => a.dispatched).length,
    orders,
    resetHashes,
    attempts,
    rawFiles,
    retentionUntil: manifest.evidence.retentionUntil,
    analysis: {
      version: 1,
      observations,
      seed: manifest.seed,
      minimumClusters: manifest.gates.router.minimumClusters,
      humanCorpusReady: readiness(readinessCorpora).ready,
      repeatAggregation: manifest.corpus.repeatAggregation,
      preregistration: { stopping: manifest.corpus.stopping, expansion: manifest.corpus.expansion },
    },
  };
  writePrivate(path.join(output, 'result.json'), result);
  if (closed) fs.unlinkSync(path.join(output, 'active-writer.json'));
  syncDir(output);
  assert(complete, `run ${result.status}: ${failure?.message ?? 'incomplete receipts'}`);
  return { output, ...result };
}
export function inspectRun(root) {
  safePath(root, { directory: true });
  const r = readJSON(path.join(root, 'result.json'));
  return {
    runId: r.runId,
    status: r.status,
    manifestSha256: r.manifestSha256,
    attempts: r.attempts,
    retentionUntil: r.retentionUntil,
  };
}
export function redactRun(root, deletionRef) {
  safePath(root, { directory: true });
  assert(!fs.existsSync(path.join(root, 'active-writer.json')), 'active writer');
  const result = readJSON(path.join(root, 'result.json'));
  assert(
    Date.now() >= Date.parse(result.retentionUntil) ||
      (typeof deletionRef === 'string' && deletionRef.length > 0),
    'retention not expired; explicit deletion reference required',
  );
  for (const relative of result.rawFiles) {
    assert(relative.startsWith('raw/') && !relative.includes('..'), 'invalid raw path');
    const p = path.join(root, relative);
    if (fs.existsSync(p)) {
      safePath(p);
      fs.unlinkSync(p);
    }
  }
  const p = path.join(root, 'redactions.jsonl');
  if (!fs.existsSync(p)) writePrivate(p, '');
  append(p, {
    version: 1,
    at: new Date().toISOString(),
    runId: result.runId,
    reason: deletionRef ?? 'retention_expired',
    retained: 'receipt/admission/hash/unknown tombstones',
  });
  return { redacted: true, runId: result.runId };
}
if (direct(import.meta.url))
  main(async () => {
    const a = args(process.argv.slice(2));
    const allowed = [
      '_',
      'mode',
      'manifest',
      'hub-root',
      'out',
      'live',
      'approval',
      'operator-config',
      'trusted-key',
      'owner-ref',
      'credential-file',
      'budget-journal',
      'root',
      'registry-id',
      'scope-id',
      'purpose',
      'run',
      'deletion-ref',
      'namespace',
      'template',
    ];
    for (const key of Object.keys(a)) assert(allowed.includes(key), `unknown CLI option ${key}`);
    let result;
    if (a._[0] === 'prepare-fixture') {
      assert(!a.live && !a.approval && !a['operator-config'], 'offline fixture preparation only');
      const prepared = await prepare({
        hubRoot: a['hub-root'],
        template: a.template,
        output: a.manifest,
        keepAlive: true,
      });
      try {
        result = await runEvaluation({
          manifest: a.manifest,
          hubRoot: a['hub-root'],
          out: a.out,
          preparedAdapter: prepared.adapter,
          preparedIdentity: prepared.identity,
        });
      } finally {
        await prepared.adapter.close();
      }
    } else if (a._[0] === 'init-budget-registry')
      result = initializeRegistry({
        root: a.root,
        registryId: a['registry-id'],
        scopeId: a['scope-id'],
        ownerRef: a['owner-ref'],
        purpose: a.purpose,
      });
    else if (a._[0] === 'inspect') result = inspectRun(a.run);
    else if (a._[0] === 'redact') result = redactRun(a.run, a['deletion-ref']);
    else if (a._[0] === 'retire-namespace') {
      const config = loadConfig(a['operator-config']);
      const b = openBudget(config, { journalAssertion: a['budget-journal'] });
      try {
        result = b.retire(a.namespace);
      } finally {
        b.close();
      }
    } else {
      assert(a._.length === 0, 'unknown command');
      result = await runEvaluation({
        manifest: a.manifest,
        hubRoot: a['hub-root'],
        out: a.out,
        mode: a.mode,
        live: a.live === true,
        approval: a.approval,
        operatorConfig: a['operator-config'],
        trustedKey: a['trusted-key'],
        ownerRef: a['owner-ref'],
        credentialFile: a['credential-file'],
        budgetJournal: a['budget-journal'],
      });
    }
    console.log(canonical(result));
  });
