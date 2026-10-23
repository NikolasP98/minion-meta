# F Evaluation SDD independent pass 2

Reviewer: `/root/astra_sdd_factory_gateway` (Astra), 2026-10-23. **Standards: approved. Spec: changes_requested.** I did not author F. I read pass 1, independently traced its budget-authority finding and reviewed the adapter, receipt, statistical, corpus and CI boundaries. I authored C's interface package earlier; this review approves neither C runtime nor its draft implementation artifacts.

## Evidence identity

Workspace prefix: `/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst`. Paths are relative to meta `f-evals` unless marked Hub or Gateway. Meta observed HEAD is `1d6fa05484a72fb067e6bd4d8494d3a21b174b06`; original runtime base is `220a9b9a0a96e950a5c2d986c6c218cd54ab307e`. Lock SHA-256 is unchanged: `15cbb75ffccdb3aa06ec97b776f3ed9bc0ff1ff68c10b1718741b32ea855f75a`. All eight F artifacts match `chat-evals-report.md`:

```text
4f49be57f7cdd4a7648f4d163f4e6523b7088cddf2741ef9ecf308d95ffaa524  specs/110-harness-evals/checklists/requirements.md
8eb2aa82191d7d01dcc5603d28e1f6754a069b88996a948e829bd3117d88fcce  specs/110-harness-evals/contracts/evaluation.md
7980c98e0efc2bd82ac77048604292725a720aa575f6ea79ebd5fbd7362270a3  specs/110-harness-evals/contracts/quickstart.md
f154d617ab8e4e7b6590f89f4c792028686c7ade549db540c93533eebdac80dd  specs/110-harness-evals/plan.md
82ce94452d7fc31617f347ffcfe63686e054c1045018daf14aa0d51df169c63a  specs/110-harness-evals/research.md
076363cee8500468a4cea64e0318c3a586df70c01a2e7ea3fff963e27cd371e1  specs/110-harness-evals/spec.md
f0e87d521896db8ef885b8820fce8fc26fb5b97ba2f6c455058a181c098d7653  specs/110-harness-evals/tasks.md
60a70a4641b3aa814dd8d2b467455b435a5e73271473e98a22559abcffd61086  specs/2026-10-23-harness-evals-spec.md
```

Reviewed the complete package/board stub, parent A26–A31 and §§9.1–9.4, A's real fixture contract and actual Hub caller/SDK/builder/transport seams, root package scripts/CI and the current C/F interface. `scripts/agent-evals/` is absent at the reviewed runtime source; findings below concern the executable contract to be built, not an existing defective evaluation implementation. Hub source/SDK pins and signatures are recorded in `a-chat-pass2.md`.

## Standards

Source-backed AS-IS/TO-BE/DELTA, parent coverage, explicit ownership, concrete actual-CLI/subprocess tests and separated software/corpus/live/holdout/promotion/release statuses are present. The owner's batch packaging exception and human gates are preserved. Built-in crypto with a detached externally trusted approval is a bounded local mechanism; the package does not add a signer, approval service, production credential resolver or automatic promotion control.

Root `package.json:27` only runs `scripts/*.test.mjs`; `.github/workflows/ci.yml:53` invokes that command. T022 correctly requires an executed nested lane rather than assuming recursive discovery. The A fixture protocol and C schema remain authoritative external interfaces; neither is reimplemented by F. The board stub contains its required Product, verification and out-of-scope sections. No blocking Standards finding.

## Spec — blocking finding

### F2-01 — high: arbitrary journal selection can reset the same approved accounting authority

This independently confirms F1-01. It is the same bounded correction, not a new budget-engine scope.

**Contract:** `specs/110-harness-evals/contracts/evaluation.md:18–20` binds an approval to manifest/scope/budget/approval namespace and external trusted key/owner. Lines 42–48 place reservations, locks, unknown fences and retired markers in a journal outside each run, while line 82 accepts `--budget-journal ABS`. No trusted value identifies the one authoritative registry or constrains that argument to it. T014–T019 (`tasks.md:43–48`) test one journal's crash/concurrency recovery but not substitution of another journal.

**Trigger:** A valid namespace dispatches using journal A and becomes unknown, exhausts its allowance or is retired. A second invocation with the same valid approval/namespace selects fresh journal B, or both journal paths execute concurrently. Each journal has a separate history and lock. All stated signature, model, scope and per-file checks can pass while the second file has no first-file reservation or retirement marker. The artifact-root symlink restriction does not establish an authoritative accounting identity.

**Consequence:** The caller can receive a fresh allowance or lose an unknown fence without changing the signed namespace. One active paid request is only enforced inside the selected file. This conflicts with parent A31 (`specs/2026-10-22-agent-harness-reliability-and-proactivity-spec.md:590`) and §9.1's persistent bounded admission. Source supplies no preexisting registry that silently closes the gap.

