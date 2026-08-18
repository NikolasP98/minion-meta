---
spec: 2026-08-18-factory-orchestration-tests-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-18
---

# Pass 2 correctness review

## Changes made

- Updated pass/status/verdict frontmatter and retitled the spec around Node 22's built-in test runner, because an approved pass-2 spec must not retain draft status and the proposal permits `node:test` alongside two approved sibling specs already standardizing on it.
- Rebased the factual baseline from `minion-factory/main` at `82868d7e03`/02:23 to `fc9c8ffa71`/02:51, because the newer commit retired double-PASS and tightened merge evidence after pass 1 was authored.
- Replaced the obsolete automerge `doublePassed` gate with the live low-stakes-only tag policy, because implementing the old matrix would reintroduce retired behavior.
- Changed check-run expectations to require every check to be completed/successful, because current `main` rejects neutral/skipped/stale/null and success-plus-neutral rather than accepting any success without a BAD conclusion.
- Added degraded-review ineligibility to the automerge matrix, because current runtime policy checks `[review-degraded` before fetching the PR and pass 1 omitted it.
- Made contradictory tags a real `['test','security']` input instead of an unreachable synthetic `{lowStakes:true, highStakes:true}` flag combination, because the DoD asks for tag-policy behavior rather than an impossible internal state.
- Added `headSha` to `recordFinish` extraction and tests, because pass 1's result type would have dropped the live review-attestation field.
- Added `spec_sha` and `spec_tags` to both requeue extractions and assertions, because current `main` already preserves those immutable snapshots and pass 1 described them only as future sibling work.
- Corrected `requeueRun` from “DB only” to SQLite plus temporary-filesystem behavior and required a byte-for-byte `spec.md` copy test, because the existing route performs that file copy and cannot be moved verbatim into a DB-only function.
- Replaced Vitest configuration/dependency work with one `node --import tsx --test src/*.test.ts` script, avoiding a redundant framework and keeping approved sibling tests discoverable through the same command.
- Added mandatory temp environment setup before every dynamic import of DB-bound runner modules, because importing the supposedly pure exports still opens/migrates SQLite at module load.
- Fixed the whitespace-collapse fixture to have raw length at least 20 but collapsed length 2, because pass 1's example sentence remained over 20 characters after collapsing and could not prove check ordering.
- Removed the assertion that `infra` proposals are auto-approval eligible, because that pins an acknowledged inconsistency already owned by the approved WorkItem risk-unification spec rather than the proposal's required security/data cases.
- Added collision handling for the approved chat-recovery and provider-harness test specs, because both touch `runner/package.json`/`repos.ts` and independently introduce `npm test`.
- Added the mounted `FACTORY_REPOS_FILE` parity check, because `/data/repos.json` replaces built-ins wholesale and otherwise makes the claimed `repos.ts` fleet gate unverifiable.
- Added `actionlint` to Slice 5 and final acceptance, because the cited phase-gates spec requires workflow lint for `infra` work and YAML parsing alone does not validate Actions semantics.
- Bound operator CI proof to `--workflow ci.yml --commit <main HEAD>`, because branch-only `gh run list` can return an unrelated or stale successful run and is insufficient for the release gate.
- Replaced pass 1's generic behavior-preservation assertion with explicit preservation checks for `head_sha`, `spec_sha`, `spec_tags`, queue side effects, and route status mapping, making the definition of done verifiable against current runtime invariants.
- Cited `/memory/MINION/sdlc-board-triage-and-phase-gates.md` for the hard double-PASS retirement constraint and `/memory/MINION/test-suite-recon-2026-08-10.md` for the requirement that CI actually execute; the requested read-only FTS searches produced no more specific factory observation.

## Human flags

None. The proposal already authorizes either Vitest or `node:test`, and the live-code/collision evidence resolves the harness and policy corrections without a new product decision.
