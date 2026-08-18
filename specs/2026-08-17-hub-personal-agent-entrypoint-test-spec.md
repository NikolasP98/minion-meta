---
id: 2026-08-17-hub-personal-agent-entrypoint-test-spec
title: "Direct unit tests for loadPersonalAgentForUser — cover the 401 guard and delegation path"
stage: spec
status: approved
pass: 2
created: 2026-08-17
updated: 2026-08-18
proposal: 2026-08-17-hub-personal-agent-entrypoint-test
verdict: approved
repos: [minion_hub]
tags: [test]
type: fix
---

# Direct unit tests for `loadPersonalAgentForUser`

**Owner surface:** `minion_hub`, specifically the service module containing
`loadPersonalAgentForUser` and its direct unit-test suite. Exact paths and symbols must be confirmed
in Slice 0 because `minion_hub/` is not present in this meta-repo checkout.

**Design ancestors:**
[`2026-05-20-my-agent-homepage`](2026-05-20-my-agent-homepage.md),
[`2026-05-26-auth-token-simplification`](2026-05-26-auth-token-simplification.md) §2.1,
[`hub-erp-roadmap/P4.1-brains-consolidation`](hub-erp-roadmap/P4.1-brains-consolidation.md), and
[`2026-08-13-agentic-sdlc-test-quality-gates-spec`](2026-08-13-agentic-sdlc-test-quality-gates-spec.md)
§S6/§S7.

**Gate convention:** this is a `test` slice, so
[`2026-08-17-sdlc-phase-gates-scoring-spec`](2026-08-17-sdlc-phase-gates-scoring-spec.md) §4b
requires a mutation spot-check. No UI file is in scope.

## 0. Product contract

The approved proposal requires direct tests for two behaviors:

1. missing tenant context rejects with HTTP status 401; and
2. valid context delegates successfully and returns the delegate result.

The tests must call the shipped `loadPersonalAgentForUser` implementation, not a caller-side stub
or copied implementation. Refactoring or changing runtime behavior is out of scope.

## 1. Slice 0 — mandatory recon

Before editing, read `minion_hub/CLAUDE.md` in full as required by root `AGENTS.md`, then verify:

- the current base branch and working-tree state without switching branches or touching stash;
- the service and existing test-file paths;
- whether `loadPersonalAgentForUser` is exported;
- its exact parameters, missing-context predicate, 401 mechanism, dynamic-import specifier, delegate,
  delegate arguments, and return behavior;
- whether the direct suite self-mocks the service module;
- the existing mock/reset conventions and the command that runs one test file.

Suggested read-only commands from `minion_hub/`:

```bash
git status --short --branch
git branch -r
rg -n 'loadPersonalAgentForUser' src --glob '*.ts'
rg -n -B8 -A60 'loadPersonalAgentForUser' src/server/services/personal-agent.service.ts
rg -n 'vi\.(mock|doMock)|mockResolvedValue|mock-db|mockDb' src/server/services --glob '*.test.ts'
rg -n "vi\.mock\(.*personal-agent" src --glob '*.ts'
cat package.json | rg -n '"(test|check)"'
```

Run the confirmed single-file test command before editing and record it for the PR. The proposal's
`bun run test personal-agent.service.test.ts` is a requirement to validate, not an assumed script
contract.

If the function is not exported or cannot be imported without a runtime refactor, stop and request
a human scope decision. Do not add an export or dependency-injection seam under this test-only spec.
If the existing direct suite self-mocks the subject module, create a sibling direct-test file with
no self-mock; do not rewrite unrelated existing tests merely to host these cases.

## 2. S1 — direct tests for the two proposal paths

**Tags:** `test` · **Estimate:** 4–6 h

Add one direct suite, normally to the existing service test file. Use a sibling
`personal-agent.service.entrypoint.test.ts` only when Slice 0 establishes that the existing suite
self-mocks the subject.

### Test requirements