**Smallest correction:** Bind a canonical local accounting root/registry identity in read-only trusted operator configuration and/or signed scope, outside run output. A journal argument must resolve to that pre-established identity before lock/admission; it must not initialize new spend authority by selecting another path. Define first initialization separately from reopening. Missing/replaced/corrupt expected state fails closed, aliases either resolve to the same lock/identity or reject, and relocation requires explicit operator reconciliation preserving reservations, unknown fences and permanent retirement. Keep the existing file journal and single-writer approach; no daemon or general billing subsystem is required.

**Required tests:** Actual CLI subprocesses with test-only approval and the same live adapter/stub provider must prove: alternate paths cannot bypass unknown, exhausted or retired state; parallel different-path invocations do not each dispatch; symlink/alias paths do not acquire independent authority; deletion/replacement does not silently initialize a clean allowance. Include positive canonical-path admission so the fix cannot pass by rejecting every live request. Update T014/T016/T019 and freeze corrected approval/budget/CLI contract hashes.

## Other acceptance and cross-group boundaries

| Acceptance | Independent review result |
|---|---|
| A26 | Three matched reset arms consume A's actual subprocess adapter and product code, not a helper simulation. Complete events/receipts, exact joins, randomized recorded order, zero-budget fixture support and missing-receipt incompleteness are specified. A's separate tool-transition correction remains a dependency for cross-group qualification. |
| A27 | Truth/permissions/terminal criteria, leakage-group/translation handling, independent label method/revision, dev-mode pre-read holdout refusal, bilingual/compaction examples and truthful 60+240/40-consequential readiness are explicit. Small fixtures cannot claim a human-adjudicated corpus. |
| A28 | All attempt costs remain in CPS numerator; zero-success and unbounded unknowns are nonpromotable. Ten thousand seeded paired episode-cluster draws preserve repeated observations, nonfinite outcomes, critical vetoes and model/source drift cohorts. Exact success/CPS/latency thresholds and stopping metadata are covered. |
| A29 | Deterministic receipt faults precede semantic screening; hidden independent labels, typed abstention and random apparently-good controls with inclusion probabilities support fixed-budget weighted miss/uncertainty estimates. Screening has no billing or release authority. |
| A30-F | C's versioned schema/export, immutable bindings and monotonic receipt revisions own eligibility facts. Logical-source denominators and attempt dedupe distinguish actual shadow bills from counterfactual forwarded-subset costs. Missing baseline, severity labels or frozen threshold/bounds remain incomplete/inconclusive; zero eligibility yields do-not-pilot. |
| A31 | Actual valid live mode reaches the production adapter's request shaping under stub transport; default network denial, fixed endpoint profiles, explicit credentials and disposable tools remain. Durable reservation/received evidence precede provider dispatch/interpretation respectively; unknown crash outcomes do not replay. Retry/fallback/redirect are disabled. Canonical journal authority is the blocking gap above. |

The current C contract `specs/107-harness-gateway/contracts/usage-shadow.md` has SHA-256 `de18af030d6795059d6995d95d842de960e05340298bf7cb530ad64f521c4a63`. Authoritative implementation paths are Gateway `extensions/alert-watcher/src/complaint-evaluation.schema.json` and `extensions/alert-watcher/src/complaint-evaluation.ts`. The early schema currently hashes to `ff4146d5f1bd2767d55d2482ad1012e8abe91e8a6702c718d3a0fcb13d3bf9bd`; it is draft developer output, not verified final evidence. F T020/T021 must pin the final independently reviewed Gateway commit/schema SHA and consume C-produced fixtures. Do not freeze this early SHA as final or add a duplicate schema. A prose interface hash alone cannot qualify compatibility.

C's durable receipts, rather than its best-effort analytics, are F's accounting source. A high-level SDK invocation is not proof that every hidden network retry/fallback has a separately known bill; unknown coverage survives export/import. F's current cost/coverage rules already preserve this distinction. No additional schema change or separate blocking finding is needed.

## Disposition

**Pass 2: changes_requested**, limited to F2-01/F1-01. The bounded accounting-identity revision and exact-hash rereview are required. Final canonical G2 scores are deferred until approval: `slice_size`, `dod_verifiability`, `scope_containment`, `impact_zones`, `collisions`, `testability`, assessed on the bounded underlying slices with authorized group packaging.

Only assigned review reports were written. No spec/runtime/index edits, git mutations, model/provider calls or deployment occurred. This is source/contract/signature/hash review, not passing runtime, live-smoke, corpus-readiness or promotion evidence.


## Revision 1 bounded rereview — 2026-10-23

**Standards: approved. Spec: approved.** This supersedes the initial changes-requested disposition for the exact revision-1 F hashes below. Original findings remain preserved above. The rereview checks F2-01/F1-01 and the resulting local trust/initialization/accounting/CLI contract; unchanged evaluation/statistical/corpus/C-schema areas remain cleared.

### Exact approval identity

Verified root author report `chat-evals-revision1.md` SHA-256 `e21e07d47f3ba4665552628632cd3e073be783b2bafae0297a816dad17438f81`, full 17-file manifest SHA-256 `b386fe6e6964bd3ac75cb58644ed68cfe01097a922588dfa36f75bbda29bf02b`, and every referenced file. This F approval covers these eight files:

