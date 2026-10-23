# Chat and evaluation SDD revision 1

Date: 2026-10-23. Author: Astra chat/evals. **Author-ready and frozen for two independent bounded rereviews; no self-approval.** This report preserves the original handoff and reviews and supersedes only their 17-file author manifest for A/F. No runtime source, tests, index, shared feature state, branch or commit was changed by this author. No paid call, operational registry, key or approval was created. Other agents' changes were preserved.

## Authority and source pins

The approved parent `specs/2026-10-22-agent-harness-reliability-and-proactivity-spec.md`, including A03/A04/A05/A26–A31, remains normative. The owner authorizes one PR per group, six total. A owns chat and the required Hub fixture adapter; F owns evaluation software; C owns complaint runtime/schema. This revision closes the two shared review gaps and two A precision notes within that scope. Human merge, deployment and actual paid-operation gates remain separate.

| Source | Verified identity | Revision relevance |
|---|---|---|
| A Hub | `ef62e8ac2dd8d83d7f38dae8ec04f59c50cf4283`, `feature/agent-harness-a-chat`, PR base `master` | Actual pending/final/tool/page/sandbox/limiter callers reread |
| A lock | `c5e63e6b708c7abc562da19c95d7c317f2fd329fc558b43267e3853d15e454f0` | Frozen `bun.lock`, unchanged |
| F meta | runtime/base `220a9b9a0a96e950a5c2d986c6c218cd54ab307e`; observed HEAD `1d6fa05484a72fb067e6bd4d8494d3a21b174b06`, `feature/agent-harness-f-evals`, PR base `dev` | Documentation advances only; no evaluation runtime exists at the source pin |
| F lock | `15cbb75ffccdb3aa06ec97b776f3ed9bc0ff1ff68c10b1718741b32ea855f75a` | Frozen `pnpm-lock.yaml`, unchanged |
| C authoritative SDD contract | `specs/107-harness-gateway/contracts/usage-shadow.md`, SHA-256 `de18af030d6795059d6995d95d842de960e05340298bf7cb530ad64f521c4a63` | No C/F schema-field or eligibility-contract change in this revision; F still consumes the C-owned schema/export |

C's in-progress `extensions/alert-watcher/src/complaint-evaluation.schema.json` was observed with SHA-256 `ff4146d5f1bd2767d55d2482ad1012e8abe91e8a6702c718d3a0fcb13d3bf9bd`. It is a developer draft, not the final qualified C pin. F implementation must record the independently verified final C commit and schema SHA before claiming integration. No C source or contract was edited.

## Review finding to task map

The inputs are root audit `sdd/a-chat-pass1.md`, `a-chat-pass2.md`, `f-evals-pass1.md` and `f-evals-pass2.md`. Review dispositions remain historical changes-requested until their independent authors rereview these exact hashes.

