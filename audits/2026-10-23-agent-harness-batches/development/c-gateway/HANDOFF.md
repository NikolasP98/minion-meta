# C Gateway current candidate handoff

Updated after the approved bounded Astra fixture corrections. This is a qualification checkpoint, not a full-suite, build, independent implementation review or release approval. No commit, staging, push, PR, paid call, live census, production write, activation, merge or deployment occurred. No C process or child-owned tool job remains active at this checkpoint.

Workspace: `/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/c-gateway`; branch `feature/agent-harness-c-gateway`; HEAD/base `cc150b56b2b0d4396d44b9ef6f14b5d772c52db8`. Parent owns commits and PRs. Preserve all 20 original tracked extension UI node_modules bin changes. No dependency or lock edits were made. No child agents were spawned.

Approved scope remains sibling `f-evals/specs/107-harness-gateway/**` and parent `specs/2026-10-22-agent-harness-reliability-and-proactivity-spec.md`, covering A11–A16/A20gateway/A30gateway. Root's advisory `sdd/c-gateway-cron-baseline-escalation.md` SHA256 `94a1a4224392828c92973f418a44b638cad2e39ab5695071c19f96076c48f13f` explicitly approves the two test-only corrections below without runtime reset-policy or normative SDD changes.

## Exact current source checkpoint

- `source-manifest.json` SHA256: `0281116f467587f5bf800b479799984dfb472f5c47848f9c14d41c7654fbd5ff`.
- `candidate.patch` SHA256: `c204df732fabce898237b711c95a3ac387a88ca309783e5434cfbddcf4bd47aa`.
- 58 candidate files, including 55 TypeScript files; 20 preserved installation-noise files excluded and separately hashed; zero root build files yet.
- `candidate-untracked.tar.gz` and its hash are referenced in the source manifest. It preserves untracked source modes and contents. `freeze-candidate.py` reproduces these artifacts; rerun after final build/source changes.
- `candidate-files-current.json` is the exact final-format/lint file list. No product source change was needed in this resumed fixture-fix pass.

## Resumed fixes and proof

1. The declared full suite exposed seven skill-filter failures. Focused reproduction in the actual unit project returned 7 failed / 2 passed. Five fixtures supplied configured scout/general/silent/weather agents but mocked the default resolver to impossible `default`; two model-fallback fixtures claimed scout overrides while omitting scout from configuration. The repair retains the actual default resolver in the partial scope mock, configures scout in the fallback cases, and mocks the catalog module actually imported by the runner. No binding/runtime fallback was weakened. All nine assertions now pass.
2. The five native delivery crash cases reproduced the same pre-barrier `CHAT_CHANNEL_ORDER` TDZ. The formatter had sorted the earlier static registry-first import back behind outbound imports. The child now statically initializes the actual registry and dynamically imports outbound/store helpers afterward. This boundary survives import sorting. All five real subprocess kill cases pass after final formatting; provider/queue checkpoint behavior remains real.
3. The webhook E2E fixture now partially wraps the actual fetch guard, injects deterministic public DNS only for the two synthetic `.invalid` hosts, retains the real SSRF and DNS-pinning implementation, and releases the returned dispatcher. All original URL/method/token/body/legacy fallback/empty-summary assertions remain, and exact lookup calls are asserted. Stub fetch prevents HTTP calls; these fixture hostnames perform no external DNS lookup.
4. The stale fresh-every-invocation test now asserts documented fresh stable-session reuse. The unequal-ID/run-key assertions are preserved in a new deterministic idle-reset-expiry case through the real isolated runner. Another real-caller case proves separate job and configured-agent namespaces do not inherit one another's identity. No runtime forceNew or global reset policy was changed.

All expanded cron cases now pass without filters or skips: 22/22. The original 20 cases remain, with the stale expectation reconciled to the documented policy and two new cases strengthening coverage. The earlier four-case discriminator used a name filter only as a diagnostic; the final expanded receipt is unfiltered.

| Current evidence | Result | Log |
|---|---|---|
| Skill red reproduction | 7 failed / 2 passed | resume-skill-red.log |
| Native subprocess red reproduction | 5 failed before barrier, TDZ | resume-delivery-red.log |
| Skill green | 9/9 | resume-skill-green.log |
| Native subprocess green after initial format | 5/5 | resume-delivery-green.log |
| Four cron discriminators | 4/4, diagnostic filter only | resume-cron-discriminators.log |
| Complete expanded cron E2E | 22/22, no name filter or skip | resume-cron-expanded.log |
| Existing session reset policy suite | 7/7 | resume-cron-session-policy.log |
| Final changed-file formatting | exit0, 58 files | resume-format-final.log |
| Final explicit changed-file standard lint | zero warnings/errors, 55 TS files | resume-scoped-style-final.log |
| After-final-format skill + actual gateway binding + native subprocess regressions | 3 files / 18 tests pass | resume-after-format-regressions.log |

Exact argv, cwd, UTC timestamps, exits and elapsed seconds are in `commands.jsonl`. All these tool sessions completed; no agent-final process handoff is being attempted again.

## Earlier passing proof retained

`HANDOFF-first-checkpoint.md` preserves the first checkpoint narrative and is historical. Its RUNNING test/watch and unresolved two-E2E-failure statements are superseded here.

