---
phase: 20-integration-reaudit
plan: "01"
requirements: ["QC-01"]
requirements-completed: []
status: partial
snapshot: /home/nikolas/.cache/claude-tmp/20-01-6fbd0b8f
owned_files:
  - path: scripts/qc/release-evidence.mjs
    before: 4ccdb73e8661219ad09f0cc1764e2d653c7e07e564a9ff90c50e2b6432a23e39
    after: 4ccdb73e8661219ad09f0cc1764e2d653c7e07e564a9ff90c50e2b6432a23e39
  - path: scripts/qc/release-evidence.test.mjs
    before: 361ede63e0c3f1a4968b16b87a566d5b9c13a8926445e462cf73ed6c97fd1cae
    after: 361ede63e0c3f1a4968b16b87a566d5b9c13a8926445e462cf73ed6c97fd1cae
  - path: .planning/phases/20-integration-reaudit/20-CANDIDATES.md
    before: 0f618e84d1a2b4b7a8186b8e459e37ed92ea04379454cffb7304004f7a0db893
    after: 61ef4ab461522f0a566e6e9ba236b12470c76a1bd3d463400f37c82d3e7edf91
  - path: scripts/qc/integration-matrix.mjs
    before: absent
    after: 2810ce9f7abaabb49a606e789edee91e0a349584000e416a56a62e63f7a29f88
  - path: scripts/qc/integration-matrix.test.mjs
    before: absent
    after: 99cc002eb0abfefe4d548401a9f5f0546108cd7c40d7a6c344b6a8eadbeba1bf
  - path: .planning/phases/20-integration-reaudit/20-INTEGRATION-VERIFICATION.md
    before: absent
    after: 663215192aaeda411e699838fb4199a2d04c6a3d691805b9071956a9341c1506
---

# 20-01: exact candidate packet tooling + integration matrix

Continuation of the rate-limited attempt: its snapshot `/home/nikolas/.cache/claude-tmp/20-01-6fbd0b8f` was inspected and found sound (runner + 7 unit cases, manifest generator, gate logs), so work resumed there instead of starting fresh. All owned edits live only in the snapshot's meta worktree (`.../20-01-6fbd0b8f/MINION`, detached at checkpoint `38699809`); nothing was committed, staged, pushed, merged, deployed, or installed into an active checkout. Root owns adoption.

## Task 1 (previously admitted; unchanged this round)

`release-evidence.mjs` / `.test.mjs` untouched (hashes above). Independent rerun on the snapshot with an empty environment: `node --test scripts/qc/release-evidence.test.mjs` → 37 tests, 37 pass, 0 fail, 0 skipped, exit 0 (`checks/release-evidence-unit-2.log`).

## Task 2: integration runner and matrix

`scripts/qc/integration-matrix.mjs` (227 lines) runs a fixed per-repository command registry (bun/pnpm/node argv; `$JSON` = runner-owned report path) against detached candidate checkouts: manifest parse rejects unknown fields, unknown gates, unscoped/unsafe test paths, env or command fields; identity = independent Git top-level + exact HEAD + clean tracked tree + every manifest file SHA-256, verified before and after the gates; counts read from vitest JSON / node TAP; a skipped case, zero count, non-zero exit, missing report or missing test path can never be `passed`; unrun/blocked gates and `no-checkout` candidates keep the verdict at `incomplete`; `releaseAuthorized` is always false. Changes over the partial: Hub gates get the three synthetic `PUBLIC_*` values the Hub CI workflow sets (registry-fixed, not manifest-supplied); meta registry gains `build-all` and `lint-all` (CI order); gateway registry gains `plugin-ui-bridge-build`; post-run identity distinguishes unrelated tracked drift written by an install gate (recorded as `postRunDrift`, verdict unaffected) from HEAD/owned-file drift (`invalid`).