| Finding | Source-confirmed defect | Bounded revision | Implementation and proving tasks |
|---|---|---|---|
| A1-01 / A2-01, HIGH | `page-context.ts:8–32` exposes undifferentiated revisions; Home `689–691` and Floating `309–311` invalidate pending preparation for every notification. Sandbox tools `tools.ts:24–28,189–225,274–306` emit an unacknowledged window event; `host.svelte.ts:110–123,187–196` reloads asynchronously; sandbox page `65–88` recreates context owner in its effect. | Private nonserializable capability bound to accepted run/sending surface/generation/invocation/current tool registration/page-owner lease/prior revision; one acknowledged publication and one guarded post-execution consumption. Initial producer is only existing sandbox mutations → local callback → host reload → stable page-owner summary update. External/uninstrumented transitions revoke; no global executing flag, DOM-event authority or output-string provenance. | A T003/T007/T008 implement exact owned files; T009 drives actual sandbox write/reload under mounted Home/Floating. Positive case: exactly one fresh continuation and zero remaining old calls. Negative: concurrent user navigation/A→B→A/unrelated registration/reordered, duplicate or forged notification/Stop/teardown/failed refresh/expiry, all zero continuation. T017/T019 carry this real seam through A/F adapter. |
| A2-N1, nonblocking | `pending-submission.ts:92–97` aborts the preparation controller in successful finish; Home `749–752` and Floating `376` call it. | Accepted run owns a separate controller/generation. Preparation cleanup does not abort it. Stop revokes exact accepted run even after smoother clears `chat.runId`. | A T005/T008 own integration; T009 proves submitted → preparation cleanup → live tool signal, followed by exact-run Stop during smoothing. |
| A1-N1, nonblocking, confirmed by pass 2 | `rate-limit.ts:9–25` retains Map keys forever; there is no existing idle-key expiry to reuse. | Same module, new observation namespace only: weighted 120 events/60 seconds, max 4,096 actor/org keys, 60-second charged-idle pruning, reject-new at capacity without active-budget eviction, no denied-batch timestamp/partial charge. Existing weight-one callers unchanged. | A T014/T015 execute endpoint/limiter tests with controlled clock; quickstart names `rate-limit.test.ts`. |
| F1-01 / F2-01, HIGH | Original CLI-selected `--budget-journal ABS` could start another lock/ledger for the same approved spend authority. | Read-only operator configuration pins canonical registry/root/metadata/journal/genesis/opened filesystem identities and stable accounting scope; manifest and detached approval bind config hash plus registry/scope IDs. Journal flag is only an exact-path assertion. Approval namespaces are aliases under one retained accounting scope and one registry lock. Offline initialization creates state/identity report only; live reopen never creates missing state. Scope retirement/unknown spend survives every alias. | F T014/T015 strict trust/approval/CLI wiring; T016 actual concurrent CLI/crash/path/symlink/copied-root/deletion/replacement/alias/unknown/exhausted/retired cases, plus valid canonical success; T017 journal/initializer; T019 actual live adapter stub integration, same-lock retirement and reconciliation documentation. |

The narrower capability publication lifetime closes at settlement or 30 seconds, while its already-recorded one-use acknowledgement is consumed only at the immediate guarded post-execution boundary before the same expiry. This avoids using a dead preparation signal or a post-settlement capability and keeps the old batch permanently ended. A completed mutation with failed context refresh is evidence of that mutation; it is never replayed to obtain a handoff.

F's initializer neither writes trusted configuration nor mints keys/approvals. Choosing a generated manifest, new path or approval alias cannot install trust or create another accounting scope. Relocation requires explicit offline operator reconciliation preserving all reservations, unknown fences and retirement markers, followed by newly bound trusted configuration/approval. No approval service, multi-host budget service, automatic stale-lock repair or automatic spend reconciliation is added. Filesystem tampering by the operator who controls the trusted key/config is outside this local POSIX file-journal boundary.

## Repository ownership and collisions

A implementation additionally owns the source-confirmed narrow integration in `src/lib/assistant/page-context.ts`, `src/lib/sandbox/{tools.ts,host.svelte.ts}`, `src/routes/(app)/sandbox/+page.svelte` and their existing tests. The parent explicitly confirmed these paths are within A03/A26. Home/Floating, shared critical-journeys builder/test files and A/F integration still serialize through the parent with D/E work; no other group receives duplicate ownership. The page change is lifecycle/provenance wiring, with no visual redesign or new navigation capability. All Hub UI governance and required gates remain.

F uses its existing planned `lib/{approval,budget}.mjs` and `run.mjs` ownership; no additional runtime service/library or repository. All 22 A and 24 F tasks retain their identifiers and dependencies. The C/F schema section is unchanged; only final delivered C source/lock/schema pins can qualify its integration. Corpus300 adjudication, actual paid smoke, holdout, promotion, merge and deployment remain separate governed operations, not unfinished software excused from these tasks.

## Author consistency analysis and document checks

This is bounded author analysis, not an independent approval or G2 score. AS-IS/source, TO-BE, contracts, tasks and guides now specify the same authority transitions. Every assigned FR/SC still has the original task mapping; revisions strengthen A03/A05/A26 and A31 proof without changing A04, corpus/statistics/screening or C-owned eligibility requirements. No unresolved product question or clarification placeholder remains. Independent reviewers should challenge the actual producer registration/publication ordering and canonical registry reopen/alias boundary at these hashes.

Executed checks:

