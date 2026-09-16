---
phase: 11-agent-lifecycle
plan: "08"
verified: 2026-09-09T21:26:02Z
status: passed
scope: "11-08 configuration injection only; not Phase 11 or full AGT-05"
score: 3/3 child must-haves verified
gaps: []
---

# 11-08 configuration injection verification

The independently reviewed two-file correction passes the admitted child contract. An explicit environment supplies all fields; missing injected values cannot fall back to ambient values; calling without an argument still reads the current process environment. No source changes were made during this review.

Phase 11's goal is that an admitted agent run retains its approved definition, one owner and a recoverable outcome across harness lifecycle changes. This report qualifies only the configuration prerequisite. It does not close the roadmap's six success criteria or AGT-05's pinned real ACP harness requirement.

## Evidence and identity

Root branch observed: `feat/curated-engineering-skills`. No nearer Shells AGENTS/CLAUDE file was found. Reviewed root instructions, engineering review guidance, the actual loader/call site, original before-image, current tests, isolated runner and the existing handoff proposal. There was no previous 11-08 verification or summary at review time.

| Artifact | SHA-256 |
|---|---|
| Reviewed `11-08-PLAN.md` | `6d407abc70b4b6cc40cb0ef1d8dee65cd65b350e8caf991ec62c5b74851f7667` |
| Active and private `src/config.ts` | `6bdcac21d19481f6a3ad5e67eaf4e2b72fba86339ea9e87d339c3aced2b52609` |
| Active and private `src/config.test.ts` | `bf5f7e251b64ce78c386dfe33d7e6198a8bbb214043be38495b2ddd0f41e525f` |
| Original `config.ts.before` | `259fd6c263bc7c78c80b41227439f7a4dd204d863fda7ad8d66ac33af38e569a` |
| Private `run-config.mjs` | `06c1c448538f555ce3e24393376690a5ad9dfaee9c78ac0cf310f5b31712afa4` |
| Private `vitest.config.mjs` | `f5ff1df97b66da75941b992cee66933dbc93c8d11d6b0ae9261e32f10d7ad216` |
| Private `qc-network.mjs` | `9de6b8eca78f76c3eaf4ba92c12327a4aea6dd6d04f47411111fe666a744c06b` |
| Private `qc-types.json` | `131f8f23b167c3f72f4efcb5f2c4179c7e035c63a1b3527fe0aba4ffe119bfb9` |

Active paths are under `packages/shells-bridge/`; private paths are under `/tmp/minion-11-08-ic9duaz5/shells-bridge/`. Source/test hashes matched before and after independent execution. The parent `snapshot.json` records the original red source hash, not the final candidate; the before-image matches that entry. This historical receipt is not used as a final-source manifest.

## Goal-backward checks

| Child truth | Result | Source and runtime evidence |
|---|---|---|
| Every injected field uses the supplied environment | Verified | `config.ts:39` and `:47` receive the environment explicitly; `:75–87` pass it to every required/integer helper. The complete injected object wins against conflicting ambient strings and numbers. Frozen input is unchanged. |
| Default invocation reads current process environment | Verified | `config.ts:57` retains the default argument; the test changes ambient values between calls and observes both configurations. |
| Missing injected required values fail despite populated ambient values | Verified | Five parameterized required-field cases fail with the matching missing-field message. Missing injected command is also rejected. Optional integer defaults and malformed injected integer cases prevent ambient substitution. |

Both artifacts exist, contain substantive implementation/tests, and are wired. The tests import the real loader through `./config.js`; no helper or environment provider is mocked. `src/index.ts:23–36` imports and calls the real no-argument loader before constructing `Bridge`, and retains ConfigError handling. The loader returns actual supplied values, not hardcoded fixture output. Dynamic UI data-flow verification is not applicable to this utility.

The source diff changes only environment threading and explanatory comments. It preserves exported types/signature, validation order, required-string handling, `Number.parseInt` semantics, defaults, command splitting and all unrelated bridge behavior. No ambient access remains inside the helper functions. Direct environment access for command/workdir/backup already used the injected object and remains so.

## Independent execution

From `/tmp/minion-11-08-ic9duaz5/shells-bridge`:

```sh
env -i PATH=/usr/bin:/bin HOME=/tmp/minion-11-08-ic9duaz5 LANG=C.UTF-8 /usr/bin/node run-config.mjs
env -i PATH=/usr/bin:/bin HOME=/tmp/minion-11-08-ic9duaz5 LANG=C.UTF-8 /usr/bin/node node_modules/typescript/bin/tsc -p qc-types.json --noEmit
```

- Native Node `v22.23.2`, Vitest `2.1.9`: **10/10 passed, exit 0, 315ms**, no skipped cases or unhandled errors (output `6f0bfc`, runner time `16:25:29`). Each test asserted zero native socket attempts. Synthetic ambient changes are restored with `vi.unstubAllEnvs()` after each case.
- Focused TypeScript `5.9.3`: **exit 0**, no diagnostics (session `54359`, completion `d193e7`). The config selects exactly the two source/test files, disables emission/incremental/composite, and inherits strict/noUncheckedIndexedAccess settings. Dependency declaration checking remains excluded by the existing `skipLibCheck:true`; this is not a full bridge typecheck.
- Root's saved red log was inspected, not independently rerun. It records eight failures and two controls, matching the original helper's ambient reads. Log SHA: `772137f6627de8a30abf20fd711c3e5630b8eff90488333683d10cdbd85addda`.

The reviewed runner asserts effective cacheDir before test collection: `/tmp/minion-11-08-ic9duaz5/shells-bridge/private-cache`. This directory and temporary `.vite`/`.vite-temp` entries are actual private directories, not links into active package caches. The results file remained private; `.vite` and `.vite-temp` were empty after execution. The runner emits a Vitest 2 cache.dir deprecation warning; it does not change the observed private cache destination. No application env files, harness, provider, database, network service or broad test suite were used.

## Standards, scope and remaining work

**Standards:** pass for this correction. The real public loader is exercised, source mutation is prevented by a frozen-input case, ambient test mutations restore, and the change remains within two admitted files. No stubs or new boundary bypasses were found. Root's lint result is author evidence; independent acceptance here rests on source review, the focused native run and strict source check.

**Spec:** pass for all three child truths. No additional regression case is required to establish this small environment-source correction. Blank optional strings, partial integer strings, numeric ranges and quoted command grammar retain their prior semantics; this report does not certify those policies.

AGT-05 remains open: these tests do not initialize or invoke an ACP harness, exercise permission/cancel handling, validate an image, or establish deployed systemd environment behavior. Other Phase 11 roadmap criteria (definition snapshots, paid-test exclusion/deadlines, session correlation, durable outcomes and governance identities) are outside this child and receive no new closure claim.

The exact command-split site at `config.ts:64–67` carries `TODO(handoff)` for structured argv and actual provisioned systemd environment evidence. The paired proposal exists at `proposals/2026-09-08-platform-qc-remediation.md:284`. Those are existing, explicitly excluded follow-ups, not hidden passing guarantees. There are no unresolved blockers within the admitted injection contract and no human verification needed for that contract alone. Full phase acceptance remains pending its other implementation and runtime evidence.

_Independent verifier: /root/gsd_drone_verifier. No commit or source edit._
