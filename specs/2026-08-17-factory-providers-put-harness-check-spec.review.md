---
spec: 2026-08-17-factory-providers-put-harness-check-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-17
---

# Pass 2 correctness review

- Set the spec to pass 2 with approved status/verdict and the required update date because no issue requires a product decision.
- Qualified `HARNESSES` as the runner's TypeScript source of truth because the shell dispatch tables remain independent executable implementations checked for drift.
- Defined deterministic precedence when a registry has both unknown and missing keys so error assertions and UI output are reproducible.
- Replaced both `git stash` red-state checks with disposable-clone checks at preserved test-only commits because stashing also hides new tests and can yield a meaningless green result.
- Required fixture coverage for matching, drifted, and unparseable harness dispatch blocks because the former manual `sed` commands depended on exact indentation and temporarily modified tracked files.
- Corrected local server startup/cleanup to retain `FACTORY_DATA`, capture the actual PID, and wait for that process rather than relying on shell job `%1`.
- Marked verification blocks as Bash because they use arrays, here-strings, or process substitution and were not portable shell commands.
- Corrected the drift-guard description from an unspecified regex to a narrow parser contract while explicitly allowing a regex implementation.
- Removed invalid `export` syntax for Bash arrays in the deployment verification.
- Changed the deployed valid PUT to round-trip the captured live registry because the former hardcoded payload could alter operator tier configuration and made the subsequent no-diff assertion contradictory.
- Added before/after run and PR counts because the former zero/unchanged claims had no reliable baseline and referenced an unverified run field.
- Updated the ship gate to require the two test-only commit hashes and the drift parser fixture results, matching the corrected red-state proofs.
- Corrected the queued-run out-of-scope cross-reference because A3 describes API narrowing, not persisted queued runs.

No human decisions are required.
