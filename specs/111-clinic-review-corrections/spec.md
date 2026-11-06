---
status: implemented
verdict: pass
---

# Clinic branch retained-history review corrections

This compressed Spec Kit hotfix covers the four explicitly selected review
findings in the active gate run. Separate proposal, clarification and two-pass
spec review are bypassed because the user assigned these bounded fixes directly.
The outer executor owns all delivery phases beyond this review.

## AS-IS

- `scripts/ranking-index.mjs:69` deletes deployment scores using batch membership;
  `pending` emits only candidates that need scoring.
- `packages/shared/src/gateway/client.ts:150` fences the replaced socket's close
  callback without clearing its session payload limit.
- `scripts/qc/package-consumer-matrix.mjs:136` installs an unchecked second pack
  while reporting the first pack's digest.
- `packages/ui/src/lib/primitives.test.ts:165` checks source strings instead of
  executing the public components.

## TO-BE

Batch application preserves unchanged deployment rankings. Only full-catalog
deployment membership may retire them. Each connection starts without a prior
session's payload policy and enforces its newly negotiated policy. Consumer
qualification rejects mismatched repacks before installation and cleans its
scratch archives. Token conformance inspects emitted HTML from compiled public
components across their styling variants against the generated CSS contract.

## DELTA and proof

1. Carry authoritative deployment membership separately from scoring candidates;
   execute pending/apply with unchanged, changed and removed deployments, an
   empty pending batch, and a legacy batch without authoritative metadata.
2. Reset payload policy at connection start; exercise replacement handshakes
   larger than the old limit, then requests against the new policy on both
   Node and browser socket event adapters.
3. Compare the install archive digest with recorded provenance; qualify an
   unchanged synthetic package and reject one changing during its second pack.
4. Render a Svelte consumer importing the public primitives and validate emitted
   token references against the generated shared CSS contract.

Apply all changes before one focused verification round. Preserve Clinic token
values, generated artifacts, prior themes and all unrelated retained fixes.

## Focused verification

One post-fix round passed on 2026-11-03:

- `node --test scripts/ranking-index.test.mjs scripts/qc/package-consumer-matrix.test.mjs`:
  8 tests passed, including real local archive installation/import and rejection
  of differing repack bytes. Synthetic packages have no Git revision, so the
  existing provenance helper prints harmless Git diagnostics for those fixtures.
- `pnpm --filter @minion-stack/shared exec vitest run src/gateway/client.test.ts --maxWorkers=2 --minWorkers=1`:
  95 tests passed, including replacement policies on both socket adapters.
- `pnpm --filter @minion-stack/ui exec vitest run src/lib/primitives.test.ts --maxWorkers=2 --minWorkers=1`:
  26 tests passed, including compiled public-component token conformance.

Standards review: source edits remain within the four selected boundaries;
regressions exercise CLI output, transport behavior, archive consumers and
rendered component output. Spec review: all four selected findings are addressed;
Clinic token values and generated theme artifacts were unchanged. This review
does not claim browser, hosted CI, full-suite or release verification.
