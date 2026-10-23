# Chat and evaluation SDD author handoff

Date: 2026-10-23. Author: Astra chat/evals. Status: **author-ready; two independent technical reviews pending**. This report freezes 17 owned SDD files. No runtime code, test implementation, paid model request, deployment, branch operation or commit was performed by this author. The parent owns review dispatch and subsequent Sol development.

## Authority and repository split

The normative approved parent is `specs/2026-10-22-agent-harness-reliability-and-proactivity-spec.md`, §§0–12. A owns A03/A04/A05 and the necessary A26 Hub adapter; F owns A26–29/A31 and evaluation-only A30. C owns the production watcher A30 implementation. The explicit owner instruction packages each group in one PR, six total, overriding one PR per original slice; each bounded slice remains separately traceable and testable. Human merge, deployment and actual paid-operation gates remain separate.

| Repository | Source inspection identity | Branch / PR base | Lock SHA-256 |
|---|---|---|---|
| A Hub | `ef62e8ac2dd8d83d7f38dae8ec04f59c50cf4283` | `feature/agent-harness-a-chat` / `master` | bun.lock `c5e63e6b708c7abc562da19c95d7c317f2fd329fc558b43267e3853d15e454f0` |
| F meta | runtime/base `220a9b9a0a96e950a5c2d986c6c218cd54ab307e`; observed HEAD `bfb31a3c4e4029df7ac2b5f42d8bb18e8245a847` adds B approval documents only | `feature/agent-harness-f-evals` / `dev` | pnpm-lock.yaml `15cbb75ffccdb3aa06ec97b776f3ed9bc0ff1ff68c10b1718741b32ea855f75a` |

Parent frozen-install receipt reports Hub Bun 1.3.4, Node 22.23.3 and meta pnpm 10.15.0. Installed Hub shared SDK `beginRequest`/ChatMessage contracts were inspected; no shared-package release is required. Exact developer candidate identity must be recorded again after implementation. Historical wave-1 reports are evidence inputs, not a claim about current runtime frequency or model quality. Later WhatsApp delegation changes grant no new A/F authority and engine P1–P4 remain outside scope.

## Authoring workflow and source review

Read meta AGENTS, constitution, resolved Spec Kit specify/plan/tasks/analyze instructions/templates, Hub CLAUDE→AGENTS and UI governance, and MINION engineering/technical-writing guidance. `setup-plan` and `setup-tasks` used absolute owned `SPECIFY_FEATURE_DIRECTORY` plus `SPECIFY_FEATURE_NO_PERSIST=1`; both final analyze prerequisite calls succeeded with spec/plan/tasks/contracts available. `.specify/extensions.yml` and shared `.specify/feature.json` are absent; this author did not create them. Contracts hold data-model and quickstart material within delegated ownership. No child agents were spawned.

Source inspection covers real Home/Floating callbacks, pending submission, gateway final/smoother timing, chat-rpc submitted/ack semantics, dispatch/runner/model-context awaits, page/tool revision subscriptions, router service/route, both sanitizer allowlists, final capture sink, rate limiter, auth/current-org/RBAC paths and the installed critical-journeys builder/transport. F inspected current root CLI/test/CI structure and absent evaluation source paths. Planned tests exercise those actual seams rather than copied helpers.

## Specification analysis report

This is the author consistency analysis, not either independent technical review. The analysis pass was read-only; the handoff report was written afterward as the separately assigned evidence deliverable.

| Category | Result |
|---|---|
| Duplication / scope | No blocking duplication. A26 producer/consumer split and A30 runtime/report split are explicit; one authoritative C schema and one actual A adapter. |
| Ambiguity / underspecification | No unresolved clarification placeholders. Fixed bounds, lifecycle/cancel/unknown semantics, approval boundary and receipt identity are explicit. Operational limits and severity criteria must be supplied in an approved manifest; missing values fail closed. |
| Constitution | Principles I–V addressed; group packaging uses the explicit owner override. New endpoint auth/RBAC/inventory and UI/i18n/design checks are planned. |
| Coverage / ordering | Every assigned parent acceptance and buildable FR/SC has tasks. Shared source edits serialize; A/F and C/F integration prerequisites are named. |
| Consistency | AS-IS/TO-BE/DELTA, user stories, tests, contracts and task ordering agree. No extra service, durable production task state, automatic paid retry or gate activation is introduced. |

