---
phase: 14-sdk-transport
plan: "05"
status: executed_candidate_pending_independent_task3_review
requirements: ["SDK-01", "SDK-02"]
completed_scope: "Task1 selection; Task2 package independently verified; Task3 helper candidate executed"
closure_policy: "No whole-phase, installed-package, release or deployed-consumer closure"
key-files:
  modified:
    - packages/workforce-client/src/client.ts
    - packages/workforce-client/src/client.test.ts
    - packages/workforce-client/README.md
    - minion_hub/src/lib/server/workforce-fetch.ts
    - minion_hub/src/lib/server/workforce-fetch.test.ts
    - .planning/phases/14-sdk-transport/14-WORKFORCE-HTTP-PACKET.md
  created:
    - minion_hub/src/lib/server/workforce-http-boundary.contract.test.ts
    - /tmp/minion-360-14-05/vitest.hub-candidate.config.ts
    - /tmp/minion-360-14-05/vitest.hub-installed.config.ts
---

# Workforce JSON transport and Hub helper candidate

The selected package bounds streamed JSON bodies and caller lifetime; the Hub helper carries request cancellation, preserves serialized raw request bytes and projects errors before existing consumers log them or use their statuses. Native Response/ReadableStream and actual route fixtures distinguish the candidate from the installed baseline. Task3 source is frozen for independent review and root's current-source check; this summary does not claim those pending gates passed.

## Scope and implementation

Root selected the pinned reference error patch `c00995ca8127a6906acd6f9368160c61ed3b69171a3480d70c5f0b4bfc2182ce`. Task2 preserved its14 historical regressions and added byte/deadline/OR cancellation, stream cleanup, late-response handling and explicit HTTP/protocol classifications. Candidate defaults are30,000ms and4MiB; they are finite failure ceilings, not measured SLOs. Native failures retain package provenance. The README removes unsafe raw-error logging advice and explains that actual upstream200 is not a valid local error status.

Root implemented Task2. This agent independently reviewed it, found the serialization-to-fetch cancellation gap, then verified the root repair with105 package tests and typecheck. `14-05-VERIFICATION.md` is the scoped Task2 independent receipt, not independent acceptance of this agent's later Task3 work.

Task3 uses the existing exports plus structural options and selected-constructor reflection, so the helper can remain source-compatible with installed0.3.0 while its missing transport capabilities stay visible. The original returned client object receives one request wrapper; namespace closures use that same property. Raw calls use a private per-call injected-fetch adapter: their actual method, serialized body, HeadersInit and remaining RequestInit fields survive, with the candidate signal overriding the original signal only when present. Headers are normalized case-insensitively with admitted trusted-caller precedence. No browser incoming headers or new actor/company authority are introduced.

The helper emits fresh fixed WorkforceHttpError diagnostics. Actual400–599 HTTP statuses remain, invalid successful JSON/oversize/native failures map to502, deadline to504, and cancellation has no invented status. It copies no upstream body/cause/message/stack/URL/headers. Native errors that spoof a policy name/code/status still map to transport_error. Construction and background minting failures also pass through this boundary; identity minting arguments and board-key fallback remain unchanged.

## Frozen identities

Admitted Task3 PLAN: `5437da333b5563e5cdddcd691fab8fb4b6477589ac1f656f6d45804664d771a5`. Task2 admission was `10b76ee73a40e5be655baed88ad66de134523e9ab784ae980006e31c3322fca7`. The complete source/reference selection and candidate/installed manifests are recorded in the packet and temporary configs.

| Artifact | Before SHA256 | Frozen SHA256 |
|---|---|---|
| Package client | `21109422235a9b18438475562bd74bf9de9687c47fc3361a57fa0768b89c81a7` | `09571c18dcf8782231f90736e6742e3d0b2da9c4ed0de16957bc513ffc819fae` |
| Package tests | `e26f47c549168a605414c80946d45e3c25b88b656eac448acff6a72d45cd13e8` | `eec8aa1b89e7eaa5ff8fd1fba8bebd54ba8e76d27a5f5d5bc40ffd8cb0f09102` |
| Package README | `0eaef9d22f71063ea0c3605f352f6270581ceae792db9204d6db6b3262af42a1` | `b763ce2a909400fcc31f18ba599d282b0da47a8b20794d826752cb75db50a567` |
| Hub helper | `cfb14a0c33a4af0b951ddbc51f16e945abf11e304ffa5a578aece9391f9c71f2` | `a4a2b7539475ab0c882d1e4d4ebc1c3f965f941fec4433962b001577cfd35727` |
| Hub helper tests | `6c966e154762d77841c5eee915960f3c6ef3cc07d575ee442b4b94b9964fdfca` | `fcbd9c84dc4a7465a812dcf58ba440da2bc65086b5797098d60c9d373c937a55` |
| Hub boundary tests | Absent | `fc25a568749619237a95756bfb7f90cc32ef7ce451f21501bc3d78a742be675d` |