`integration-matrix.test.mjs`: 9 cases (`checks/matrix-unit-4.log`, final source): 9 pass, 0 fail, 0 skipped, exit 0. Covers markdown block extraction, rejection matrix (commands, env, unsafe paths, bad identities), real counts on a disposable Git fixture, failed/skipped/zero/non-zero-exit never complete, head/dirty/file-drift/nested-root invalid, no-checkout/unselected/missing-path unrun-or-blocked, vitest/TAP count parsing, post-run drift semantics, registry-fixed env with an ambient secret proven absent from gate processes.

`20-CANDIDATES.md` now embeds the exact manifest (13 candidates, all read from local Git objects; hub #254 dropped as closed duplicate; gateway `03239087` = #281+#283; meta `a018d672` = #379+#381+#387; site `0ed4e1b`). `--validate-manifest` on the document: valid, exit 0 (`checks/validate-manifest-3.log`).

`20-INTEGRATION-VERIFICATION.md` records the full run and reruns. Full run (`checks/matrix-full`, 17:25–18:17 UTC, 2-CPU host, empty env): 13/13 identities verified; 84 gates, 81 passed, 3 failed, verdict `incomplete`, exit 1. Failed gates, each with the exact case and a rerun through the same runner: hub-247 vitest (PGlite `beforeAll` 15 s hook timeout under load → 20 skipped; rerun 129/129, exit 0); hub-248 vitest (1 case at 5110 ms vs 5000 ms default `testTimeout`; rerun 186/186, exit 0); hub-252 vitest (23 sibling-gated skips; after building gateway `03239087`'s `plugin-ui-bridge` via the registry gate and linking it as the sibling, rerun 53/53, exit 0). Passing gates: Hub `check` 10/10 with 0 svelte-check errors, `lint:design`/`lint:tokens` 10/10, named vitest paths (129, 186, 4, 25, 23, 53, 36, 110, 27); gateway install/rebuild/baml/check + `test/ci/` 101/101; site check/lint/vitest 60/60; meta build-all/node-test 15/typecheck-all/lint-all/test-all all exit 0.

## Deviations

- Meta base is checkpoint `38699809` (`origin/qc/360-checkpoint-20260911`, also the main checkout's HEAD), not `origin/dev`: `origin/dev` lacks `scripts/qc/release-evidence.mjs` and the `.planning/phases/20-*` directory, so the plan's owned files do not exist on dev.
- Candidate worktrees were created under the snapshot from the local Hub, gateway, Site and meta repositories (read-only against them; `git worktree add --detach`). The 11 read-only `~/.cache/claude-tmp/hub-*` worktrees were only read for heads.
- The manifest generator (`checks/gen-manifest.mjs`) is a snapshot-side script, not an owned file; the manifest itself is in the owned document.
- `origin/DEV` (gateway → `e499c3f5`, #285) and `origin/dev` (meta → `026afe8a`) moved while this ran; candidates stay pinned and the manifest records the later observations.
- The first rerun against the gateway checkout was refused (`dirty-checkout`) because its install gate rewrote 20 tracked pnpm shims; they were restored to committed bytes in the private worktree before rerunning.

## Gaps and blocked items

- Browser journeys, real-PostgreSQL race tests (only embedded PGlite ran; docker inactive, no local Postgres), runtime drills, image/container evidence and ACP-with-credentials were not executed here; they stay with 17-x/19-x/11-x and need an operator (docker enable) or credential/authority decisions.
- Hub vitest gates cover changed test paths, not whole suites; whole-suite CI per PR is on GitHub. ui-audit baseline re-pins remain merge-time steps.
- Repair options recorded, not applied (outside owned files): explicit `hookTimeout` on `assistant-principal.pg.test.ts` (09-x owner); per-case timeout on the UTF-16 capacity `it.each` in `job-effect-pages.service.test.ts` (10-x owner); gateway should stop tracking `extensions/*/ui/node_modules/.bin/*` shims. No `proposals/` file was written because `proposals/` is not in this plan's `files_modified`; root should file these three.
- QC-01 is not closed: the packet policy, receipts and mandatory runtime/policy gates in `20-CANDIDATES.md` remain root-selected and pending.
