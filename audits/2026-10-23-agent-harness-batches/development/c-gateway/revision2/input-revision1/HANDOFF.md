# C Gateway correction checkpoint

State: software corrections for C-IR-01/02/03 implemented and bounded verification green. Candidate remains uncommitted. Full required gates and independent Astra rereview are pending and owned by root; this is not final acceptance or a release claim.

## Exact candidate

- Workspace: `/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/c-gateway`
- Branch: `feature/agent-harness-c-gateway`; HEAD/base: `cc150b56b2b0d4396d44b9ef6f14b5d772c52db8`.
- Source manifest SHA256: `06eb968c11873d48218cf619b90e8b479d145500788d220947a4626adee1493d`.
- Tracked patch SHA256: `c204df732fabce898237b711c95a3ac387a88ca309783e5434cfbddcf4bd47aa`.
- Untracked archive SHA256: `ebe16c737b9ca58d45a2554e49a285228248d06b26d41054143aa225fc77fe57`.
- 61 owned source files, enumerated in `owned-files.txt` and `source-manifest.json`, with modes and SHA256. Both the patch and untracked archive are required: the unchanged tracked-patch hash alone does not identify these corrections, because much of the new runtime is untracked.
- 20 installation-noise files are preserved and explicitly excluded. No lock/dependency changes, commits, staging, push, PR, paid calls, or production writes.
- Earlier 58-file checkpoint is retained in `input-58/`; root-level earlier evidence remains intact. No `dist` artifact exists at this checkpoint.

## Corrections

C-IR-01: first confirmed send settles only the original reply-recipient subset that still has current destination membership and the frozen account/owner binding. Authority is checked again after external send awaits and before the first-sent SQLite transaction. Known accepted sends and bills remain retained even if no current reply grant survives. An empty grant produces a closed pending row. Existing pending rows cannot widen recipients, restart the window, or clear claimed state. Actual bridge/queue/owner-reply tests cover revocation, missing binding, reassignment, and revocation during send.

C-IR-02: the opted-in installed SDK observer persists a `may_have_submitted` marker synchronously under the current lease owner/generation/attempt before the provider boundary. Failed writes and stale leases stop dispatch. New private attempt JSON starts as `preparing`; only proven SDK NO_API_KEY before that marker becomes `not_submitted`. Such private invocation history stays bounded and contributes elapsed time, but never appears as a paid attempt, unknown exposure, or public attempt reference. Ambiguous/network/post-provider errors remain conservative. Actual SDK credential resolution precedes host.resolveSkillsPrompt; the observer composes that actual preparation method before dispatch. Ordinary callers without observers still call the original SDK directly.

No new public C/F schema fields or SQLite columns were introduced. The private optional JSON dispatch-state field requires no DDL migration. Legacy admitted rows without the marker remain conservative unknown/may-have-submitted and cannot gain a free safe retry. Recovery after an admitted preparing operation loses its lease is uncertain, never silently free. The new native kill barrier proves the committed marker survives a process kill before any provider call.

C-IR-03: resultId stays null and baseline disposition unknown while a legal pre-dispatch retry remains possible. Terminal result identity is then stable. Public aggregate cost coverage remains incomplete while future paid work is still possible. The per-invocation failure history is retained privately. The self-contained C golden covers 18 real exported revisions, including safe retry and exhausted no-key sequences.

## Bounded evidence

All exact argv/cwd/start/exit/duration records are in `commands.jsonl`; full logs are retained beside this file.

- Three original independent probes rerun unchanged against final formatted source: `probe-revoked-reply-final.log`, `probe-no-api-key-final.log`, `probe-retry-export-final.log`, each exit 0. `correction-evidence.json` verifies each script SHA equals the original review evidence and records the original failing exit 1.
- `receipt-regressions.log`: 5 files / 33 tests pass. Subsequent final elapsed-time correction was rechecked by `receipt-final.log`: 2 files / 15 tests pass, including actual SDK NO_API_KEY, zero provider bills, elapsed 7ms, lease/write fail-closed boundaries, private IDs, retry revisions, and actual reply revocation.
- `watcher-all.log`: 27 files / 207 tests pass before the additional native marker barrier and final elapsed aggregate adjustment. Do not describe this as a final complete watcher rerun.
- `native-crash-retention-host-regressions.log`: 5 files / 28 tests pass, including the added marker barrier, all 5 actual delivery child-process barriers, retention/fsync, actual host preparation, and 9 skill-filter tests.
- `cron-expanded-final.log`: both expanded cron E2E files, all 22 cases pass with forks/maxWorkers=1. The approved deterministic public-DNS fixture and stable-fresh/expired-reset expectation corrections are retained; no runtime session-policy change.
- `pulse-wire-handler.log`: 5 handler tests pass. The newly pinned actual D capture contains two profiles and passes actual cronHandlers → CronService → persisted store → execution callback, retaining explicit agent/session scope, delivery none, delete-after-run, and payload. The copied wire SHA is `63be47ba3e431c6079f314059736fa3013dc6e5c23bbda23a048487293ee215b`.
- `c-f-final.log`: actual readonly F reconciliation/report implementation consumes C's 18 golden revisions: 2 logical records, 1 paid attempt, USD 0.000009 known, zero unknown attempts, zero legal-retry quarantines. Terminal replacement and conflicting same-revision bill remain rejected. F consumer identity is pinned in `correction-evidence.json`. Gateway CI uses only the C golden/unit test and requires no meta checkout.
- `format-frozen.log`: all 61 source files formatted, exit 0.
- `lint-type-aware-complete.log`: explicit no-ignore scope covering all 56 candidate TypeScript files, 0 warnings / 0 errors, exit 0 (6.883s wrapper duration). Initial scoped lint ignored extensions; this corrected run uses the explicit config with that ignore removed. Earlier failed lint logs remain retained honestly.

## Root continuation

No owned jobs remain. Root should run final required `pnpm check`, main `pnpm test`, and `pnpm build` in its persistent supervisor after the current D heavy allocation releases, preserve receipts and actual failures, and rerun any affected focused gates if source changes. Complete independent Astra C rereview/convergence against this manifest. No complete full-suite pass or final build is claimed here. Prior interrupted/stopped full-suite logs do not count as passes. Root owns final source/commit pins and cross-repo qualification; no software finding is silently deferred by this handoff.
