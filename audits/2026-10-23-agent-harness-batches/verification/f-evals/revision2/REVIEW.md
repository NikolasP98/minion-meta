# F independent revision2 source review

Standards: **changes requested**. Spec: **changes requested**. The two exact revision1 counterexamples are corrected. One extension of F-02 remains: conflicting terminal collection receipts are resolved by file order. This is a bounded source checkpoint; final A/C source bindings, actual-A integration and full root gates remain required.

## Reviewed source and scope

Frozen F runtime SHA-256: `119b81d8e62f4e4903c54039c3050b87ea6eb8e22e804de8582ef5968a7f2607`. All 92 owned file hashes matched the author packet before and after review; `sourceDigest()` independently returned this runtime hash. Metadata HEAD is separate and was `41c45954bfa07fc407f0e811f58ba76692be2356`. Lock SHA remains `15cbb75ffccdb3aa06ec97b776f3ed9bc0ff1ff68c10b1718741b32ea855f75a`.

Author checkpoint SHA: `a67336dbc20de357a1d03b011c9a3db669e939ac76a32e346d64af46203f5a65`; patch SHA: `f64d831c85454bac8012c086d0e658b95fac7ae6d727f4f800ef5ffdcc3348ab`; owned archive SHA: `ab837a56b44501bc9c40320200ea822d469f6a46eae5b0950930ed41cfb81d2b`. The frozen archive is retained with this review. Source identity and exact delta are in `source-identity.json` and `reviewed-source-delta.patch`.

Reviewed all changes to `lib/run-evidence.mjs`, `complaint.mjs`, the new revision2 regression tests, README/correction documentation and the byte-identical C exporter snapshot, plus the receipt validator, report consumer, manifest reader and screen shared-reader call path. Previous unchanged-area review and evidence remain in revision0/revision1; their qualification has not been upgraded silently.

## Remaining finding: F-02-R2, high

**Conflicting terminal collections with distinct record IDs can qualify complete success, depending on file order.**

`lib/run-evidence.mjs:103–104` selects the first reset and collection using `find`; `:291–316` checks only that selected collection, and `:328–332` copies its completion/outcome/critical fields into the observation. UUID deduplication cannot reconcile two distinct collection record IDs that describe the same terminal episode/arm/root/submission.

Independent reproduction uses an actual live CLI run with synthetic trust, a deny-network stub and a known USD 0.0000001 bill per arm. It appends a second typed collection for each trial with a fresh UUID, identical lineage and `complete:false`, `outcome:'indeterminate'`, `missing:['required-domain-receipt']`. The complete receipt stays first in one input; the same records are reversed in the second. Actual `report.mjs --run` exits 0 in both cases:

| Order | Successes per arm | Execution coverage | Report reasons |
|---|---:|---:|---|
| Complete collection first | 1 | 1 | Only ordinary human-corpus/power deficits |
| Incomplete collection first | 0 | 0 | Adds `incomplete_receipts` |

Known billing remains complete and retains approximately 0.1 micro-USD per arm in both cases, as required; IEEE floating representation is `0.09999999999999999`. A contradictory terminal record must not disappear because another record precedes it. This violates FR-001/004/005, SC-001/003 and US1 acceptance 2; the same shared reader also supplies screening.

Smallest correction: require one unambiguous terminal collection for the trial after exact-record deduplication. Quarantine conflicting terminal evidence independently of file order. The current format has no collection revision/supersession field, so do not infer monotonic authority from ordering. Preserve idempotence for an exact same-ID re-export, and preserve independently known bills when execution evidence is rejected. Check equivalent singleton lifecycle selection where relevant, without changing the approved receipt protocol silently.

Proof: `probes/collection-terminal-conflict.mjs`, `collection-terminal-conflict-result.json`; raw command outputs and run receipts are in the synthetic evidence archive. The original six probes and revision1 probes remain unchanged.

## Verified corrections and checked risks

