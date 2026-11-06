import fs from 'node:fs';
import path from 'node:path';
import Ajv from 'ajv';
import {
  assert,
  object,
  string,
  hash,
  integer,
  one,
  digest,
  canonical,
  readJSON,
  safePath,
  writePrivate,
  args,
  direct,
  main,
} from './lib/common.mjs';
const ajv = new Ajv({ strict: true, allErrors: true });
const schemas = Object.fromEntries(
  ['episode', 'label', 'split'].map((name) => [
    name,
    ajv.compile(readJSON(path.join(import.meta.dirname, 'fixtures', `${name}.schema.json`))),
  ]),
);
function structural(name, value) {
  assert(schemas[name](value), `${name} schema: ${ajv.errorsText(schemas[name].errors)}`);
}
export const FAMILIES = [
  'informational_question',
  'lookup',
  'authorized_form_fill',
  'multi_intent_navigation',
  'off_page_discovery',
  'ui_choice',
  'artifact_callback',
  'short_continuation',
  'changed_page',
  'compacted_history',
  'tool_provider_failure',
  'cancel_scope_transition',
];
export function validateEpisode(e) {
  structural('episode', e);
  object(
    e,
    [
      'version',
      'episodeId',
      'clusterId',
      'leakageGroupId',
      'family',
      'locale',
      'provenance',
      'truth',
      'initialState',
      'permissions',
      'steps',
      'expectedReceipts',
      'expectedArtifacts',
      'terminal',
      'maxEffort',
      'consequential',
      'history',
    ],
    ['providerFixture'],
  );
  assert(e.version === 1, 'episode version');
  for (const k of ['episodeId', 'clusterId', 'leakageGroupId']) string(e[k]);
  one(e.family, FAMILIES);
  one(e.locale, ['en', 'es']);
  one(e.provenance, ['synthetic_software', 'source_backed']);
  object(e.truth, ['references', 'sha256']);
  assert(Array.isArray(e.truth.references) && e.truth.references.length, 'source truth references');
  e.truth.references.forEach(string);
  hash(e.truth.sha256);
  object(e.initialState, ['fixtureId', 'sha256', 'persona', 'org', 'surface', 'sandbox']);
  one(e.initialState.fixtureId, ['empty', 'one-element']);
  hash(e.initialState.sha256);
  one(e.initialState.persona, ['owner', 'reader']);
  string(e.initialState.org);
  one(e.initialState.surface, ['home', 'floating']);
  assert(typeof e.initialState.sandbox === 'boolean', 'sandbox marker');
  object(e.permissions, ['allowedTools', 'forbiddenTools', 'allowedActions', 'forbiddenActions']);
  for (const a of Object.values(e.permissions)) {
    assert(Array.isArray(a), 'permission matrix');
    a.forEach(string);
  }
  assert(
    !e.permissions.allowedTools.some((t) => e.permissions.forbiddenTools.includes(t)),
    'conflicting permissions',
  );
  assert(Array.isArray(e.steps) && e.steps.length, 'episode steps');
  for (const s of e.steps) {
    object(s, ['type', 'payload']);
    one(s.type, ['turn', 'transition', 'cancel']);
    assert(s.payload && typeof s.payload === 'object', 'step payload');
    if (s.type === 'turn') {
      object(s.payload, ['text'], ['origin']);
      string(s.payload.text);
      if (s.payload.origin !== undefined) one(s.payload.origin, ['user']);
    } else if (s.type === 'cancel') object(s.payload, []);
    else {
      const p = s.payload;
      const fields = {
        owner: ['actor', 'org'],
        page: ['page'],
        session: ['session'],
        release_reload: [],
        hold_reload: ['hold'],
        window_reload: [],
        duplicate_final: [],
        history_reload: [],
        compaction: [],
        registry_change: [],
        choice: ['index'],
        artifact: ['index'],
      };
      assert(Object.hasOwn(fields, p.action), 'unsupported fixture transition');
      object(
        p,
        ['action', ...fields[p.action]],
        p.action === 'release_reload' ? ['order', 'fail'] : [],
      );
      if (p.action === 'owner') {
        one(p.actor, ['a', 'b']);
        one(p.org, ['a', 'b']);
      }
      if (p.action === 'page') one(p.page, ['home', 'sandbox', 'crm']);
      if (p.action === 'session') one(p.session, ['main', 'other']);
      if (p.action === 'choice' || p.action === 'artifact') integer(p.index, 0, 31);
      if (p.action === 'hold_reload') assert(typeof p.hold === 'boolean', 'reload hold');
      if (p.order !== undefined) one(p.order, ['oldest', 'latest']);
      if (p.fail !== undefined) assert(typeof p.fail === 'boolean', 'reload failure flag');
    }
  }
  for (const k of ['expectedReceipts', 'expectedArtifacts']) {
    assert(Array.isArray(e[k]), `missing ${k}`);
    e[k].forEach(string);
  }
  object(e.terminal, ['criterion', 'expectedText', 'forbiddenSideEffects']);
  one(e.terminal.criterion, ['answer_contains', 'receipts', 'canceled']);
  if (e.terminal.criterion === 'answer_contains') string(e.terminal.expectedText);
  assert(
    e.terminal.expectedText === null || typeof e.terminal.expectedText === 'string',
    'terminal text',
  );
  assert(Array.isArray(e.terminal.forbiddenSideEffects), 'forbidden effects');
  object(e.maxEffort, ['calls', 'durationMs', 'steps']);
  Object.values(e.maxEffort).forEach((v) => integer(v, 1));
  assert(e.steps.length <= e.maxEffort.steps, 'episode exceeds step budget');
  assert(typeof e.consequential === 'boolean', 'consequential');
  assert(e.history === null || typeof e.history === 'object', 'history');
  if (e.family === 'compacted_history') {
    object(e.history, ['revision', 'compacted', 'sourceHash']);
    assert(e.history.compacted === true, 'compaction fixture');
    hash(e.history.sourceHash);
    string(e.history.revision);
  }
  if (e.providerFixture) {
    object(e.providerFixture, [], ['main', 'classifier']);
    for (const sequence of Object.values(e.providerFixture)) {
      assert(
        Array.isArray(sequence) && sequence.length && sequence.length <= 32,
        'bounded provider fixture sequence',
      );
      for (const result of sequence)
        assert(
          result && typeof result === 'object' && Buffer.byteLength(canonical(result)) <= 64000,
          'provider fixture bounds',
        );
    }
  }
  return e;
}
export function validateLabel(l, e) {
  structural('label', l);
  object(l, [
    'version',
    'labelId',
    'revision',
    'episodeId',
    'sourceSha256',
    'actorRef',
    'reviewerRef',
    'method',
    'rubricRevision',
    'outcome',
    'findings',
    'adjudicationRef',
    'adjudicatedAt',
    'supersedes',
    'blindToScreen',
  ]);
  assert(l.version === 1, 'label version');
  integer(l.revision, 1);
  for (const k of [
    'labelId',
    'episodeId',
    'actorRef',
    'reviewerRef',
    'rubricRevision',
    'adjudicationRef',
  ])
    string(l[k]);
  hash(l.sourceSha256);
  one(l.method, ['human_adjudicated', 'synthetic_software', 'unadjudicated']);
  one(l.outcome, ['success', 'incorrect', 'blocked', 'canceled', 'indeterminate']);
  assert(Array.isArray(l.findings), 'findings');
  assert(Number.isFinite(Date.parse(l.adjudicatedAt)), 'adjudication date');
  assert(l.supersedes === null || typeof l.supersedes === 'string', 'superseded label');
  assert(l.blindToScreen === true, 'independent blind label required');
  if (e) {
    assert(
      l.episodeId === e.episodeId && l.sourceSha256 === digest(e),
      'label source revision mismatch',
    );
    if (e.provenance === 'synthetic_software')
      assert(l.method !== 'human_adjudicated', 'synthetic cannot count as human truth');
  }
  if (l.method === 'human_adjudicated')
    assert(
      l.actorRef !== l.reviewerRef && l.adjudicationRef !== 'synthetic',
      'independent human provenance',
    );
  return l;
}
function relativeFile(root, p) {
  assert(
    typeof p === 'string' && !path.isAbsolute(p) && !p.split('/').includes('..'),
    'unapproved corpus path',
  );
  const absolute = path.join(root, p);
  safePath(absolute);
  return absolute;
}
export function loadSplit(root) {
  safePath(root, { directory: true });
  const split = readJSON(path.join(root, 'split.json'));
  structural('split', split);
  object(split, ['version', 'revision', 'entries']);
  assert(split.version === 1, 'split version');
  string(split.revision);
  assert(Array.isArray(split.entries), 'split entries');
  const ids = new Set(),
    groups = new Map(),
    content = new Map();
  for (const e of split.entries) {
    object(e, [
      'episodeId',
      'clusterId',
      'leakageGroupId',
      'contentSha256',
      'episodeSha256',
      'labelSha256',
      'split',
      'body',
      'labels',
    ]);
    for (const k of ['episodeId', 'clusterId', 'leakageGroupId']) string(e[k]);
    for (const k of ['contentSha256', 'episodeSha256', 'labelSha256']) hash(e[k]);
    one(e.split, ['development', 'holdout']);
    assert(!ids.has(e.episodeId), 'duplicate episode id');
    ids.add(e.episodeId);
    for (const [map, key] of [
      [groups, e.leakageGroupId],
      [groups, `cluster:${e.clusterId}`],
      [content, e.contentSha256],
    ]) {
      assert(!map.has(key) || map.get(key) === e.split, 'cross-split leakage');
      map.set(key, e.split);
    }
    // Check path syntax without stat/read: dev callers never touch holdout bodies/labels.
    for (const k of ['body', 'labels'])
      assert(
        typeof e[k] === 'string' &&
          !path.isAbsolute(e[k]) &&
          !e[k].split('/').includes('..') &&
          e[k].startsWith(`${e.split}/`),
        'split path mismatch',
      );
  }
  return split;
}
export function loadCorpus(
  root,
  { mode = 'development', splitSha256, unblinding, episodeIds } = {},
) {
  one(mode, ['development', 'holdout']);
  const split = loadSplit(root);
  if (splitSha256) assert(digest(split) === splitSha256, 'frozen split mismatch');
  if (mode === 'holdout') {
    assert(splitSha256 && unblinding, 'authorized unblinding required before body access');
    object(unblinding, ['splitSha256', 'operatorRef', 'authorizedAt', 'purpose', 'approvalRef']);
    assert(
      unblinding.splitSha256 === digest(split) && unblinding.purpose === 'holdout_evaluation',
      'unblinding mismatch',
    );
    string(unblinding.operatorRef);
    string(unblinding.approvalRef);
    assert(Number.isFinite(Date.parse(unblinding.authorizedAt)), 'unblinding date');
  }
  const selected = episodeIds ? new Set(episodeIds) : null;
  if (selected)
    for (const id of selected) {
      const e = split.entries.find((x) => x.episodeId === id);
      assert(e && e.split === mode, 'holdout or unknown episode refused before body access');
    }
  const episodes = [],
    labels = [];
  for (const index of split.entries.filter(
    (x) => x.split === mode && (!selected || selected.has(x.episodeId)),
  )) {
    const e = readJSON(relativeFile(root, index.body));
    assert(digest(e) === index.episodeSha256, 'episode hash mismatch');
    validateEpisode(e);
    for (const k of ['episodeId', 'clusterId', 'leakageGroupId'])
      assert(e[k] === index[k], 'split identity mismatch');
    assert(
      digest({ truth: e.truth, steps: e.steps }) === index.contentSha256,
      'content hash mismatch',
    );
    const raw = readJSON(relativeFile(root, index.labels));
    assert(digest(raw) === index.labelSha256 && Array.isArray(raw), 'label hash mismatch');
    let latest = null;
    const seen = new Set();
    for (const l of raw) {
      validateLabel(l, e);
      assert(!seen.has(l.labelId), 'duplicate label id');
      seen.add(l.labelId);
      if (latest)
        assert(
          l.revision === latest.revision + 1 && l.supersedes === latest.labelId,
          'append-only label correction',
        );
      else assert(l.revision === 1 && l.supersedes === null, 'initial label revision');
      latest = l;
    }
    episodes.push(e);
    if (latest) labels.push(latest);
  }
  return { split, episodes, labels };
}
export function readiness(corpora) {
  const counts = { development: 0, holdout: 0 },
    strata = {};
  let synthetic = 0,
    consequential = 0;
  for (const c of corpora)
    for (const e of c.episodes) {
      const label = c.labels.find((l) => l.episodeId === e.episodeId);
      if (e.provenance === 'synthetic_software') synthetic++;
      if (label?.method !== 'human_adjudicated' || label.sourceSha256 !== digest(e)) continue;
      const split = c.split.entries.find((x) => x.episodeId === e.episodeId).split;
      counts[split]++;
      if (e.consequential) consequential++;
      strata[`${e.family}:${e.locale}`] = (strata[`${e.family}:${e.locale}`] ?? 0) + 1;
    }
  const missingStrata = FAMILIES.flatMap((f) =>
    ['en', 'es'].filter((l) => !strata[`${f}:${l}`]).map((l) => `${f}:${l}`),
  );
  return {
    ready:
      counts.development >= 60 &&
      counts.holdout >= 240 &&
      consequential >= 40 &&
      !missingStrata.length,
    counts,
    synthetic,
    consequential,
    deficit: {
      development: Math.max(0, 60 - counts.development),
      holdout: Math.max(0, 240 - counts.holdout),
      consequential: Math.max(0, 40 - consequential),
    },
    strata,
    missingStrata,
    status: 'human_corpus_separate_governed_operation',
  };
}
export function importLabels(root, episodeId, incoming) {
  const c = loadCorpus(root);
  const e = c.episodes.find((x) => x.episodeId === episodeId);
  assert(e, 'development episode required');
  validateLabel(incoming, e);
  const index = c.split.entries.find((x) => x.episodeId === episodeId);
  const target = relativeFile(root, index.labels);
  const history = readJSON(target);
  const last = history.at(-1);
  assert(
    incoming.revision === (last?.revision ?? 0) + 1 &&
      incoming.supersedes === (last?.labelId ?? null),
    'correction must supersede',
  );
  const next = [...history, incoming];
  // Import produces a new revisioned artifact; it never rewrites the frozen split or labels.
  const output = `${target}.revision-${incoming.revision}.json`;
  writePrivate(output, next);
  return { output, sha256: digest(next), requiresNewSplitRevision: true };
}
if (direct(import.meta.url))
  main(async () => {
    const a = args(process.argv.slice(2));
    const root = path.resolve(a.input);
    const options = {
      mode: a.holdout ? 'holdout' : 'development',
      splitSha256: a['split-sha256'],
      unblinding: a.unblinding ? readJSON(a.unblinding) : undefined,
    };
    if (a._[0] === 'import')
      console.log(canonical(importLabels(root, a.episode, readJSON(a.label))));
    else {
      const c = loadCorpus(root, options);
      assert(['validate', 'readiness'].includes(a._[0]), 'corpus command');
      console.log(
        canonical(
          a._[0] === 'readiness'
            ? readiness([
                c,
                ...(a.holdout
                  ? [loadCorpus(root, { mode: 'development', splitSha256: options.splitSha256 })]
                  : []),
              ])
            : {
                valid: true,
                episodes: c.episodes.length,
                labels: c.labels.length,
                splitSha256: digest(c.split),
              },
        ),
      );
    }
  });
