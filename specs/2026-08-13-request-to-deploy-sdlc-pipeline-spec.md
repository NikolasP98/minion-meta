---
id: 2026-08-13-request-to-deploy-sdlc-pipeline-spec
title: Request-to-Deploy SDLC Pipeline (chat intake, proposals, 2-pass specs, dev/test loop, weekly train)
stage: spec
status: draft
pass: 1
created: 2026-08-13
updated: 2026-08-13
repos: [minion-meta, minion-base, minion-factory]
verdict: pending
type: feature
---

# Request-to-Deploy SDLC Pipeline

**Extends:** `2026-08-12-minion-factory-agent-pipeline-spec.md`, `2026-08-13-minion-factory-staged-harness-spec.md` · **Research:** three deep-research passes 2026-08-13 (industry pipelines; upsert-vs-reconciler; spec formats) — key sources cited inline.

## 0. Product

User intent (verbatim, 2026-08-13): "A user can submit requests and select target repositories … a chat with an agent that knows the entire context of all repositories … The main outputs of these conversations are Proposals (stage 1). … another agent receives them (the planner/spec agent) … another agent should evaluate the spec and correct any inconsistencies … after dev, it moves on to testing, where any failed tests are sent back to dev with comments … hard limit to 5 … DEV is promoted to PRD once per week (saturdays at 9pm)."

The full lifecycle becomes:

```
Chat (request agent) ──upserts──▶ Proposals ──[HUMAN GATE 1: accept]──▶
Spec agent (pass 1) ──▶ Spec-review agent (pass 2, diff + comments) ──[HUMAN GATE 2: approve]──▶
Dev agent (factory) ──▶ Test loop (≤5, early-escalate) ──▶ PR ──[HUMAN GATE 3: merge]──▶
CI/CD → DEV instances ──[weekly train, Sat 21:00]──▶ PRD
```

This matches the 2026 industry convergent design almost exactly — Factory.ai's role droids (Product/Spec/Code/Review), Google Jules's plan-approval gate, and Anthropic's interview→SPEC.md→fresh-session pattern are all versions of it. The two universal invariants everywhere: **agents never merge or approve their own work** (structural in Copilot coding agent), and **every stage hands off a reviewable file artifact, never conversational context**.

## 1. The create-vs-update question — answered

> "should the request chat agent be the one to decide if a proposal must be created or updated? or does this agent only CREATE and the proposal agent evaluates the change?"

**Neither pure option. Split authority by blast radius, not by agent role.**

Every mature system studied lands on the same two-layer shape: *inline suggestion at write time, deferred authority for merges*. GitHub's duplicate detection (June 2026) searches at creation time and shows candidates — the author decides, it never auto-merges. Linear does creation-time similar-issue suggestions plus a Triage inbox for actual dedup. Salesforce runs real-time matching rules (Alert/Block) *and* background duplicate jobs; humans confirm merges. The memory systems split three ways — mem0 does inline ADD/UPDATE/DELETE/NOOP against retrieved candidates; Letta moved consolidation authority entirely into an async "sleep-time agent"; Zep resolves inline but makes it non-destructive (temporal invalidation, never deletion).

The deciding argument is asymmetry of failure: a **wrong merge silently destroys a distinct idea** (LLM entity-binding errors are a documented failure mode even with correct retrieval); **fragmentation is recoverable** by a later dedup pass. So:

**Request agent (inline, conversation-scoped):**
- Before any CREATE: mandatory similarity search over existing proposals *including closed ones*; top candidates shown **to the user** in the chat ("these look similar — same thing?").
- May CREATE (the default under any uncertainty) and may UPDATE — but only a proposal that was retrieved, shown, and confirmed by the user in this conversation. The model never free-recalls an ID it writes to (kills the entity-binding failure mode).
- Never reopens inline. Strong match to a closed proposal → create new with a `possibly_reopens: <id>` edge; reconciler + human decide. Reopen is a state transition with history semantics — the classic wrong-merge trap.

**Proposal agent (async reconciler):**
- Fires on created/updated events but runs **level-triggered logic** (Kubernetes reconciler pattern): reconcile the changed item's similarity neighborhood against canonical state — idempotent, safe to rerun, immune to missed events and to two concurrent chat sessions creating overlapping proposals. Plus an occasional full-corpus sweep.
- Owns merge/split/dedupe/reopen. High-confidence merges auto-apply; medium-confidence become `duplicate_candidate` suggestions for the human (the Zendesk/Linear triage-inbox model).
- All ops **reversible**: merges record `merged_from` + keep the original file as a tombstone; edges (`superseded_by`, `merged_into`) instead of row deletion (the Zep/Graphiti lesson).
- Defers to active conversations: never mutates a proposal a chat session holds a confirmed UPDATE target on.

