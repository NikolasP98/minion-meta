import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {
  resolveFixtureCombination,
  SUPPORTED_COMBINATIONS,
  UNSUPPORTED_COMBINATIONS,
} from './package-consumer-matrix.mjs';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');

test('fixture-only: every declared supported combination resolves', () => {
  for (const combo of SUPPORTED_COMBINATIONS) {
    assert.doesNotThrow(
      () => resolveFixtureCombination(repoRoot, combo),
      `${combo.pkgDir} -> ${combo.consumer} should resolve`,
    );
  }
});

test('fixture-only: every declared unsupported combination is rejected, not silently allowed', () => {
  for (const combo of UNSUPPORTED_COMBINATIONS) {
    assert.throws(
      () => resolveFixtureCombination(repoRoot, combo),
      /missing required peer/,
      `${combo.pkgDir} -> ${combo.consumer} should have been blocked`,
    );
  }
});

test('fixture-only: rejects an incomplete manifest (fixture dir absent)', () => {
  assert.throws(
    () =>
      resolveFixtureCombination(repoRoot, {
        pkgDir: 'packages/does-not-exist',
        consumer: 'nobody',
      }),
    /missing fixture consumer dir/,
  );
});

test('fixture-only: rejects a consumer manifest missing a required peer even when one unrelated dep is present', () => {
  // Regression guard for the exact bug this task exists to catch: a naive
  // "does the manifest declare *something*" check would pass here.
  assert.throws(
    () =>
      resolveFixtureCombination(repoRoot, {
        pkgDir: 'packages/crm-sdk',
        consumer: 'minion_hub_missing_peer',
      }),
    /postgres/,
  );
});