```text
695de1345df3e62025eb1c3792bdaf673cc41342be739c27156a964da899c23a  specs/110-harness-evals/checklists/requirements.md
53f91c7e249dfcea71a9280cf52f3ff729843dba7084f0aab673c7e6e61d0e12  specs/110-harness-evals/contracts/evaluation.md
5f4f501442d64eab3d8b9620c0727e593450cf235f27234859a7b96489ae1715  specs/110-harness-evals/contracts/quickstart.md
ac6538f7a0a88f5e75e899ffa1ea0c406f6b3cf9b67d982c1ec74e48a2056d7a  specs/110-harness-evals/plan.md
eb8196f4689af48537dd6f0731b513731e488d046394966ff8b470d8a2a17d34  specs/110-harness-evals/research.md
94bd692f02fd7049b0790128da750fe7c7be983d504fdb433c5d75bb294e76a9  specs/110-harness-evals/spec.md
f7fded252f9dc7f6726694774d700f53b44c01270b0f3727a10ff695539cc445  specs/110-harness-evals/tasks.md
1a3c1ad6983d8c7923fdc4b8a6efa6e1e1e7dddad0f0369464215fd7d5a7ecec  specs/2026-10-23-harness-evals-spec.md
```

### Standards disposition

The correction remains a local POSIX file-journal boundary using the already planned approval/budget modules and CLI. The offline initializer neither creates trust configuration nor writes keys or approvals; installation of trust and an actual paid operation remain independent operator actions. No daemon, distributed accounting, signer or automatic reconciliation service is introduced. C schema/export ownership and the requirement for final independently verified implementation pins remain unchanged. No Standards issue remains.

### Spec disposition

**F2-01 / F1-01 resolved.** `contracts/evaluation.md:15,19,25–35` now establishes authority before any journal selection or admission:

1. The live manifest and detached approval bind a trusted operator-config hash plus registry and stable accounting-scope IDs. Read-only configuration pins canonical root/metadata/journal paths, genesis and opened filesystem identities. A caller-generated manifest or namespace cannot install a different trust root or create a scope.
2. `--budget-journal` is an optional exact-path assertion, not selection of an alternative ledger. Open-existing/no-create/no-truncate and nonsymlink descriptor checks reject aliases, copied roots, missing/replaced or corrupt expected state. Identity is rechecked before reservation/dispatch. All aliases use the same fixed registry lock.
3. Accounting is keyed by registry/scope. Approval namespaces and renewed manifests are aliases under retained spend/reservations/retirement, including changed run IDs, limits, models and UTC days. Explicit retirement resolves the existing scope and holds that same lock; a new alias cannot clear the marker.
4. First initialization is an explicit offline exclusive-create operation that returns an identity report. It has no provider transport, credential or approval-writing path and cannot overwrite an existing root. Live reopening never initializes state. Relocation requires offline operator reconciliation and newly bound trust/approval while preserving the complete journal, unknown reservations and retirement markers.

T014–T019 make these requirements executable through the actual CLI and live adapter with test-only trust and a stub provider: parallel different paths, symlink/alias/copied roots, deletion/replacement, unknown/exhausted/retired state and new approval aliases must not dispatch; valid canonical admission must still dispatch. The initializer's no-network/no-trust behavior is tested explicitly. These tests exercise the actual single-writer authority rather than mocked journal helpers.

This is viable against the current source boundary: `scripts/agent-evals/` is new software, and `lib/approval.mjs`, `lib/budget.mjs` and `run.mjs` are the already owned implementation locations. The correction needs no existing external accounting service. The declared trusted-operator/filesystem boundary is explicit; it does not claim protection from an operator who can rewrite the trust root and accounting files or from multi-host consensus failures.

No unresolved pass-2 SDD finding remains. Actual filesystem descriptor/lock ordering, crash persistence, request bounds and live-adapter stub execution still require implementation evidence. The draft C schema SHA remains nonfinal; no runtime or cross-group qualification is inferred from this document approval.

### Final G2 scores

Scores are out of 10 on the bounded underlying slices, with the owner's one-PR batch exception.

| Axis | Score / 10 | Basis |
|---|---:|---|
| `slice_size` | 7 | Live admission and adapter integration are substantial but explicitly separated from corpus, statistics and screening increments with named local modules. |
| `dod_verifiability` | 9 | Valid canonical admission, path/alias refusal, independent receipt joins and reproducible calculations have concrete CLI/subprocess tests. |
| `scope_containment` | 9 | The revised registry closes the approved spend boundary using local files; initializer grants no trust, and paid/holdout/promotion operations remain gated. |
| `impact_zones` | 9 | Trust, approval, registry, CLI, provider, A adapter, C schema and actual nested CI test execution are identified. |
| `collisions` | 8 | Shared runner/library changes serialize; A adapter and C export retain single owners and explicit final-pin integration gates. |
| `testability` | 9 | Real subprocess races/crashes and the actual live request-shaping path under stub transport exercise the critical invariants without spending. |

All six axes meet the required threshold. Only this audit was appended; no F specifications, runtime, indices or git state was changed. Stop for parent-managed development and independent code verification.