Why not "request agent only creates"? You'd lose the cheapest dedup point — the user is right there to say "yes, same thing," the one moment ambiguity is free to resolve. Why not pure inline upsert? Entity-binding errors, silent wrong merges, no cross-conversation view, no recovery path — the reasons Letta evicted consolidation from the chat loop.

## 2. Artifact store

- **Proposals** live as markdown files `proposals/YYYY-MM-DD-<slug>.md` in minion-meta, same frontmatter family as specs (`stage: proposal`). Markdown = reviewable, diffable, greppable — consistent with our research verdict that curated markdown beat vector org-memory.
- **SQLite** (`.factory/pipeline.db` on the Netcup runner, or `proposals/index.json` mirror committed like `specs/index.json`) tracks entities + relationship edges: `revises`, `supersedes`, `merged_into`, `possibly_reopens`, `duplicate_candidate`, `spawned_spec`. The DB is the graph; the files are the content. Git owns content history — never store diffs in the DB.
- Spec frontmatter schema: **shipped 2026-08-13** — `specs/TEMPLATE.md` documents it; `scripts/spec-retrofit.mjs` backfilled all 108 specs; `scripts/spec-index.mjs` validates + regenerates the committed `specs/index.json` the dashboard reads. (MADR precedent for status enums and supersede links as explicit fields — never "superseded by X" inside the status string, the known anti-pattern.)

## 3. Request agent (the creative zone)

A chat surface (minion_hub or minion-base — decide at implementation; hub already has chat plumbing) backed by a harness session with tools:

| Tool | Backing |
|---|---|
| repo query | ripgrep/file-read over local clones on the box (factory already clones) |
| memory | claude-mem/mempalace corpora (already installed) |
| proposal search | similarity over `proposals/` (embedding or BM25 — start with BM25/`rg`, upgrade if recall proves poor) |
| proposal upsert | scoped per §1; every write updates the SQLite graph |
| mockups/diagrams | Mermaid blocks in the proposal body (renders on the dashboard); image attachments stored alongside |

