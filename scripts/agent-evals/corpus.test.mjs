import test from 'node:test';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { temp, corpus, episode, label } from './fixtures/helpers.mjs';
import { validateEpisode, validateLabel, loadCorpus, readiness, importLabels } from './corpus.mjs';
import { readJSON, writePrivate, digest } from './lib/common.mjs';
test('episode truth/permissions/receipt/terminal/effort boundaries', () => {
  for (const key of ['truth', 'permissions', 'expectedReceipts', 'terminal', 'maxEffort']) {
    const e = episode();
    delete e[key];
    assert.throws(() => validateEpisode(e), new RegExp(key));
  }
});
test('bilingual/compacted synthetic examples validate but never count toward human readiness', () => {
  const root = path.join(temp(), 'corpus');
  corpus(root, [episode(), episode('e2', 'es', 'compacted_history')]);
  const c = loadCorpus(root);
  assert.equal(c.episodes.length, 2);
  const r = readiness([c]);
  assert.equal(r.synthetic, 2);
  assert.equal(r.counts.development, 0);
  assert.equal(r.ready, false);
  const l = label(c.episodes[0]);
  l.method = 'human_adjudicated';
  assert.throws(() => validateLabel(l, c.episodes[0]), /synthetic/);
});
test('development cannot read holdout body/labels even when nonexistent or malicious', () => {
  const root = path.join(temp(), 'corpus');
  const split = corpus(root, [episode()], [episode('hidden', 'es')]);
  fs.unlinkSync(path.join(root, 'holdout/hidden.json'));
  assert.equal(loadCorpus(root).episodes.length, 1);
  assert.throws(() => loadCorpus(root, { episodeIds: ['hidden'] }), /before body access/);
  assert.throws(
    () => loadCorpus(root, { mode: 'holdout', splitSha256: digest(split) }),
    /unblinding/,
  );
});
test('duplicate/leakage/content split rejects before holdout load', () => {
  for (const field of ['episodeId', 'clusterId', 'leakageGroupId', 'contentSha256']) {
    const root = path.join(temp(), 'corpus');
    const split = corpus(root, [episode()], [episode('hidden')]);
    split.entries[1][field] = split.entries[0][field];
    writePrivate(path.join(root, 'split.json'), split, false);
    assert.throws(() => loadCorpus(root), /duplicate|leakage/);
  }
});
test('label correction produces new artifact and cannot rewrite frozen revisions', () => {
  const root = path.join(temp(), 'corpus');
  corpus(root);
  const c = loadCorpus(root),
    l = {
      ...c.labels[0],
      labelId: 'corrected',
      revision: 2,
      supersedes: c.labels[0].labelId,
      outcome: 'incorrect',
    };
  const result = importLabels(root, 'e1', l);
  assert.equal(readJSON(result.output).length, 2);
  assert.equal(loadCorpus(root).labels[0].revision, 1);
  assert.throws(() => importLabels(root, 'e1', { ...l, supersedes: null }), /supersede/);
});

test('authorized holdout readiness CLI can assess both splits without fabricating a governed corpus', () => {
  const root = path.join(temp(), 'corpus'),
    dev = episode('development-example'),
    held = episode('heldout-example', 'es');
  dev.provenance = 'source_backed';
  held.provenance = 'source_backed';
  const split = corpus(root, [dev], [held]);
  for (const entry of split.entries) {
    const labels = readJSON(path.join(root, entry.labels));
    labels[0].method = 'human_adjudicated';
    labels[0].adjudicationRef = 'test-only-mock-provenance-not-an-actual-corpus';
    writePrivate(path.join(root, entry.labels), labels, false);
    entry.labelSha256 = digest(labels);
  }
  writePrivate(path.join(root, 'split.json'), split, false);
  const unblinding = path.join(root, 'unblinding.json');
  writePrivate(unblinding, {
    splitSha256: digest(split),
    operatorRef: 'test-owner',
    authorizedAt: '2026-10-23T00:00:00Z',
    purpose: 'holdout_evaluation',
    approvalRef: 'test-only-unblinding',
  });
  const r = spawnSync(
    process.execPath,
    [
      path.join(import.meta.dirname, 'corpus.mjs'),
      'readiness',
      '--input',
      root,
      '--holdout',
      '--split-sha256',
      digest(split),
      '--unblinding',
      unblinding,
    ],
    { encoding: 'utf8' },
  );
  assert.equal(r.status, 0, r.stderr);
  const result = JSON.parse(r.stdout);
  assert.equal(result.counts.development, 1);
  assert.equal(result.counts.holdout, 1);
  assert.equal(result.ready, false);
});
