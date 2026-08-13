# minion-factory v2 — Staged Runs with Per-Stage Harness/Model Pickers

**Date:** 2026-08-13 · **Extends:** `2026-08-12-minion-factory-agent-pipeline-spec.md` · **Status:** implementing

## 0. Product

"Each stage in the lifecycle needs a harness and model picker (codex+luna or claude+opus)." A factory run becomes a staged pipeline where every stage independently picks its executor:

| Stage | Default | What it does |
|---|---|---|
| **spec** | off (opt-in) | Writes `FACTORY_SPEC.md` into the branch (visible in the draft PR = reviewable plan) — does not implement |
| **develop** | `claude:opus` | Implements the task (follows FACTORY_SPEC.md when present) |
| **review** | `claude:sonnet` | Adversarial review of the final diff after self-test; writes `REVIEW.md`, first line `VERDICT: PASS|FAIL`; posted as a PR comment; FAIL keeps the PR draft |

Harnesses: `claude` (subscription OAuth token) and `codex` (ChatGPT-mode `auth.json`, synced to `/opt/factory/codex/`, rw-mounted so token refreshes persist). Model is a passthrough string (`opus`, `sonnet`, `luna`, `gpt-5-codex`, …) — the runner never hardcodes model names.

## 1. Surface

- API: `POST /runs` gains `stages: { spec?: {harness,model}, develop: {harness,model}, review?: {harness,model} }` (develop required; harness ∈ {claude, codex}); stored on the run row, echoed in `GET /runs/:id`.
- CLI: `factory run <repo> "task" [--spec h:m] [--dev h:m] [--review h:m|--no-review]`.
- Gates unchanged: no-op/errored develop ⇒ draft; self-test fail ⇒ draft; review FAIL ⇒ draft; merge stays human.

## 2. Non-goals

Per-stage turn budgets (wall-clock covers codex), UI pickers on base (needs public runner exposure), parallel stage fan-out.