- Both feature-local `check-prerequisites.sh --json --require-spec --require-tasks --include-tasks` calls passed with absolute `SPECIFY_FEATURE_DIRECTORY` and `SPECIFY_FEATURE_NO_PERSIST=1`.
- Actual repository frontmatter/scalar/array/date/state/repo/topic/heading helpers accepted both top-level stubs.
- Local Markdown links, unresolved-placeholder scan, AS-IS/TO-BE/DELTA and sequential task checks passed for all 17 owned documents: A 22 tasks/8 FR/4 SC; F 24 tasks/10 FR/5 SC.
- Scoped `git diff --check` passed. `.specify/feature.json` and `.specify/extensions.yml` remain absent; no shared feature state or index was created/modified.
- Source and lock identities above were reread. This author ran no runtime qualification; all quickstart tests are still developer obligations.

## Exact frozen artifact manifest

SHA-256 over the following newline-terminated 17-file manifest: `b386fe6e6964bd3ac75cb58644ed68cfe01097a922588dfa36f75bbda29bf02b`. The separate root report hash is sent to the parent after writing; it is not recursively included in its own digest.

```text
515fef5b0b6e61363f329fbc75757d316903f6295bcc1d6013cd1506ac838ed1  specs/105-harness-chat/checklists/requirements.md
a625c2bd9520949944c9c58c0efb0dbbd63d41d4980ef510a042cfe2ff62f6b4  specs/105-harness-chat/contracts/chat-evidence.md
b4729f80a7323eb0ecc45853e31c6432e9bba10263d0980f1f32a25ccbd05b14  specs/105-harness-chat/contracts/eval-adapter.md
3350788b4208e24c3a54830535034c29c0dc722329fcc37d60c94f34f1e67f23  specs/105-harness-chat/contracts/quickstart.md
8a9712c4815a732d0efbffcaef514992d46c2cd6433faa6052484f64da6ace10  specs/105-harness-chat/plan.md
1d984bd6aeb3a2a853109729701cd7871e6ec3d7b49d811bed4ac8a7c5a6ed81  specs/105-harness-chat/research.md
ce8d8b2de23922f390d0f30e079eb0002e1ddfb9d0e93ac341e9fa0cd7927966  specs/105-harness-chat/spec.md
52b66a5dffdb5b4a87f9af3c248dc24dbf855a1180ee894d1115e5d4cc7502d2  specs/105-harness-chat/tasks.md
695de1345df3e62025eb1c3792bdaf673cc41342be739c27156a964da899c23a  specs/110-harness-evals/checklists/requirements.md
53f91c7e249dfcea71a9280cf52f3ff729843dba7084f0aab673c7e6e61d0e12  specs/110-harness-evals/contracts/evaluation.md
5f4f501442d64eab3d8b9620c0727e593450cf235f27234859a7b96489ae1715  specs/110-harness-evals/contracts/quickstart.md
ac6538f7a0a88f5e75e899ffa1ea0c406f6b3cf9b67d982c1ec74e48a2056d7a  specs/110-harness-evals/plan.md
eb8196f4689af48537dd6f0731b513731e488d046394966ff8b470d8a2a17d34  specs/110-harness-evals/research.md
94bd692f02fd7049b0790128da750fe7c7be983d504fdb433c5d75bb294e76a9  specs/110-harness-evals/spec.md
f7fded252f9dc7f6726694774d700f53b44c01270b0f3727a10ff695539cc445  specs/110-harness-evals/tasks.md
dd40370cee877a11d9b7b4611e8e328f6d8a22eb966e2a6fd182e0304230f414  specs/2026-10-23-harness-chat-spec.md
1a3c1ad6983d8c7923fdc4b8a6efa6e1e1e7dddad0f0369464215fd7d5a7ecec  specs/2026-10-23-harness-evals-spec.md
```

## Disposition

**Ready for two independent bounded rereviews; no self-approval.** All requested author edits are complete. Reviewers can focus on the four mapped findings and resulting caller/accounting contracts; unchanged acceptance does not need a fresh broad review. Parent owns review dispatch, commit sequencing and Sol development. Stop here before implementation or further edits.