Output artifact convention (Anthropic's interview→spec pattern): a proposal is **self-contained** — problem, motivation, sketch, explicit out-of-scope, and a testable definition of done. Devin's 18-month retrospective: ambiguous requirements are the #1 agent failure category; freezing them at the proposal boundary is the fix.

**Human gate 1** stays manual, exactly as requested: the user flips `status: draft → approved` (dashboard kebab or git edit). Nobody in the research lets AI own the roadmap.

## 4. Spec stage — two passes

- **Pass 1 (planner/spec agent):** input = approved proposal + repo context, fresh context (never the chat transcript). Decides target repos as **vertical slices** sized "junior dev, 4–8 focused hours" with machine-checkable definition of done (Devin's optimal-task finding). Evaluates cross-repo impact against the AGENTS.md impact-zones table; unavoidable impacts go in the spec body and surface on the dashboard. Writes `specs/<id>.md`, `pass: 1`, `verdict: pending`.
- **Pass 2 (spec-review agent):** fresh context, sees only spec + codebase ("the agent doing the work isn't the one grading it" — Anthropic; scope it to correctness/consistency findings only, or reviewers invent gaps). Corrects inconsistencies and redundancies by **editing the spec** (bump `pass: 2`, set `revises`) and writing a sidecar `specs/<id>.review.md` with the justifying comments (verdict, reviewer, per-change rationale). No system studied embeds review comments in the artifact; sidecar-next-to-doc is the only in-repo precedent.
- **Dashboard:** shipped 2026-08-13 — pass-1 specs at the top of the Spec column, `pass > 1` below a colored divider. Entering a revised spec shows the **diff via git history** (git already stores it; the site can render `git log --follow` output or link the commit) plus the sidecar comments.

**Human gate 2** stays manual: `status: approved` on the spec.

## 5. Dev + test loop

Runs on the existing minion-factory (proven E2E: worktree-isolated container, draft PR first, staged harness/model per `--spec/--dev/--review`). Changes:

- Factory's spec stage consumes the approved `specs/<id>.md` instead of generating `FACTORY_SPEC.md` from scratch (pass `--spec-file`).
- **Test stage** = repo's own gate command (`pnpm vitest run test/ci/` for gw — never the full suite; `bun run check` etc. per repo). Failures are written as structured comments (`TEST_REPORT.md` + PR comment) and fed back to the dev agent.
- **Loop budget, enforced in the runner not the prompt** (research: 2–8 range is normal, 5 is fine but the number isn't the point):
  - hard cap **5** iterations → then the PR stays draft, run flagged `awaiting-human`;
  - **early escalation**: two *identical* failures in a row → stop immediately, don't burn the remaining budget;
  - each retry must state what changed vs the last attempt (goes in the PR comment);
  - paired **wall-clock/token ceiling** (existing 30-min docker-kill stays) — hitting either budget is a stop-and-escalate event.
- Keep the no-op gate (unchanged repo never flips ready) and the empirical-check bias: where a UI is involved, the review stage should curl/screenshot the running preview, not just read the diff (Cursor's computer-use verification pattern; our PR #6 review already curl'd edge cases).

**Human gate 3** = PR merge, unchanged. The runner never merges.

## 6. Deploy — continuous to DEV, weekly train to PRD

- Every merged PR deploys to DEV continuously (existing: gw DEV→`:dev` swarm, hub/site Vercel previews/branches).
- **Saturday 21:00 America/Lima: promotion train** — a scheduled job (Netcup cron, consistent with existing health-gated ticks) that promotes DEV→PRD per repo's rule (gw: merge DEV→main → `:prd`; hub: PR dev-work→master; site: `dev:master`). Each promotion is itself a PR the user can veto until the train departs.
- Research verdict: a weekly train is legitimate for a solo operator — it's a bounded review window where *you are the compliance gate*. Two required mitigations for the batch-size risk:
  1. **Feature flags for risky agent-authored features** (hub already has a module/feature system) — decouples release from deploy; rollback = flag flip, not emergency redeploy.
  2. The train **freezes promotion, never merging** — DEV keeps integrating all week.
- Hot-fix bypass: a `hotfix` label skips the train (deploys on merge), keeping the weekly cadence from blocking incident response.

## 7. Corrections/improvements to the original plan

1. **Proposal upsert**: hybrid (§1), not either pure option.
2. **Test-loop cap 5**: keep, but add early-escalation on identical failures + cost ceiling, enforced by the orchestrator.
3. **Spec review**: reviewer runs in a fresh context on the artifact only — never sees the planner's reasoning or the chat.
4. **Slices**: every spec slice carries a machine-checkable definition of done + explicit out-of-scope (the top failure mode is ambiguity, not capability).
5. **Weekly train**: promote an already-continuously-deployed DEV artifact; add flags + hotfix bypass.
6. **Reopen**: never inline from chat; `possibly_reopens` edge + reconciler + human.
7. **All state in files/PRs, derived never stored** (our own factory-gates rule) — SQLite holds the *graph*, GitHub holds gate truth, frontmatter holds what the board renders.

## 8. Implementation slices (in order)

| # | Slice | Repos | Status |
|---|---|---|---|
| 1 | Spec frontmatter schema + retrofit + `index.json` + board rendering (pass divider) | minion-meta, minion-base | **shipped 2026-08-13** |
| 2 | `proposals/` dir + frontmatter + index + board Proposal column reads it (alongside GitHub issues) | minion-meta, minion-base | next |
| 3 | Request agent v1: CLI/chat session with proposal-search + scoped upsert tools (no web UI yet — `claude` session with a skill is enough to validate) | minion-meta | next |
| 4 | Proposal reconciler as a factory scheduled run (level-triggered sweep) | minion-factory | after 3 |
| 5 | Spec agent + spec-review agent as factory stages writing to `specs/` + sidecars | minion-factory | after 2 |
| 6 | Test-loop v2 in runner (cap 5, early-escalate, structured failure comments) | minion-factory | independent |
| 7 | Saturday train cron + hotfix bypass | minion-factory, Netcup | independent |
| 8 | Web chat surface + diff/comment viewers on the dashboard | minion-base or hub | last |

**Out of scope:** multi-user auth on the chat surface; vector search for proposals (start BM25); auto-merge of any kind; PRD deploys outside the train except `hotfix`.

**E2E verification (when slices 2–5 land):** one conversation → proposal file + graph row → human approves → spec pass 1 + reviewed pass 2 with sidecar → human approves → factory run produces draft PR referencing the spec id → test loop passes → merge → DEV deploy → appears in Saturday train manifest.
