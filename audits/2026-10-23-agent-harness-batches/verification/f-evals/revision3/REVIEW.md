# F independent revision3 review

**Standards: source review passes. Spec: source review passes; final integration and validation remain pending.** All known F implementation findings, including F-02-R2, close on this frozen source. Full software convergence is not complete: current actual-A fixture/live-stub proof, final F root gates and parent-owned delivery remain required.

## Frozen identity and review scope

Runtime SHA-256 `de4219c0b95680157399167617e8eb548d4926f9adbc90e8255de00ab425a587` was independently recomputed with `sourceDigest()`. All 95 owned files matched their expected hash, byte size and POSIX mode before and after review. Metadata HEAD `182c9c5e0a804d1882a11a3728e99362c775e719` is separate from runtime identity. The lock remains `15cbb75ffccdb3aa06ec97b776f3ed9bc0ff1ff68c10b1718741b32ea855f75a`.

The durable author checkpoint hash is `07db8cf857f5e5d1cd04f650331391d5510ce46b48eff9ce3f8cefae2291220b`; owned patch `815f6922a17a0f66a264d3847740757e24fc38ec6532cfc867e6c44afb740560`; frozen source archive `80abd77cdb4c63a37d58789c2f0322e883a88918a2f5ec68e647078f72bfdbac`. The archive is retained here. Current identity, exact changed paths and reviewed source delta are recorded in the adjacent artifacts.

The complete intent inventory covers 10 functional requirements, 5 success criteria, 18 acceptance scenarios, all 24 tasks regardless of unchecked boxes, 7 plan decisions and 5 constitution principles. Current spec/plan/tasks/constitution and contracts were inspected. Earlier source review carries forward only through matching current bytes. The six changed owned paths were reviewed: shared run-evidence reader, new regression test, committed C artifact metadata and three documentation files. The current report/screen consumers, typed payload validators and complaint importer were checked at the changed boundaries. This is full intent assessment by continuity, not selected-item convergence.

## F-02-R2 closure and additional boundaries

The reader now selects reset and collection state only when exactly one record remains after exact-ID deduplication (`lib/run-evidence.mjs`, singleton selection near lines 103–119). The receipt format has no supersession revision, so distinct IDs cannot silently replace lifecycle state. Run-level prepared/adapter records also remain unselected when ambiguous. Task failed/canceled events and contradictory provider terminal records prevent execution success. Multiple received/financial terminal records cannot become complete billing; conservative ceilings use all supplied terminal values. Valid competing collections retain their critical findings even when no terminal outcome can be selected.

The original **unchanged** collection-conflict probe now returns, in both file orders, zero successes, zero execution coverage and full billing coverage for all three arms. The independently known bill remains USD 0.0000001 per arm, represented as `0.09999999999999999` micro-USD. The exact same-ID duplicate case remains idempotent.

The new independent `probes/lifecycle-boundaries.mjs` executes 16 public report scenarios: eight variants in both orders. These cover critical and equal-payload distinct collections, reset conflicts, prepared conflicts, task cancellation, provider failure markers, conflicting received responses and different terminal exposure ceilings. Each refuses execution success, preserves independently known fractional cost, and makes the shared screening reader return a receipt-integrity failure. Critical union and maximum exposure ceiling are checked explicitly; normalized reconciled outcomes are order-independent.

All nine preserved independent executions also passed unchanged: original report/repeat/foreign-lineage/unknown-bill cases, both expiry variants, raw-path containment, unique-screen budget/known-zero reconciliation, required identity/collection fields, exact fractional billing/redaction, the revision2 13-report/12-complaint deep cases and original terminal conflict. Expected child CLI refusals are retained in the execution receipts; wrapper success is not substituted for their outcomes.

The original estimand counterexample still preserves 90 trials, baseline 90 successes/9000 micro-USD/CPS100, candidate 60 successes/4500 micro-USD/CPS75, success difference −1/3 and unchanged per-trial p95. Unmatched repeats remain inconclusive. Known task execution with unknown financial receipts remains a success with billing coverage zero and no financial recommendation. Expiry after reservation fsync dispatches no wire request. Traversal-like episode IDs create no escaped files; redact removes all seven raw files. One trace copied 100 times still fails the fixed unique review budget. Known-zero, same-known-amount refinement and invalid future downgrade histories remain order/duplicate independent.

## Committed C integration

The F artifact now binds actual reviewed C commit `9da5b35a6e26ac0154b1f9aa215b218a064afe5d`. Independent `git show` byte comparisons matched the committed schema, exporter, original sample, retry sample and lock to the consumed artifacts. The artifact's source/lock/schema/exporter/input values match those independent pins; self-declared metadata is not the source of qualification.

