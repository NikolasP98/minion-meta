---
id: 2026-08-17-maintenance-lane-monitors-spec
title: Maintenance lane — monitor-triggered pipeline intake (PostHog/Sentry, GH push evaluation, handoff ledger) + spec-format decision
stage: spec
status: draft
pass: 1
created: 2026-08-17
updated: 2026-08-17
repos: [minion-meta, minion-factory, minion, minion_hub]
verdict: pending
type: infra
---

# Maintenance lane — monitor-triggered pipeline intake

**Extends:** `2026-08-13-request-to-deploy-sdlc-pipeline-spec.md` (intake side) and `2026-08-17-sdlc-phase-gates-scoring-spec.md` (G0 reconciler, source hygiene).

## 0. Product

User intent (verbatim, 2026-08-17): "I keep using claude-code/codex to implement new features, and base.minion focuses on addressing open ends, unresolved issues, and pretty much the hardening/maintenance side of code. Lets set things up as needed: sentry/posthog monitors with triggers that run the SDLC pipeline · GH merge/PR monitors with triggers that evaluate any pushes and look for deficiencies · Adding a clause to the local dev claude.md/agents.md that requires the agent to document any open items … · Making specs xml instead of md?"

**Division of labor this spec institutionalizes:** the human+interactive-agent lane builds features; the factory lane owns hardening. Everything below is an *intake source* that turns runtime reality, merge activity, and declared open ends into `proposals/` files the existing pipeline already knows how to process. No new pipeline stages — new *sensors*.

## 1. Intake sources (all emit proposal upserts, same dedupe rules as chat intake)

### S-A · Handoff ledger sweep (shipped clause → mechanize)
The `TODO(handoff):` clause is now in meta AGENTS.md, gw AGENTS.md, hub CLAUDE.md (2026-08-17). Mechanize it: the reconciler's sweep greps fleet repos for `TODO(handoff)` markers added since its last run, and upserts one proposal per cluster (file/module granularity) with the marker text + `file:line`. Marker removed in a merge → reconciler closes the proposal. This makes the clause *enforceable*: an unswept marker is visible on the board within a day.

### S-B · GH merge/push evaluation (preemptive thermonuclear on the diff)
On merge to a fleet repo's integration branch, a factory job runs a **deficiency scan** over the merged diff (fresh-context, rubric): missed edge cases (empty catch, unchecked `[0]`/`.find()`, unvalidated request bodies), hardcoded config-worthy values, unwired exports, weakened/skipped tests, missing handoff markers where the diff obviously leaves open ends. Findings above a severity floor → proposal upsert tagged `source: merge-scan` with the commit + file:line. This is "thermonuclear, but it files work items instead of blocking" — the blocking version already exists per-PR; this catches what merges anyway (direct pushes, admin merges, agent lanes).
Bootstrap evidence: today's manual sweep of hub+gw produced 24 debt proposals (see `proposals/` files dated 2026-08-17) — that's the scan's expected output class, validated by hand once.

### S-C · Runtime monitors → pipeline (PostHog first, Sentry optional)
Reality check: the stack has **PostHog** (hub analytics, MCP access) and gateway OTel diagnostics; **Sentry is not installed anywhere** — adopting it is its own project and is *not* required for v1.
- v1: PostHog **error tracking + alert webhooks** → a small factory endpoint (`/hooks/monitor`) that upserts proposals (`source: posthog`, alert payload + insight link). Start with: hub client-side error spikes, `$exception` events, and the existing finance-alert hooks (`FINANCE_ALERT_*` env, already built but inert) pointed at the same endpoint.
- v1.5: gateway health — the existing health digest/controller alerts (Netcup) post to the same endpoint instead of dying in logs.
- v2 (parked): Sentry adoption decision — only if PostHog error tracking proves insufficient (unknown today; don't build two error pipelines on spec).
Noise rules (G-spec §source hygiene apply): dedupe by fingerprint, threshold before filing, auto-close when the alert resolves.

### S-D · CI watch (exists)
Already live (red workflow → draft proposal, e.g. `proposals/ci-minion_hub-ci.md` filed for the master Prettier red — confirmed working 2026-08-17). Add the auto-close-on-green behavior from the gates spec.

## 2. Spec format decision: **markdown stays; the validator hardens** (XML: no)

Evaluated the "specs as XML with custom tags" idea against the failures we actually observe:

| Observed failure (2026-08-17 audit) | Would XML catch it? | What catches it |
|---|---|---|
| 21 shipped specs never flipped status | No — well-formed XML can hold stale values forever | G0 reconciler (semantic, not syntactic) |
| Missing bidirectional `supersedes` link | No — the element would simply be absent, validly | Link-integrity rule in the validator |
| Frontmatter one-shot errors by agents | Partially — but this failure is already caught | `scripts/spec-index.mjs` validates every field today; it failed zero times across 120 specs |

Against XML: (a) the artifact's primary function is **human review at gates** — GitHub, the board, and diffs render markdown natively; XML kills reviewability exactly where quality is decided. (b) Agents one-shot markdown+YAML far more reliably than nested XML, and self-repair is easier (a bad frontmatter line is one line; a mis-nested tag cascades). (c) Our own 2026-08-13 research verdict: curated markdown beat structured stores for org memory — same forces here. (d) The trust problem is real but lives in *semantics*, and semantics need a rule engine regardless of syntax.

**What we adopt instead (the actual fix for "don't trust the one-shot"):**
1. `spec-index.mjs --check` becomes a **meta CI gate** (currently manual): field enums, date formats, repo ids, pass/revises consistency, **link integrity** (supersedes/revises bidirectional), required body sections (`## 0. Product`, out-of-scope, verification) via heading lint.
2. The **template visualizer** ships anyway (it was conditioned on XML but is format-independent): a minion-base page rendering TEMPLATE.md's schema as a live table — field, required/optional, allowed values, what it drives on the board — plus a "lint my spec" paste box running the same validator in-browser. This gives the one-shot agent (and the human) the contract without changing the format.

## 3. Slices

| # | Slice | Repos | Notes |
|---|---|---|---|
| 1 | Validator hardening + meta CI gate (`spec-index.mjs --check` + heading/link lint) | minion-meta | Smallest; unblocks trust immediately |
| 2 | Handoff-ledger sweep in reconciler (S-A) | minion-factory | Grep + upsert + close-on-removal |
| 3 | Merge-scan job (S-B) with rubric + severity floor | minion-factory | Reuses review-stage prompt machinery |
| 4 | `/hooks/monitor` endpoint + PostHog error-tracking webhook + FINANCE_ALERT_* rewire (S-C v1) | minion-factory, minion_hub | Secret-authed, same box as factory |
| 5 | Template visualizer + lint box on minion-base | minion-base | |
| 6 | Gateway health alerts → monitor endpoint (S-C v1.5) | minion | |

**Out of scope:** Sentry adoption (parked pending PostHog error-tracking verdict); XML/alternate spec formats (decided against, §2); auto-remediation without a proposal (every sensor files work, humans/gates still promote it); new board columns.

## 4. E2E verification

(1) Add a `TODO(handoff)` marker in a fleet repo, merge → proposal appears within one sweep; remove it → proposal closes. (2) Merge a diff with an empty `catch {}` → merge-scan files a proposal naming the line. (3) Fire a synthetic PostHog alert → proposal with the alert fingerprint; resolve → auto-closed. (4) Submit a spec missing `## 0. Product` or with a one-way supersedes link → meta CI red. (5) The visualizer renders every TEMPLATE.md field and its lint box flags the same spec CI flagged.