The actual certified-hook authority/store/queue/runtime work was preserved. Recovery added bounded generation-fenced persisted authority observations and monotonic export revisions; revoked/reassigned/disabled received work keeps its bill but cannot publish or admit a new shadow gate. Actual hook and trusted injected shadow tests pass. A gate-negative shadow still retains baseline and complaint materialization. Provider receipt identifiers become hashes in retained queue tombstones and a receipt digest in seven-day SQLite redaction. Actual async message_sending preparation crossing expiry sends zero calls.

Earlier focused receipts: core 8 files/107 tests, authority/store/bridge/export 4 files/19 tests, async expiry and actual hook/trusted shadow 2 files/17 tests. Earlier explicit type-aware lint passed on 52 TS files, but three subsequently modified test files increase the current scope to 55 and require final type-aware validation.

`check-final2.log` records a prior full pnpm check exit0 on the earlier candidate: 5999-file format, tsgo, core type-aware lint, manifest/capability checks. The 57 core warnings are each in a file byte-identical to HEAD (`lint-warning-baseline.json`). The current new test fixture source still needs the final full check. The repository ignores extensions in normal lint; `oxlint-scoped-config.json` copies all rules and removes only that ignore for explicit watcher verification. The first --no-ignore attempt still honored config ignores and is not watcher evidence; corrected actual-coverage logs are retained.

The native queue→SQLite→actual owner selection→seven-day redaction smoke passed (`native-retention-proof.log`, reproducible `.mts`): two provider confirmations, one keyed pending row with original one-hour window, preset2-to-beta forwarded once, two retained hashed queue tombstones, all private copies erased across four tables and queue, duplicate admission still existing and provider calls still two. This is local stub runtime evidence, not deployed or paid qualification.

## Full-suite truth and remaining gates

The original child-owned full test was killed when this agent returned; the root watcher correctly recorded incomplete, never pass. Root reran the declared command and stopped its owned coordinator after the known seven skill and five native-child failures; `test-full-root.log` / commands.jsonl record exit1 after567.13s. Those twelve focused failures are now corrected and green, but no completed full pnpm test pass exists. A root build has not yet run.

F currently owns the team heavy-job slot. C intentionally holds full check/test/build until root releases it. Parent can own the long full suite persistently after F ends; this agent must never final while its own long tool job is active. Do not infer a full pass from focused receipts or killed coordinators.

Queue these exact final gates from the C clone, serially with the root heavy-job allocation:

1. Explicit type-aware max-warnings0 lint over all `.ts` paths in candidate-files-current.json using oxlint-scoped-config.json (55 files, includes watcher and the three updated fixtures).
2. `pnpm check` (includes tsgo); correct real candidate errors and retain unchanged warning evidence without broad cleanup.
3. `OPENCLAW_TEST_VM_FORKS=0 OPENCLAW_TEST_PROFILE=serial OPENCLAW_TEST_WORKERS=1 pnpm test`, root-owned to durable completion. This normal gate excludes *.e2e files, so it cannot substitute for the already-passing expanded 22-case receipt. Diagnose any additional failures before deciding scope; no skip/assertion dilution.
4. `pnpm build`, recording real command outcome and any declaration-generation warning rather than treating a swallowed warning as declaration proof. Verify lock unchanged and keep the original installation noise excluded.
5. If final changes warrant it, repeat affected/runtime checks; the formatter-stable native bootstrap regression is essential. Rerun freeze-candidate.py after the final build/source state, then obtain independent Standards and Spec code review and close the A11–A16/A20gateway/A30gateway acceptance trace plus T030 joint D/F evidence.

No known unresolved implementation gap is being silently deferred. The two Astra-escalated E2E failures are fixed; no TODO ledger is needed for those resolved conditions. Required qualification and independent review are still pending parent coordination, so this is not a completion claim. If a later genuine gap is retained, exact-site TODO(handoff) plus parent-owned meta proposal remain mandatory.

## Pins and cross-group handoff

Node22.23.3, pnpm10.29.3, installed Drone0.6.0. Lock SHA256 `2fbb2f37e8c7c0cc8c0297eb9e800ff35c39606b9fffaf8c439e6aeb9d968649`; SDK dist/types.d.ts `79ea1737f1b5f02251bc4244a34fb8332e5041f547f7d8760cd50e1e0efd97b9`; SDK dist/run.js `8616e0559081a095a05bdc28e562e25413ebc9f7792e82421b6f64f45f68e79a`.

F interface remains `extensions/alert-watcher/src/complaint-evaluation.schema.json` SHA256 `08897441bc823a5c6cb265065ba6a3cfb102b7fb7751a4e2f6aaf283f041c6ff`; emitted `src/fixtures/complaint-evaluation-v1.json` SHA256 `90e2509a53ad5bc8ee9bb79d1b641cd8382a3e46b013e84b009fb3aef52ea565`. F received the paths/hashes and knows no final C source commit exists. Parent owns final commit pin and the D `cron-binding-v1` local-source/build qualification handoff; no deployed gateway qualification is claimed. Prior /tmp C logs/emitter remain copied in prior-tmp/.
