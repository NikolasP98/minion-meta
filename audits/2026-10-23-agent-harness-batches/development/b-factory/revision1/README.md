# Factory group B correction, revision 1

B-V1 is corrected locally and ready for bounded independent Astra re-verification. The prior candidate and all prior logs remain in the parent directory.

## Candidate identity

- Source manifest: [source-manifest.json](source-manifest.json), aggregate `4a9ad22073efc509dc8c11e4ad0c8ea912bf7c2d5b34f0680b2535571ee0001a`.
- Superseded candidate: `def8080c0ace0a08d8e26e8700b4f8269f0c1d5bc9cce944d072c3baabf10b25`.
- Base `5e28c7ae8c2bc9a7e2fef1da052f0ae2fbe86810`, branch `feature/agent-harness-b-factory`, 25 affected files. Exactly five files changed from the prior candidate: `agent/lib/{jev-accounting.py,cost.sh,jev.sh}`, `runner/src/{jev-accounting.ts,jev-accounting.test.ts}`.
- The dependency lock remains `d7ade2cccd7be266c32310df1ab93fd4f322467540b920a8f2cdfe6a51f407d4`.
- [Tracked patch](factory.patch) and [new source snapshot](untracked-source.json) preserve the full corrected candidate. The source manifest records hashes and modes for every file and the five-file correction delta.

## Correction

Python and JavaScript now encode each numeric receipt-hash input as the same big-endian IEEE754 binary64 hexadecimal value in a typed object. The hash no longer depends on decimal/exponent JSON spelling. Python parses integer JSON tokens at the same binary64 boundary as JavaScript, so large integer token spelling cannot change sums or revisions between the two readers.

The cost values themselves remain numeric and retain their precision. Both readers no longer quantize subtotals to six decimal places. `sum_cost_usd` retains its existing six-decimal presentation only when parsing that text yields the exact original numeric value; smaller or higher-precision bills use a lossless numeric representation. This preserves the legacy numeric API without turning tiny known bills into zero. Revision matching, receipt attribution, conflict quarantine, known-zero handling and unknown-exposure fences remain enforced.

B-S1's obsolete `TODO(handoff)` in `jev.sh` was removed. The replacement describes the implemented durable dispatcher path for failed and unknown receipts.

## Regression and gates

- The preserved independent `tiny-cost-chain.mts` was executed unchanged before and after the fix: [red](tiny-cost-chain-red.log), [green](tiny-cost-chain-green.log). All three actual workers now emit matching revisions and settle the exact known `$0.000001` bill through guard cleanup → result emitter → FinishResult parser → queue/reservations.
- The repository regression repeats the actual three-worker path for ordinary, `1e-6`, `1e-7`, fine-precision, known-zero, minimum-subnormal and binary-fraction bills. Unknown and denied cases retain their prior protections.
- Cross-language fixtures cover signed zero, minimum subnormal, minimum normal, exponent thresholds, ordinary decimals, adjacent floating values, large integer tokens, `1e20`, `1e21`, maximum finite binary64 and null. Known zero and unknown/null hash differently; distinct adjacent bills remain distinct.
- [Focused suite](focused.log): **46 passed, 0 failed**.
- [Declared full runner suite](runner-full.log): **1,268 passed, 0 failed, 0 skipped**. Typecheck passed.
- Required Jev/cost/guard/deadline shell tests, ShellCheck, Bash syntax, 16 report tests and actual spec worker integrity dry runs passed. Exact logs and dispositions are in [verification.json](verification.json).

## Fresh installed-hook proof

The exact native Claude Code 2.1.233 binary and the unchanged hook settings were executed again against loopback-only stubs after the final Python helper and shell-library changes. [The new receipt](pinned-harness.receipt.json) records the corrected helper/library hashes, successful hook response, exactly one stalled Jev request, two local provider-stub turns and completed fixture tool. The hook interval is **3,826.242ms**, below four seconds and the unchanged six-second harness setting. The old proof was not relabeled or overwritten.

No paid model call, commit, staging operation, push, PR, merge, image publication, deployment or production access occurred. Independent re-verification and parent-owned release preparation remain pending. No implementation open end is being handed off.
