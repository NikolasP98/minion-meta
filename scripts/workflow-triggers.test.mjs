#!/usr/bin/env node
// Self-test for the default-branch-pinned trigger guard. Wired into CI through
// `pnpm run test:scripts` (node --test scripts/*.test.mjs).

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { DEFAULT_BRANCH_PINNED_EVENTS, WORKFLOW_DIR, parseTriggerEvents, scanWorkflows } from './workflow-triggers.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const guard = join(root, 'scripts/workflow-triggers.mjs');

test('parses the block-map form and ignores per-event options', () => {
  const events = parseTriggerEvents(['name: X', 'on:', '  push:', '    branches:', '      - main', '  pull_request:', '    types: [opened]', '', 'jobs:', '  a:'].join('\n'));
  assert.deepEqual(events, ['push', 'pull_request']);
});

test('parses the inline-sequence and single-scalar forms', () => {
  assert.deepEqual(parseTriggerEvents('on: [push, "issue_comment"]\n'), ['push', 'issue_comment']);
  assert.deepEqual(parseTriggerEvents('on: issues # interactive\n'), ['issues']);
});

test('tolerates a quoted key, comments, and blank lines inside the block', () => {
  const events = parseTriggerEvents(['"on":', '  # interactive entry point', '', '  issue_comment:', '    types: [created]', 'jobs:'].join('\n'));
  assert.deepEqual(events, ['issue_comment']);
});

test('reports no trigger when the document has no `on:` key', () => {
  assert.deepEqual(parseTriggerEvents('name: X\njobs:\n  a:\n'), []);
});

test('scanWorkflows flags exactly the default-branch-pinned events', () => {
  const dir = mkdtempSync(join(tmpdir(), 'workflow-triggers-'));
  try {
    writeFileSync(join(dir, 'clean.yml'), 'on:\n  pull_request_review:\n    types: [submitted]\n');
    writeFileSync(join(dir, 'noisy.yml'), 'on:\n  issue_comment:\n    types: [created]\n  push:\n  issues:\n    types: [opened]\n');
    writeFileSync(join(dir, 'notes.md'), 'on:\n  issue_comment:\n');
    assert.deepEqual(scanWorkflows(dir), [{ file: join(dir, 'noisy.yml'), events: ['issue_comment', 'issues'] }]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('every event in the pinned list is one GitHub attaches to the default branch', () => {
  // Documented + measured on minion-meta: issue_comment/issues runs carry
  // head_branch = main, pull_request_review* runs carry the PR head branch.
  assert.deepEqual(DEFAULT_BRANCH_PINNED_EVENTS, ['issue_comment', 'issues']);
});

test('no workflow in this repository pollutes the deploy branch', () => {
  const offenders = scanWorkflows(join(root, WORKFLOW_DIR));
  assert.deepEqual(offenders, [], offenders.map((o) => `${o.file}: ${o.events.join(', ')}`).join('\n'));
});

test('--check exits 1 and names the file when a workflow regresses', () => {
  const dir = mkdtempSync(join(tmpdir(), 'workflow-triggers-cli-'));
  try {
    mkdirSync(join(dir, WORKFLOW_DIR), { recursive: true });
    writeFileSync(join(dir, WORKFLOW_DIR, 'regressed.yml'), 'on:\n  issue_comment:\n    types: [created]\n');
    const run = spawnSync(process.execPath, [guard, '--check'], { cwd: dir, encoding: 'utf8' });
    assert.equal(run.status, 1);
    assert.match(run.stderr, /regressed\.yml: subscribes to default-branch-pinned trigger\(s\) issue_comment/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