No CRITICAL/HIGH/MEDIUM author-analysis finding remains. No user clarification is required to complete this SDD task. Independent reviewers should especially challenge the accepted-run claim timing, telemetry self-only route, real fixture bridge, trusted attestation boundary and crash-safe spend journal against the approved scope.

### Coverage

| Feature / requirements | Parent acceptance | Tasks / real proving seam |
|---|---|---|
| A FR-001/002; SC-001 | A03 | T003–T009: actual gateway final claim, awaited tools, mounted Home/Floating, explicit callback/history/navigation regressions |
| A FR-003/004; SC-002/003 | A04 | T010–T013: real service→route→capture→sanitizer, early UUID and prepared/applied/discarded transport producers |
| A FR-004/005/006; SC-003 | A05 | T014–T016: actual authenticated route, streaming size cap, weighted rate limit, owner buffer/drop and explicit joins |
| A FR-007; SC-004 | A26 Hub | T017–T019: mounted actual components and parser bridge, source/lock handshake, identical resets, independent disposable receipts |
| A FR-008; all SC | shared required gates | T008/T015/T020–T022: auth/inventory/i18n/tokens, installed fixture/browser evidence, review |
| F FR-001/002; SC-001 | A26 | T003–T006: actual CLI/A subprocess, strict manifest, joins/missing receipt/default network denial |
| F FR-003; SC-002 | A27 | T007–T009: import/readiness, independent labels, leak/holdout refusal before body access |
| F FR-004/005; SC-003 | A28 | T010–T011: exact all-attempt CPS, paired 10,000-draw bootstrap, critical/unknown/drift counterexamples |
| F FR-006; SC-005 | A29 | T012–T013: deterministic-first faults, hidden labels, controls/probabilities/weighted uncertainty |
| F FR-007; SC-005 | A30 evaluation | T020–T021: C-produced exact-schema/revision fixtures, logical denominator, actual/counterfactual costs, severity/threshold gates |
| F FR-008/009/010; SC-004 | A31 | T014–T019: valid actual live adapter through stub, detached trust validation, durable reservation/crash/unknown fencing and retention |
| F FR-010; all SC | shared required gates | T001–T003/T022–T024: provenance, executed nested tests, full root gates and independent review |

A: 3 user stories, 8 FRs, 4 SCs, 22 sequential tasks. F: 5 user stories, 10 FRs, 5 SCs, 24 sequential tasks. Coverage is 100% of these declared buildable requirements; task coverage is an author semantic mapping, not a passing runtime test count.

### Executed document checks

- Both `check-prerequisites.sh --json --require-spec --require-tasks --include-tasks` invocations exited zero under their isolated feature env.
- Scoped actual spec-index/frontmatter/topic validators accepted both board stubs: required fields, scalar/array shapes, dates, state/repo/topic values, identity and required headings.
- Read-only local-link, AS-IS/TO-BE/DELTA, task-sequence and unresolved-placeholder checks passed for all 17 owned documents.
- Source/lock identities and C contract SHA were reread. Shared index regeneration and final full repository gates belong to the orchestrator/developers; this author did not modify the index.
- No runtime qualification was attempted; all commands in quickstarts are implementation requirements.

## Cross-group interfaces and bounded choices

A/F uses `minion-agent-eval-fixture/v1` over an explicit A-owned `--stdio` process. F pins actual source/lock/build/adapter hashes; missing/dead adapters fail without fabricated receipt fallback. The mounted real contexts, classifier parser and gateway/tool paths run under disposable identity/state with external network denied. F owns inference transport only; provider keys never reach the browser/adapter. D/E critical-journeys builder/test collisions serialize through the parent; A-owned dedicated entry files are preferred.

C/F consumes C's authoritative `ComplaintEvaluationRecordV1`, planned schema/export under `extensions/alert-watcher/src/complaint-evaluation.{schema.json,ts}`. Frozen SDD contract `specs/107-harness-gateway/contracts/usage-shadow.md` SHA-256 is `21cd4843a4d72327edd1a1bb7c7d4e9a3278cd20fb5dabbbf3e3ffdb1329bee2`. Implementation pins the delivered C commit plus schema SHA, not this prose hash as a runtime substitute. Monotonic receiptRevision reconciles permitted late updates; duplicate IDs never add bills. F imports eligibility facts and never copies the algorithm. Actual shadow baseline bills remain in actual costs; counterfactual forwarded subsets are separate estimates.

