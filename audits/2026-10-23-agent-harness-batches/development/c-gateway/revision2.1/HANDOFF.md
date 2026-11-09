# C Gateway revision 2.1 compiler fixture correction

The two helper compiler errors are corrected. No product code, assertions, dependencies, lock, branch, staging or commits changed. No owned jobs remain. Root owns the required full `pnpm check` → main `pnpm test` → `pnpm build` retry and final review/qualification.

## Candidate identity

- Workspace: `/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/c-gateway`.
- Branch: `feature/agent-harness-c-gateway`; HEAD/base: `cc150b56b2b0d4396d44b9ef6f14b5d772c52db8`.
- Final source manifest SHA256: `e5b6de5ca3d91e9c8ce676cb10acae3f6a575ed7179703568d138edaecfc15dd`.
- Tracked patch SHA256: `8c781a39a4b605a7ce5ba2161330e09f6ece11554dc411a3d6addc0b722fbe89`.
- Mandatory untracked archive SHA256: `b0826a3dae776deaf8f4764463aae6ecb8483528d45d07da9709c6c241b1fcec`.
- 66 candidate files; exactly the two helpers differ from revision2. The other 64 files are byte/mode identical. All 20 installation-noise files, SDK and lock pins are preserved and verified. HEAD alone is not the uncommitted candidate identity.
- `input-revision2/` preserves the earlier `68edfa7e8587f33db1a7dd14026100df9c9ac241ced6d202144db69bf00c6d12` manifest, complete patch/archive, handoff, evidence, and failing full-check log/command ledger. `two-helper-correction.patch` is the bounded review diff; full patch plus untracked archive identifies the complete candidate.

## Changes

`retention-process.ts` initializes `httpHandlers` with the canonical empty array required by PluginRegistry, preserving supported native bootstrap before outbound imports.

`suggestion-process.ts` preserves both SQLite StatementSync.run signatures explicitly. A typed guard distinguishes named parameter records from blob/typed-array and scalar positional inputs before forwarding to the original bound native run method. Observation still happens after the actual write/commit, uses the original serialized suggestion, and never fabricates SQLite state. No any, ts-nocheck, lint suppression, test skip or weakened assertion was introduced.

## Evidence

- `native-helpers.log`: both affected files, all 15 tests pass (suggestion admission/terminal/materialization child kills plus all live retention/fresh-process tests), forks/maxWorkers=1; wrapper exit 0 in 48.026 seconds.
- `lint-helpers.log`: explicit no-ignore type-aware lint of both changed helpers, 0 warnings/errors, exit 0 in 4.096 seconds.
- `format-check-helpers.log`: both helpers pass formatting, exit 0.
- `sqlite-overloads-typecheck-corrected.log`: actual extracted observer source compiles against the installed Node declarations with both positional/named call forms, exit 0. This is a narrow compiler proof, not a full-project typecheck claim. The first compiler-probe invocation omitted the installed tsgo CLI's required --ignoreConfig flag; its TS5112 diagnostic is retained, and the corrected command is recorded.
- Exact commands/cwd/start/exit/duration are in `commands.jsonl`; hashes in `correction-evidence.json`.

The previous root full check failed with exactly the two reported helper errors and did not authorize a main-test/build pass. That red log is preserved. Earlier revision2 runtime/probe/integration evidence remains retained; parent reports independent Astra source/probe verification green before this two-helper correction. Final full gates and final review disposition remain pending and root-owned. No paid calls, real network calls, external sends or production writes occurred.
