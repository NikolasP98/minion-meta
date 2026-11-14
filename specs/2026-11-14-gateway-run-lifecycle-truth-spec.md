---
id: 2026-11-14-gateway-run-lifecycle-truth-spec
title: A run reports its real outcome (no false restart apology, no error for a retried run)
stage: spec
status: review
pass: 1
created: 2026-11-14
updated: 2026-11-14
repos: [minion]
type: fix
tags: [logic, test]
---

# A run reports its real outcome

Board stub. The Spec Kit artifacts are the source of truth:
[`specs/119-gateway-run-lifecycle-truth/`](119-gateway-run-lifecycle-truth/spec.md).
No proposal preceded this spec: both items come from the audit the owner requested on
2026-11-11 and were added to scope by the owner on 2026-11-14.

## 0. Product

A customer is told "my server restarted" only when their message was really being answered
when the gateway stopped, and a person chatting sees the answer when a retry succeeds, with an
error only when the run really failed.

## 1. AS-IS, TO-BE, DELTA

See `119-gateway-run-lifecycle-truth/spec.md` (rows A1–A10 at gateway `533616ce95a`; confirmed
by code reading, not reproduced live).

## 2. Slices

### Slice 1 — no restart apology for turns that already ended
**Topics:** `logic`, `test`

### Slice 2 — a retried run ends once with its real result
**Topics:** `logic`, `test`

## 3. Out of scope

The privacy finding (spec 117), every other gateway audit item, the apology's wording and
language.

## 4. Verification

Named vitest files and `test/ci` (never the full suite), then on the dev gateway: failing and
fallback turns followed by a restart send no apology; a forced first-attempt failure in web
chat shows the answer and no error.