Candidate emitted client.js hash is `bed79c0069e5840c5646996eadd08f32990010001e3487cd9dfd0c76cf6ee267`; installed client.js is `3afcd220bf828040e8ea366178a3d54b80c14a16c59ae8e87782804f3cae3d38`. Their matching index.js bytes do not imply equal behavior. The explicit Hub identity-jwt subpath remains installed with hash `db706a1be4f86f5da9bbf88d1911c434086d72af00906d80112fdd4bb623606f`. No package/version/lock/installation mutation occurred during Task3.

Temporary candidate config SHA: `0af0dc627bac816ad7cfc519c4fe4730abe24de4d0433c8d76a50801e4c54799`. Installed config SHA: `ed79233050ec1477cfec66f6fef1c351ecf8d7962a12d4643111cab7c251c58c`. Each contains both complete236-file dist manifests and rejects drift before imports. Exact main-only regex alias preserves the explicit identity subpath. Configs use the existing Hub stubs/exclusions, disabled envDir loading, isolated cache, one worker and exact two-file inclusion. They are temporary candidate verification controls, not normal product config changes.

## Evidence

| Check | Observed result and ownership |
|---|---|
| Task2 package independent tests |105/105,27 files,47 client cases;14.52s; exit0 |
| Task2 package independent typecheck | `tsc --noEmit`, exit0 |
| Task2 build | Root-owned local build receipt at `/tmp/minion-360-14-05/build.log`; not rerun by Task3 executor |
| Task3 red helper run |15 failures/29 cases before source repair; headers, projection, caller lifetime and cap gaps reproduced |
| Task3 red actual-boundary run |4 failures/10 cases; raw native causes reached logs, malformed200 failed SvelteKit status validation, inbox/layout unsafe causes and pre-aborted dispatch reproduced |
| Final candidate config run |39/39 tests,2 files:29 helper +10 boundary;1.72s; exit0 |
| Final installed config run |36/36 tests,2 files:26 helper +10 boundary;937ms; exit0 |
| Scoped Hub source diff check | No diagnostics |

Task3 commands from Hub: `node node_modules/vitest/vitest.mjs run --config /tmp/minion-360-14-05/vitest.hub-candidate.config.ts` and the same with `vitest.hub-installed.config.ts`. Local Hub runner reports Vitest4.1.10. Candidate/installed counts differ intentionally: candidate cases prove bounded behavior; installed cases prove absence of those guarantees. No skipped test was used to disguise an adoption failure.

Actual consumer fixtures import factory-intake GET/POST, activity loader, inbox loader, Workforce layout and company recovery. Only external identity/database/fetch dependencies are mocked. They observe real log arguments and response bodies using synthetic HTML/JSON/native-cause canaries, preserve genuine404 handling and company create-with-ID/mismatch-cleanup behavior, and assert canonical mutation headers. Native streams exercise body deadline/release and caller cancellation. There were no network/provider/database operations or application startup.

## Remaining acceptance and handoffs

Root must independently review Task3 and run the current-source Hub check after freeze. No source-compatible installed check should be labeled bounded transport qualification; only the candidate has those capabilities. Package distribution, installed lock adoption, deployment and production size/latency evidence remain unperformed.

The actual inbox still converts aborted rejections to degraded successful data; the candidate fixture proves this while asserting zero pre-aborted fetch calls. Other loader catch/allSettled branches have related consumer-owned cancellation policy. Helper-only projection cannot sanitize unrelated route-local DB/schema errors, validate successful endpoint shapes, intercept the streaming proxy, implement upload stubs or fix the direct workspace client's abandoned2s timer. Those are explicit existing child boundaries, not reasons to broaden this slice silently.

Exact-site TODOs at helper line74, helper line220 and boundary test line218 reference the Workforce proposal. The corresponding proposal text was sent to root for its canonical ledger. Source changes preserve the original package three-file freeze and all unrelated dirty work. No commits, branches, worktrees, stash, live configuration, dependencies or deployment were changed.

Root independent Task 3 review and repeat tests passed (39 candidate, 36 installed baseline). Fresh 2,418-file Hub snapshot plus six sibling plugin files passes full check with zero errors/warnings. See 14-05-VERIFICATION.md for exact snapshot/log receipt; installed adoption remains pending.
