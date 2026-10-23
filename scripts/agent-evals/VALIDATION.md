# F software checkpoint — 2026-10-23

This historical revision-0 checkpoint is superseded for runtime corrections by [CORRECTIONS-REVISION-3.md](CORRECTIONS-REVISION-3.md). Its full root gate results apply to revision 0; current full root gates and final A integration remain parent-managed. Revision 3 records the committed C source binding and current C integration separately.

This is a development checkpoint, not a completion, paid-evaluation, promotion or release receipt. Parent owns commits, review archives, acceptance ledger, spec/task status, PR and final integration pins.

## Source and environment

- Meta development base: `f2e949f046bc3865ea56ccf4def8d1ad826d5317`, branch `feature/agent-harness-f-evals`, registry PR base `dev` verified with `node scripts/repo-policy.mjs show minion-meta`.
- Node `v22.23.3`; declared/resolved pnpm `10.15.0`. Frozen dependency installation was supplied by parent. `pnpm-lock.yaml` remains `15cbb75ffccdb3aa06ec97b776f3ed9bc0ff1ff68c10b1718741b32ea855f75a`.
- Both SDD reviews approved before code at parent revision `8d0dffc1`; actual reviewed F contracts were read. No source commit, staging, push, merge, production credential discovery or paid request performed by F developer.
- Runtime manifests now additionally freeze the exact meta `.mjs`/schema tree hash and actual A transitive source inventory hash. The final A and C reviewed commit pins remain parent-managed dependencies.

## Focused execution

`node --test scripts/agent-evals/*.test.mjs scripts/agent-evals/lib/*.test.mjs` passed **41/41** on the revision-0 frozen runtime via the executed root `pnpm run test:agent-evals` command in `/tmp/minion-f-root-gates-20261023/21-test-agent-evals-terminal-baseline.log`. Earlier focused and root lane receipts remain preserved. The root executed `test:agent-evals` lane is recorded separately below. Tests cover:

- strict JSON/version/schema fields, source/lock/build/state drift, duplicate/conflicting identities, missing receipt refusal, fixture default, three-arm resets and private append-only artifacts;
- bilingual/compaction fixtures, missing truth/permission/receipt/terminal/effort rejection, development holdout-body refusal before access, leakage groups/content and append-only label corrections;
- complete-cost numerators, a cheaper less-successful counterexample, zero-success bootstrap mass, adverse bounded/unbounded exposure, paired cluster repeats, critical veto, incomplete pairs/receipts and drift;
- six deterministic screen faults before typed semantic abstention, fixed budget/control probabilities, independent source-bound labels, weighted uncertainty and actual run extraction without opening gold labels;
- detached Ed25519/config/registry/scope bindings, actual live CLI + actual live adapter request shaping through an external-network-denied fetch stub, valid canonical admission and zero-request refusals;
- concurrent actual CLI writers, canonical journal assertions, symlinks/copies/replaced/missing files, unknown and known day expenditure across renewed manifest/run/approval aliases, exact pre-dispatch fsync ordering, known malformed/drifted bills, partial/lost bodies, subprocess SIGKILL, local received-response settlement, permanent retirement and no-network offline initialization;
- byte-identical C producer schema/fixture, default model-drift bypass, zero eligible traffic, monotonic receipt extensions, immutable/known-bill conflicts, logical-source/attempt dedupe, baseline completeness and actual versus counterfactual shadow costs.

Test Git repositories use a minimal Git environment without user/system configuration. Initial runs exposed a local 1Password signing dependency; the helper now cannot invoke the operator's signing agent. This changes no user Git configuration.

## Actual A integration: intermediate source proof

First fresh run `/tmp/minion-f-real-a-k1I4vu/run` preserved nine successful actual arms, then correctly stopped before artifact admission at the original synthetic fixture cap of 20 calls. Parent approved a fixture-only cap correction to 64 and one fresh rerun. The actual live spending controls were unchanged.

The rerun command was:

```sh
node scripts/agent-evals/run.mjs prepare-fixture --template audits/2026-10-22-agent-use-transcripts/spec/fixtures/smoke-manifest.json --manifest /tmp/minion-f-real-a-rerun-ug8a8q/manifest.json --hub-root /home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/a-chat --out /tmp/minion-f-real-a-rerun-ug8a8q/run
node scripts/agent-evals/report.mjs --run /tmp/minion-f-real-a-rerun-ug8a8q/run
```

Both exited 0. One fresh actual adapter child built once, then reset fresh browser/runtime state per arm. All four episodes × three arms = **12 complete successful observations**, 25 synthetic provider attempts, three independent committed sandbox mutation receipts, actual choice and artifact callbacks in every arm, zero external requests and zero paid requests.

