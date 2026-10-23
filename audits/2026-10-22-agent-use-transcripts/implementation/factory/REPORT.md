# Factory Slices 6–7 implementation proof

Status: local implementation and validation complete; independent gateway-agent review closed the failed-receipt finding for A06/A07 (see ../factory-independent-review.md). No commit, push, publication, merge, deployment or paid inference.

Scope: approved agent-harness spec §5.1 and A06/A07. Source is isolated clone `/home/nikolas/.cache/codex-implementation/2026-10-22-agent-harness-wave1-7k23gajh/minion-factory`, branch `feature/agent-harness-wave1`, base `43a174b2e87c4d572ffd2ba030269db22a0b7bd2`. Exact changed file hashes and lock/version identities are in `source-manifest.json`; reviewable diff is `changes.patch`.

## Observable behavior

- Caller-provided logical decision IDs survive explicit retries; every attempt has a fresh UUID. IDs, requested model and input/question hashes are pinned before awaiting the provider. Proxy ignores caller attempt IDs and binds run identity to its capability.
- Central authoritative rows and shell comparison rows share attempt identity and provider facts. Direct calls state host/direct-container origin and allocate UUIDs. Legacy three-argument calls remain supported; fixed tags are file suffixes, never identities.
- Known provider receipts survive invalid answers and HTTP error responses independently of semantic success in both runner/proxy and direct shell transports. Bounded model/token/cost fields are retained; raw malformed bodies are not copied into logs. Missing bills remain null. Proxy and spec-grounding preserve known failed-call costs while retaining existing admission policy.
- CLI report reconciles by version/run/attempt plus model/site/input/question/schema/gate bindings and normalized usage/cost facts. Exact duplicates become one attempt/bill/comparison. Conflicts quarantine the entire attempt, including cost; local proxy copies cannot establish central authority. Historical identity/origin omissions stay raw/unjoined/unknown and do not enter cost/calibration denominators.
- Counts distinguish raw rows, attempts, logical decisions, successful baseline pairs, independent labels, failures, unresolved/conflicting rows and known/unknown bills. Resolved model/question/schema/gate/scale cohorts remain separate. Baseline agreement is explicitly not correctness. Rank retains raw score pairs and withholds absolute score error without a verified, revisioned compatible-scale mapping. Existing generative ranking readiness/recommendation/rationale/evidence path is unchanged.

## Evidence

| Check | Result | Log |
|---|---|---|
| Proxy identity red test before implementation | Expected logical-ID assertion failure (14 passed, 1 failed) | proxy-red.log |
| Report dedup/conflict/unknown/cohort red tests | Expected 2 failures before implementation | report-red.log |
| Focused runner Jev/proxy/sites/spec-grounding tests | 72/72 pass | runner-green.log |
| Full runner npm test after receipt correction | 1239/1239 pass | runner-full.log |
| Report fixtures | 16/16 pass | report-green.log |
| Real shell dispatch, direct/proxy identity, legacy calls, unknown bills | Pass | shell-green.log |
| Shell site/ranking/cost contracts | Pass | shell-sites.log, ranking.log, cost.log |
| Bash syntax and changed-shell ShellCheck | Pass | shellcheck.log |
| Runner npm run typecheck | Pass | typecheck.log |
| Explicit TypeScript emit build | Pass; runner declares no build script | build.log |
| Adjacent guard contract | Initial concurrent timing assertion 1197ms exceeded 1000ms; isolated rerun passed, no guard source edits | guard.log, guard-rerun.log |
| Shared independent read-only review | 392/392 package tests and source/archive review | ../shared-independent-review.md, shared-independent-review.log |

The actual transport integration runs Bash/curl through a loopback HTTP proxy handler and a provider fetch stub, then consumes the emitted central and local logs through CLI --runs-dir. Success and malformed noul=2 cases each make one stub provider call with 7 input/3 output tokens and an explicit $0.01 bill. Both report two raw rows and one bill; the malformed case additionally reports one failure and zero successful baseline comparisons. Direct shell HTTP200-invalid and HTTP422 fixtures additionally preserve the bounded receipt through error files, local JSONL and the actual CLI. Grounding known-failed and missing-receipt fixtures prove nullable incomplete totals and a separate known subtotal. The legacy shell reader preserves that known subtotal from nullable artifacts. No live provider network admission occurs.

Exact install: `cd runner && npm ci`; unchanged package-lock SHA-256 `d7ade2cccd7be266c32310df1ab93fd4f322467540b920a8f2cdfe6a51f407d4`. Node22.23.3/npm12.2.1; TypeScript5.9.3, tsx4.23.12, Express5.2.1, better-sqlite3 12.11.1. Install reported pre-existing one moderate/one critical dependency advisory; no lock rewrite or npm audit fix was performed.

## Standards review

PASS for this scope. Followed clone/meta instructions and minion-engineering. Only thirteen owned/necessary files changed, including the dependent spec-grounding aggregator/tests and the minimal compatible known-subtotal reader/test. No new any, ts-nocheck, package manager mixing, production writes or original-checkout edits. Provider receipts are parsed from unknown input and bounded. Shell keeps argument compatibility, fail-open status codes and key/capability handling. git diff --check and changed-shell lint pass.

## Spec review and continuation

A06/A07 pass with runtime and fixture proof above. No A08/A09 admission/deadline policy implementation was attempted. Known incomplete exposure in durable run accounting remains deferred: the numeric DB/caller API and legacy *-result.json sum cannot represent unknown exposure or every *-error.json failed bill. Exact TODO(handoff) comments at agent/lib/cost.sh, Jev direct/proxy error writers and the spec-grounding numeric return point to the current proposal. These are known-subtotal compatibility APIs; no complete total-spend/cap proof is claimed. The new nullable artifact retains known_cost_usd, and the minimal legacy reader fallback preserves that subtotal rather than dropping it. Aggregate historical/summary rows cannot reconstruct stable per-attempt identity and remain raw/unjoined; no invented joins are made.

The unverified ten-criterion versus ledger 0–10 rank mapping is explicitly retained as a future qualification, not assumed correct. Exact `TODO(handoff)` is at the rubric comment in `agent/rank.sh`, pointing to matching `proposals/2026-10-22-agent-decision-and-proactivity-experiments.md` and spec §5.1/Slice7. Parent owns the corresponding proposal ledger entry. No runtime promotion criterion is inferred from baseline agreement.