The parent accepted weighted charging through the existing per-process limiter, explicit same-origin handling and server-derived actor/org; no distributed limiter is introduced. The parent also accepted a narrow built-in-crypto detached attestation verified against explicitly supplied trusted key/owner configuration: no approval service, signing CLI, self-declared manifest key or production credential access. This choice remains reviewable under Ponytail. Live path tests use test-only keys and stub transport, never paid requests.

Corpus300 collection/adjudication, full holdout, actual paid smoke, active promotion and production release remain separate governed operations. Their absence does not excuse unimplemented runner/live software. This task intentionally stops at complete reviewable SDDs, as delegated; runtime implementation starts only after parent-arranged independent passes.

## Frozen SDD hashes

SHA-256 over the following newline-terminated manifest: `14e436676895e4a6aa978c1ece5d0fe452f41f93c130830364901225bec6ebbd`.

```text
f62f3d424deca94276e9d0553100a6c556c50efd1361c64c7a50661d7fc760bd  specs/105-harness-chat/checklists/requirements.md
61ed25c95f4a3aa49cf5930859b7d60963118e83525dea16a952d27f1d73a343  specs/105-harness-chat/contracts/chat-evidence.md
ac48cc28ad341dcb0e4e322930e1c1167f900d26063b0a42e3b1135662c6fbbc  specs/105-harness-chat/contracts/eval-adapter.md
a4d8e55a3ce0dc73d5ec1c72e3f856d47c1463c53b33290a019f4ae4401f72f5  specs/105-harness-chat/contracts/quickstart.md
29a6a769c98c9cb9d60606d2f69618ac135157250aeaf27b5f9e91fb22c57df5  specs/105-harness-chat/plan.md
d61ce09c0b3383341e47162d5ba391438b3cdb3893e90332f74cfd045d261839  specs/105-harness-chat/research.md
199364ab942516cfa27c5d4a03f7c108f6d59c6c10c0abe37d2b510945a765bd  specs/105-harness-chat/spec.md
d34846576ab76f3e7400d3554478cf819ea2d5329762410295e7b7af09dc81f6  specs/105-harness-chat/tasks.md
4f49be57f7cdd4a7648f4d163f4e6523b7088cddf2741ef9ecf308d95ffaa524  specs/110-harness-evals/checklists/requirements.md
8eb2aa82191d7d01dcc5603d28e1f6754a069b88996a948e829bd3117d88fcce  specs/110-harness-evals/contracts/evaluation.md
7980c98e0efc2bd82ac77048604292725a720aa575f6ea79ebd5fbd7362270a3  specs/110-harness-evals/contracts/quickstart.md
f154d617ab8e4e7b6590f89f4c792028686c7ade549db540c93533eebdac80dd  specs/110-harness-evals/plan.md
82ce94452d7fc31617f347ffcfe63686e054c1045018daf14aa0d51df169c63a  specs/110-harness-evals/research.md
076363cee8500468a4cea64e0318c3a586df70c01a2e7ea3fff963e27cd371e1  specs/110-harness-evals/spec.md
f0e87d521896db8ef885b8820fce8fc26fb5b97ba2f6c455058a181c098d7653  specs/110-harness-evals/tasks.md
bc47ee91d0360ff94ab29f3b89ae712f0c96b98d8caf5fda0fc90c77e7494bee  specs/2026-10-23-harness-chat-spec.md
60a70a4641b3aa814dd8d2b467455b435a5e73271473e98a22559abcffd61086  specs/2026-10-23-harness-evals-spec.md
```

## Next action

Parent dispatches two independent review passes over the frozen A/F files. Then assign Sol development by repository, preserve the six-PR total, and require the stated actual-seam tests plus Standards/Spec review. Author awaits concrete review findings and will revise only owned SDD files when directed. B independent pass2 approval and its canonical G2 scores are separately recorded in `b-factory-pass2.md`.
