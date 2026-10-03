---
id: 2026-10-03-readiness-reconcile-input-spec
title: Restore streamed reconciliation input and causal incident grouping
stage: dev
status: implementing
pass: 2
created: 2026-10-03
updated: 2026-10-03
repos: [minion-factory, minion-meta]
tags: [infra, logic, test]
type: fix
proposal: 2026-10-02-hub-gateway-production-readiness-recon
verdict: approved
---

# Restore reconciliation input

## 0. Product

OP-003 requires a working proposal reconciliation runner and causal incident grouping. The user selected this finding with all audit items. Source fixes and disposable execution fixtures are authorized; production promotion and backlog mutations remain distinct gates.

## 1. AS-IS

Factory main/dev 86254ea passes the complete catalog as one `claude -p "$(cat ...)"` argument. The current 605-row metadata catalog is 218441 bytes before the surrounding prompt. A local exec reproduction rejects that argument with E2BIG. The production run 20c1f539 stderr confirms `factory-reconcile.sh: line 669: /usr/local/bin/claude: Argument list too long`. The binary permissions hypothesis from the generated alert is not the cause demonstrated by this receipt. Merge-scan and Codex fallback also pass prompt files through command arguments. The unstick classifier has no deterministic reconcile-exec class, so each run enters the unmatched facilitator path and gets its own incident.

Factory's own current AGENTS.md and promotion workflow require feature PRs to dev, then workflow-owned promotion to main. The meta registry still declares development/PR base main; OP-002 also covers this drift.

## 2. TO-BE

Reconciliation and merge-scan pass exact prompt bytes through stdin, preserving tool permissions, budgets and output capture. The Codex fallback uses its documented stdin marker. One runtime-used helper records prompt byte count/digest without prompt text. A provider executable/version preflight fails before paid work when the CLI cannot start. Failure classification includes a safe cause class from stderr, never raw provider output.

Repeated reconcile exec failures group by repository/provider/cause, bypass paid diagnosis and do not auto-requeue before a repair. The old alert set is inventoried into a causal disposition manifest; source fixes alone do not close live incidents. Preserve other unstick remedies and operator-pause/lineage protections.

## 3. DELTA

### Slice 1: Streamed input and executable evidence

**Topics:** `infra`, `logic`, `test`

Add the helper to the existing baked reconcile-input library, wire the real reconciliation and merge-scan calls, and verify a prompt over 256KiB reaches a disposable executable byte-for-byte without occupying argv. Exercise missing/nonexecutable/preflight-failing binaries and preserve nonzero statuses. Pin the real callsites to the helper in addition to behavioral transport tests.

### Slice 2: Incident classification and guidance

**Topics:** `infra`, `logic`, `test`

Classify precise input-limit failures and historical reconcile exit126/zero-turn failures without retrying. Test repeated IDs produce the same causal incident fingerprint and no facilitator/requeue operation. Correct the canonical Factory branch registry from current repo instructions and regenerate projections.

## 4. Out-of-scope

No paid agent turn, automatic production push/release, live issue closure, secret inspection, or edits to original working checkouts. Human merge/promotion is the final release gate after review and qualification.

## 5. Verification

Run shell helper tests and actual unstick fixtures, relevant runner tests/typecheck, source instruction/policy checks and independent review. Preserve the red E2BIG and sanitized production stderr receipts. A controlled production reconcile that changes one genuine pending item remains post-release proof; an isolated fixture is not that receipt.