- Mock the dynamically imported dependency using the exact source specifier. Follow the suite's
  existing Vitest isolation/reset pattern so module state and call counts cannot leak between cases.
- Import and call the real `loadPersonalAgentForUser` export.
- **Missing-context case:** construct the smallest valid input whose tenant context is absent,
  matching the verified predicate. Assert rejection with `{ status: 401 }` and assert the delegate
  was not called.
- **Happy case:** provide the smallest valid input with tenant context and the required user data.
  Configure the delegate to return a distinctive sentinel. Assert that the entry point returns the
  sentinel unchanged and that the delegate was called exactly once with every argument that the
  entry point is responsible for supplying.
- Prevent real external effects. Mock the delegate before invocation. If the current test harness
  spies on `fetch`, assert zero calls; otherwise the delegate call assertion and a passing isolated
  unit run are the required evidence. Do not add a global fetch mock solely for this spec.

Tests for other branches, changes to caller-side black-box tests, runtime behavior changes, and new
test infrastructure are out of scope.

### Files

All paths are relative to `minion_hub/` and must be reconciled with Slice 0:

| File | Change |
|---|---|
| `src/server/services/personal-agent.service.test.ts` | Add the two direct cases when it does not self-mock the subject |
| `src/server/services/personal-agent.service.entrypoint.test.ts` | Alternative test file only when the existing suite self-mocks the subject |

Exactly one of those test-file alternatives is edited. No runtime source, caller test, UI, schema,
migration, package, or configuration file is changed.

### Definition of done

1. The confirmed single-file command passes both new cases.
2. The full hub test command passes with no new skips.
3. `bun run check` passes with no new errors or warnings.
4. Mutation spot-checks are performed one at a time using temporary, manually reverted edits:
   - invert the verified missing-context predicate; the 401 test fails;
   - alter one verified delegate argument; the happy-path test fails on its argument assertion.
5. After each mutation is manually reverted,
   `git diff --exit-code -- src/server/services/personal-agent.service.ts` confirms no source diff
   remains. Do not use
   `git checkout`, `git restore`, stash, or branch switching to perform the revert.
6. The final diff contains exactly one of the two test files listed above and no other file.

The PR records the confirmed test command and concise failure evidence from both mutations; it does
not need to paste full command transcripts.

## 3. Cross-project impact

No root `AGENTS.md` cross-project impact zone is activated because the final diff is test-only and
does not change the gateway protocol, channel extensions, database schema, agent-definition format,
auth configuration, workshop canvas, pixel office, or Paperclip adapters. `minion_site`, `minion/`,
shared packages, and other subprojects require no change.

## 4. Collision and handoff rules

`2026-08-13-agentic-sdlc-test-quality-gates-spec` §S6 separately proposes edits to
`personal-agent.service.test.ts`. Before implementation, inspect the current file and coordinate any
overlap; do not absorb §S6's assertion rewrite into this task.

If implementation stops with any known open end, follow root `AGENTS.md`: add a
`TODO(handoff):` at the exact affected code site and a matching proposal in the meta-repo. That
exception necessarily expands the final diff and therefore blocks this spec's Definition of Done
until the open end is resolved or separately authorized.

## 5. Out of scope

- Refactoring, exporting, or otherwise changing `loadPersonalAgentForUser`.
- Characterizing branches beyond the two named by the proposal.
- Fixing behavior discovered by the tests.
- Editing or annotating caller-side black-box stubs.
- Test-integrity infrastructure, mutation tooling, UI/E2E/browser verification, or manual page QA.
- Provisioning-pipeline changes, gateway calls, schema changes, and auth changes.

## 6. End-to-end verification

From `minion_hub/`, run the Slice-0-confirmed equivalents of:

```bash
bun run test src/server/services/personal-agent.service.test.ts
bun run vitest run
bun run check
git diff --exit-code -- src/server/services/personal-agent.service.ts
git diff --name-only
```

If the sibling suite was required, substitute its path in the focused command. The final
`git diff --name-only` output must contain only that one test file.