- Run ID: `28abd70f-42d1-4a39-b5ab-14947e99290f`.
- Result SHA-256: `fc112e5b4d23933fe1789cd16b9970e8c0534c7e6fe18f7aefb0b53070012c92`.
- A base HEAD: `ef62e8ac2dd8d83d7f38dae8ec04f59c50cf4283` **plus dirty candidate content**, not a reviewed implementation commit.
- Transitive A source hash: `4296e6d0f8c39ba0ee1308a32a7fc2691c1e495042910c906067338b30bcb4ed`.
- A lock: `c5e63e6b708c7abc562da19c95d7c317f2fd329fc558b43267e3853d15e454f0`.
- Adapter: `20897a5b509707a0471e66037788ab8d4522d20af2fec2135e61f8e195ec4278`.
- Fresh build: `127fe24f92d4476f66dfa4e5a92035ce28664df1d193c0b01bc305d06482a8c9`.

Actual `decision_applied` observations show informational full context 9,206 bytes versus Jev/core 5,777; sandbox full 15,878 versus Jev/core 10,608, then actual `ui_followup` 16,313. Choice/artifact callbacks use full 9,206-byte context in every arm, with actual `ui_choice`/`artifact` origins and no extra classifier on callback. Initial reset hashes match across each episode's arms. These values are intermediate fixture measurements, not model-quality results.

A subsequently needed its final streaming-lineage correction. F added further source/receipt/rubric integrity guards after this smoke. Therefore **the final reviewed A commit and current F runtime must be rerun together**. The valid live CLI/provider path already passes under the synthetic protocol unit fixture; a same-path test-only live transport smoke against the final real A adapter remains part of that integration rerun. No paid operation is authorized.

## C producer input and final pin

The untouched C-owned schema is copied under `fixtures/c-gateway/complaint-evaluation.schema.json` with SHA-256 `08897441bc823a5c6cb265065ba6a3cfb102b7fb7751a4e2f6aaf283f041c6ff`. C's real SQLite/provider-stub emitted fixture is copied unchanged at `fixtures/c-gateway/complaint-evaluation-v1.json`, SHA-256 `90e2509a53ad5bc8ee9bb79d1b641cd8382a3e46b013e84b009fb3aef52ea565`.

The importer consumes the actual schema and producer eligibility output; it has no second eligibility algorithm. A frozen artifact binds independently supplied manifest pins for actual source commit, lock, schema, exporter and producer fixture. Its self-declared metadata alone grants no qualification. Revision 3 first qualified C implementation `9da5b35a6e26ac0154b1f9aa215b218a064afe5d`. The final artifact now binds reviewed C commit `2289b2fea3bc33eea8a069513815eae0587b44f9`: its source fixtures use narrowly annotated JSONC, while the production schema/exporter and strict emitted or frozen JSON remain unchanged. Independent reconstruction verifies the original sample, retry history and Pulse wire hashes; F continues to accept strict JSON. The actual complaint CLI and report bridge run against that checkout, and a fresh SQLite export checks authority evolution with positive and zero bills. Both CLI entrypoints bind the imported input bytes to the manifest fixture hash; schema-valid caller claims cannot substitute another producer snapshot.

## Corpus and operational limits

`corpus.mjs validate` passes **24 episodes / 24 labels**, twelve families in both English and Spanish, all `synthetic_software`. `readiness` correctly reports **zero human-adjudicated** development/holdout/consequential episodes, deficits 60/240/40 and missing human strata. No governed 300-episode corpus, paid smoke, held-out evaluation, active pilot/policy promotion, merge or deployment is claimed.

## Root gates and resume

Sequential root gate logs, exact commands/exit codes/durations and SHA-256 values are in `/tmp/minion-f-root-gates-20261023/results.json`. Parent copies the final checkpoint/patch/evidence into its owned `audits/2026-10-23-agent-harness-batches/development/f-evals` archive. Failed initial signing-dependent script logs remain preserved; any isolated rerun has a separate log/receipt. Shared indices remain parent-owned and are not regenerated by F.

All required revision-0 gates passed. `repo-policy:validate`, `repo-policy:test`, `build-all`, `typecheck-all`, `lint-all`, `test-all` and `index:check` exited 0 in the initial sequential run. `test:scripts` passed 163/163 with isolated Git configuration (`script-rerun-receipt.json`). A targeted read-only `git fetch --no-tags origin main:refs/remotes/origin/main` restored the missing baseline ref; `changeset:status` then exited 0 (`changeset-rerun-receipt.json`). The revision-0 terminal nested lane passed 41/41 after the authority/producer/readiness/terminal-baseline boundary checks (`final-terminal-tests-receipt.json`). No global Git configuration, source dependency lock or shared index was changed by these remedies.

Remaining work at this checkpoint is parent-managed final A/C source pinning and current-runtime integration rerun, independent Standards/Spec code review and convergence, any shared-index regeneration, scoped commit/draft PR and CI. The implementation remains unstaged. The canonical registry, approvals and credentials used by tests are disposable test material only; no operational trust or account was initialized.