- Schema SHA `08897441bc823a5c6cb265065ba6a3cfb102b7fb7751a4e2f6aaf283f041c6ff`.
- Exporter SHA `957644df067c92ac1337129bcfd903b18c13baa09e5058f327dc762bbd16951c`.
- Original producer sample SHA `90e2509a53ad5bc8ee9bb79d1b641cd8382a3e46b013e84b009fb3aef52ea565`.
- Retry sample SHA `f7eecd61e3ac7bc7128851e14b72d537ba27f8565210101892950672e41736b9`.
- Lock SHA `2fbb2f37e8c7c0cc8c0297eb9e800ff35c39606b9fffaf8c439e6aeb9d968649`.

Eight public commands were independently replayed against the actual committed checkout or independently bound artifact: complaint/report for retry, authority, author's fresh SQLite export and original artifact. All exited 0 with byte-identical author outputs.

A fresh local SQLite producer history was then independently executed from C's committed source with socket/fetch network denial and an empty synthetic HOME. It emitted six records for two logical sources, including a USD 0.000009 bill and a known-zero bill. Current authority moved from eligible to disabled/unmatched without changing original attempts. Both historical units remain eligible in the fixed census; current eligible count is zero; two attempts and USD 0.000009 remain; unknown bills and quarantine are empty. The producer lifecycle script was author-supplied and independently executed; the input/output and order assertions were independently added here.

Six further public commands consumed these newly emitted records in forward, reverse and duplicate order. Complaint and report output bytes agree for each identical input. Across different input orders, financial/eligibility semantics agree after sorting only the `eligibilityHistory` presentation array by source ID. All remain inconclusive and `analysis_only_no_activation`. This closes the final C source/provenance integration obligation for the reviewed F runtime; it does not certify a paid or held-out operation.

## Validation and canonical convergence

`node --test --test-concurrency=1 scripts/agent-evals/revision3-regressions.test.mjs` independently executed the author's expanded regression: 1/1 passed, zero fail/skip/TODO, about 5.10 seconds. The supplied full bounded 57/57 author suite is retained as author evidence, not misrepresented as a verifier rerun. No full root gate or A build/browser was executed during D's reserved heavy window.

The canonical `speckit-converge` workflow was applied to all 69 current intent items with exact-byte review continuity. The prerequisite command passed with absolute feature directory and `SPECIFY_FEATURE_NO_PERSIST=1`; extension hooks are absent. `convergence-matrix.md` and `convergence-inventory.json` contain every item plus seven closed source findings. Three remaining partial obligations are explicit: CV-A (high), CV-GATES (high), CV-DELIVERY (medium). No missing, contradicting or unrequested source work was found. Tasks were not appended or changed because the parent explicitly owns and prohibits edits to them; the remaining-work handoff is recorded in the verification artifacts instead.

Standards source review passes because the shared typed boundary rejects ambiguous lifecycle/terminal state, preserves independent financial evidence and does not add a second authority or runtime. Spec source review passes because the original seven findings and their extensions now satisfy their approved source contracts. Full acceptance is still pending:

1. A commit `abe7eeabc7f7bb6993a7b291ffefe49722abd294`: fresh compiled actual-A four-episode/three-arm fixture smoke and valid live-stub smoke, with current source/lock/adapter/build/network/receipt bindings independently inspected.
2. Exact-current F root build/typecheck/lint/test/scripts/policy/index/changeset gates, followed by independent receipt review and final full convergence.
3. Parent-owned scoped commit/draft PR/CI and final acceptance. Merge/deploy/paid activity remain unauthorized.

No requirement has been waived. Governed corpus collection, paid inference and model-quality conclusions remain separate from software evidence.

## Review operation record

No runtime/source/task/index/CI/package edits, staging, commits, pushes, PRs, merges or deployment by the verifier. Zero actual external or paid calls; all test state is synthetic. Original probes were copied byte-for-byte and original outputs preserved. The fresh SQLite database and producer outputs are review artifacts only.

Two verification-harness assumptions were corrected without source changes: the first launcher resolved a mise shim under the synthetic HOME and was rerun with `/usr/bin/node`; the initial ceiling assertion incorrectly used known bill rather than the already reserved upper exposure. A cross-order byte-equality assertion was refined to compare semantics because the presentation history array preserves input order. Final receipts retain the exact successful commands, with these harness limitations recorded separately.
