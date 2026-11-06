# A independent implementation review

The user assigned Astra to independent verification and escalation, and Sol to development, for 27 remaining slices in six grouped PRs. Review actual source and public behavior. You may write probes and review artifacts, but must not change product source, stage, commit, push, create a PR, merge, deploy, use operational credentials or make paid requests. Other workers are active; preserve their changes. Read local AGENTS.md, Hub CLAUDE.md/AGENTS.md, MINION engineering skills and applicable UI governance. Browser interaction requires browser-harness, a unique BU_NAME and coordination for the dedicated headless browser on port 9223. No visible browser or cloud billing.

## Source and contract

Clone: `/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/a-chat`. Branch: `feature/agent-harness-a-chat`. Canonical PR base: Hub `master`, source base `ef62e8ac2dd8d83d7f38dae8ec04f59c50cf4283`.

The parent spec and `specs/105-harness-chat/` are in the sibling `f-evals` meta clone. Two independent SDD reviews approved revision 1 before implementation at `8d0dffc1`. A owns slices 3–5 and the actual Hub adapter for slice 26. General engine migration and the separate engine P1–P4 reconnaissance are outside scope.

Checkpoint: `/home/nikolas/Documents/CODE/MINION/audits/2026-10-23-agent-harness-batches/development/a-chat/implementation-checkpoint.json`. File SHA-256: `02c9c141c95fb054f44087b5a216ae527e26f01b052090ca929d7512eb7c8fc7`. Its compact, sorted canonical `sourceFiles` inventory has SHA-256 `019a6d7f7077da2da2a73d2c416c0972d5e627c56d225d0c02ef752ed994c191`. Root independently verified all 59 current files against that inventory. Candidate patch: `0f3e5ec261415b56aefb86aee38f21a56049112104e0020b6c498d7f8af1dcfd`. Frozen lock: `c5e63e6b708c7abc562da19c95d7c317f2fd329fc558b43267e3853d15e454f0`. Source is uncommitted.

## Existing proof and pending qualification

Full Hub check passed with zero errors and warnings. Six focused files passed 87/87, the ingress endpoint passed 9/9, and the Node adapter protocol passed 4/4. Design debt did not increase; token lint reported zero violations. The installed matrix contains 21 cases across five browser projects, totaling 105 cells; it was only collected at this checkpoint. Full unit/build/matrix/browser evidence may arrive during review. Inspect terminal receipts rather than assuming success.

A prior deliberate generation-fence removal caused the actual mounted Home session-ABA test to fail with two chat.send calls instead of one. Exact source was restored. Keep this intermediate mutation proof tied to its source version; rerun if subsequent changes affect that path.

## Review boundaries

- Accepted execution must retain a lease separate from preparation and the smoothed model run ID. Check acknowledgement, late final, expiry, cancellation and duplicate behavior. Private authority is bounded to 256 entries/two hours and the current client; serialized or historical UI objects cannot mint it.
- Trace actor/org/session ABA, gateway/socket generation, tool registry, navigation, Stop, teardown and expiry checks through every actual queued tool, side effect and follow-up. Include forms.ts, global-tools.ts, BookingCreateForm, POS CustomerPicker/sell and stock entries. Already committed effects must not replay.
- The sandbox handoff must be private to one planned invocation, await its host reload and bind the resulting stable page owner. User, external, forged or reordered navigation invalidates it. Check that no global pending flag or DOM event grants authority.
- Exact aliases from foldToolTurns and streaming liveTools must retain lineage only when every source object has the same known binding. Unknown, historical, expired and reloaded sources may render but cannot authorize automatic work. Stop must remain visible while an accepted tool awaits after smoothing ends.
- The reviewed cap interpretation is in `sdd/a-chat-callback-cap-input.md`, SHA-256 `a29d507a1cb9ee3ab9a1835c2ed1c495c85bb76101d799f86e4c90c2da26fa6e`. Only submitted automatic ui_followup consumes the five-slot cap. Explicit choice/artifact callbacks retain the known parent/root/count, including at five, without resetting it. The next automatic call remains blocked. Typed user text starts a new root. A definite synchronous rejection of provisional admission does not consume a slot; a failure after actual submission does. Check refunds and callback-root bypasses.
- Trace actual full/Jev/core routing and requested/resolved model, p_sandbox, known-zero versus unknown, duration and revision fields through the real flat SDK sink. No prompt, tool arguments, chat text or private source URLs enter decision events. Check authenticated strict ingress limits of 20 events/16 KiB, 120/minute and 4096 keys, actor-bound buffering, teardown and disabled capture. Preserve auth, RBAC and UI capabilities.
- The JSONL adapter must drive actual Home/Floating/context/runner/router/sandbox code, not a copied engine. Check its version-1 handshake, reset, turn, provider_result, transition, cancel, collect and close boundaries, outbound provider_request, private fixture transport and independently committed domain receipt.

Final F qualification must run four episodes across all three arms plus the actual valid live CLI with a test-only provider transport against the reviewed A commit and current F source. It must match reset/source/lock/adapter/build hashes and make zero external or paid requests. The previous 12/12, 25 synthetic attempts and three sandbox mutation receipts came from dirty intermediate source before the final lineage fixes; they are not final qualification.

## Review output

Report Standards and Spec separately. Each finding needs an exact path/line, trigger, impact and smallest correction. Inspect callers as well as all changed files. Trace FRs, success criteria, acceptance cases, tasks, plan decisions and constitution requirements to evidence; leave pending proof explicit. Run Spec Kit convergence/analyze where available with an absolute SPECIFY_FEATURE_DIRECTORY and SPECIFY_FEATURE_NO_PERSIST=1. Never mutate shared feature.json.

Write probes, command receipts and reports under `/home/nikolas/Documents/CODE/MINION/audits/2026-10-23-agent-harness-batches/verification/a-chat/`. Send reproducible blockers early so Sol can correct them. Bounded probes are allowed; coordinate before heavy gates. Do not report a defect solely from test counts or mocks when an actual caller can discriminate it.
