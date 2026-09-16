---
phase: 11-agent-lifecycle
plan: "04"
status: gaps_found
slice_status: task1_passed_task2_synthetic_passed_real_harness_blocked
requirements_completed: []
verified: 2026-09-11
snapshot: /home/nikolas/.cache/claude-tmp/11-04-q7m3xk/minion-meta
---

# 11-04 goal-backward verification (executor self-check; independent review pending)

## must_haves.truths

| Truth | Verdict | Evidence |
|---|---|---|
| Protocol fixtures distinguish requests from responses | **PASS** | `acp-conformance.test.ts` "transcript fixture labels": every fixture step's `kind` equals `classifyInbound(message)`; notifications have no `id`; same-id request vs response case; 11 malformed shapes. 88/88 tier-1 cases pass — `checks/task1-conformance.log`. |
| Research names one executable pinned harness | **PASS (credential-free tier)** | Research addendum: `@agentclientprotocol/sdk@1.4.0` example agent, tarball sha1/sha512 = registry, `dist/examples/agent.js` sha256 `65133ba9…`, exact command. Executed: 3/3 — `checks/tier2-sdk-example-agent.log`. |
| Research names every unresolved real-run prerequisite | **PASS** | Addendum §"Unresolved real-run prerequisites": adapter binary identity, credential, authority/budget, call-site adoption, SDK decision. |
| Real pinned harness completes initialization/session/permission/prompt/cancel contract | **BLOCKED** | No paid/model harness run. The SDK example agent completes the contract (initialize, session/new, permission request/answer, prompt, cancel) but is a simulated agent, so this truth is not satisfied. Blocked on credential + adapter pin + D360-04 authority. |
| Synthetic regression suite passes | **PASS** | `pnpm --filter @minion-stack/shells-bridge test`: 201 passed / 3 skipped (tier 2 unset) — `checks/task2-package-test.log`; 204/204 with `ACP_EXAMPLE_AGENT` — `checks/task2-package-test-with-sdk-agent.log`. |
| Exact versions and command outputs recorded | **PASS** | `checks/freeze.json`, every gate log with exit code, `before.txt` / `after.txt`. |

## must_haves.artifacts

| Artifact | Verdict | Evidence |
|---|---|---|
| `11-ACP-RESEARCH.md` provides transcript + harness admission evidence | PASS | Addendum appended; hash `01ad8354…` (main checkout). |
| `acp-client.ts` implements the chosen adapter and executes the real conformance gate | PARTIAL | Adapter implemented and passes synthetic + SDK-example gates (hash `3b1db7dc…`); the real paid-harness gate is blocked, not executed. |

## key_links

- Research → client: every behaviour the research table listed as a defect (numeric-id classification, string-id request dropped, null crash, cancel-as-request, no initialize/session, cancelled result loss, unbounded lines, unhandled spawn `error`) has a named fixture scenario and a passing test; red run against the old client: 85 failed — `checks/red.log`.
- Client → research: addendum records what the adapter now does and what remains (call-site adoption, SDK decision).

## Negative / rejection cases required by the plan

- Version mismatch rejected; error response surfaced with code; missing `sessionId` rejected; missing `stopReason` guarded; malformed `null/[]/"str"/42/{bad json}/{jsonrpc only}/{id only}/{id:null,error}` and oversize line all reported without crash; unknown response id ignored; unknown method answered `-32601`; harness exit rejects pending calls; spawn failure reported on `exit` with error; `stop` reports `exited:false` on an EOF-ignoring peer; permission never auto-allowed; cancel answers pending permission `cancelled` *before* the notification (wire order asserted).
- Upstream negative reproduced at runtime: SDK 1.4.0 example returns `end_turn` when cancelled while a permission is pending.

## Standards check

- Only owned files changed; `package.json` and `pnpm-lock.yaml` byte-identical to base; `git diff --check` clean; lint 0 new warnings; typecheck 0.
- No `.env`, Infisical, production/staging URL, or credential used; child processes get an allowlisted env; the scratch SDK lives outside the repo.
- No commit/stage/push/PR/publish/deploy; main checkouts, other worktrees, stashes, branches untouched (worktree is a detached snapshot).

## Open gates before AGT-05 can close

1. Real pinned harness run with recorded credential + authority + adapter hash (blocked).
2. Sender-slice adoption of `initialize/newSession/prompt/cancel` in `bridge.ts` (outside 11-04 ownership; TODO(handoff) + proposal text in SUMMARY).
3. Root decision on the SDK dependency transaction (pending diff).
4. Independent review of this candidate.