- F-01 remains corrected: all actual repeated trials, bills, successes and latencies stay inside matched episode bootstrap clusters. The preserved independent matched/unmatched repeat counterexamples retain their expected estimands and inconclusive unmatched-set result.
- F-02 original foreign lineage and unknown-bill/cached-known counterexamples remain corrected. Known execution can succeed while financial coverage is unknown. F-02-R1's required global identity/prepared records, frozen pins and single-collection contradictions now fail execution qualification without erasing independent known bills. F-02 remains partial only because of the terminal conflict above.
- F-03 expiry still prevents a new wire call after expiration, including expiration after reservation fsync. Proven pre-dispatch work retains its reservation and known-zero settlement; ambiguous transport remains fenced.
- F-04 opaque hashed raw filenames contain traversal-like episode IDs. The actual redact CLI removes all seven raw files and retains receipts/accounting.
- F-05 the original 100-copy trace counterexample still rejects an impossible fixed unique review budget.
- F-06 is corrected, including F-06-R1: accepted same-known-amount coverage refinements and known zero are order/duplicate independent. Invalid later coverage downgrade stays quarantined, retaining the known charge and unknown coverage. No valid earlier known bill is removed.
- F-07 current/historical C eligibility separation remains correct on the supplied actual-producer snapshots. Current authority can become ineligible without removing historical paid units; final C commit provenance is still pending.

The new independent deep-boundary probe has 13 report scenarios and 12 complaint cases. It verifies identity cannot be made optional by omitting `adapter_identity` from expectedKinds; same-ID exact global re-exports remain idempotent; conflicting same-ID and second distinct identities fail; foreign protocol/inventory and missing/foreign prepared evidence fail; missing/quarantine/critical/network contradictions fail; cached success claims cannot replace required identity. Every rejected execution case retains the positive fractional bill and billing coverage. Complaint cases cover positive and zero known amounts in forward/reverse/duplicate histories, including invalid future downgrades in all three orders. See `revision2-deep-boundaries-result.json`.

## Execution evidence

Six unchanged independent probe files were replayed with byte hashes; the expiry probe ran both variants, for seven executions total. All wrappers exited 0; expected child CLI failures are recorded explicitly. See `unchanged-probe-executions.json` and the result JSON files. Both new deep-review probes also exited 0, one recording the proven remaining defect.

`node --test --test-concurrency=1 scripts/agent-evals/revision2-regressions.test.mjs`: independently executed author assertions, **2/2 passed**, zero failures/skips/TODO, 6.62 seconds TAP duration. This is separate from the author's supplied 56/56 terminal suite, which was not rerun during the heavy-gate restriction.

Four actual C checkout-backed public CLI commands were independently rerun: `complaint.mjs` and `report.mjs --complaint`, each for the retry18 and authority6 exports. All exited 0 and outputs were byte-identical to the author packet. Retry input yields two logical sources, one attempt and USD 0.000009; authority evolution yields two historical eligible sources, zero currently eligible, two attempts including known zero, total USD 0.000009, no unknown bills and no quarantine. These remain inconclusive, never activation authority. See `actual-c-public-cli-independent.json`, `actual-c-{1,2,3,4}.json` and `actual-c-source-identity.json`.

C base HEAD is `cc150b56b2b0d4396d44b9ef6f14b5d772c52db8` plus exact workingtree contents, not a final reviewed source commit. Actual schema SHA `08897441bc823a5c6cb265065ba6a3cfb102b7fb7751a4e2f6aaf283f041c6ff`; exporter SHA `957644df067c92ac1337129bcfd903b18c13baa09e5058f327dc762bbd16951c`; both match the F snapshots byte-for-byte. The author's same-SQLite producer-history run was inspected, not independently re-executed during this revision2 checkpoint.

Spec Kit prerequisite check passed using the absolute feature directory and `SPECIFY_FEATURE_NO_PERSIST=1`. The 69 intent rows plus seven findings are updated in `convergence-matrix.md`. No parent-owned task/index/feature metadata was modified.

## Separate review axes and remaining proof

Standards changes requested: shared typed evidence and conservative financial separation are improved, but first-record selection still hides contradictory terminal state. Strict manifest validation, global provenance guards and monotonic billing refinements were reviewed and exercised. No dependency, credential or production boundary was added by the correction.

Spec changes requested: exact revision1 defects close, but conflicting receipt completeness still violates the specified fail-closed execution contract. Final reviewed A/C commit pins and provenance, current actual-A four-episode/three-arm fixture smoke and valid live-stub smoke, final actual-C public command reruns, allocated root gates and final independent convergence are unfinished mandatory proof. Parent-owned scoped commit/draft PR/CI remains subsequent delivery work. No final artifact provenance was invented, no paid/model-quality/human-corpus qualification is claimed, and no requirement is waived.

All operations in this review were offline/local with disposable synthetic state. Zero actual external or paid requests. No source, SDD, metadata, package, CI, stage, commit, push, PR, merge or deployment changes by the verifier. No heavy root gates or browser work. The explicit read-only review assignment overrides writing source TODO handoff comments; remaining work is recorded here for the parent and implementer.
