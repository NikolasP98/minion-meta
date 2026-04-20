# Phase 3: Adopt Foundation in Subprojects - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-20
**Phase:** 03-adopt-foundation-in-subprojects
**Mode:** auto (all gray areas auto-resolved with recommended defaults)
**Areas discussed:** Scope substitution, Plan structure, Wave grouping, tsconfig variant mapping, Lint config adoption, Env file adoption, CI verification, Branch strategy, Rollback

---

## Scope Substitution

| Option | Description | Selected |
|--------|-------------|----------|
| Use `@minion-stack/*` throughout | Honor Phase 02 lock — all refs use new scope | ✓ |
| Use `@minion/*` per original roadmap | Would require un-doing Phase 2 scope lock | |

**Rationale:** Phase 02 locked `@minion-stack/*` in plan 02-02 after `@minion` org name was rejected by npm. Phase 3 inherits that lock — downstream must use the new scope everywhere.

---

## Plan Structure

| Option | Description | Selected |
|--------|-------------|----------|
| One plan per subproject (6 plans) | Mirrors roadmap; each subproject is its own unit of work | ✓ |
| Single plan with 6 tasks | Simpler but forces serial execution | |
| Two plans (tsconfig/lint + env) split | Splits the atomic "adoption" into two ceremonial chunks | |

**Rationale:** One plan per subproject aligns with ADOPT-01..07 requirements and allows wave-level parallelism by framework affinity.

---

## Wave Grouping

| Option | Description | Selected |
|--------|-------------|----------|
| By package-manager + framework affinity | Wave 1: pnpm+Node; Wave 2: bun+SvelteKit; Wave 3: npm outliers | ✓ |
| All in parallel (one wave) | Fastest but hardest to troubleshoot cross-subproject issues | |
| Strictly serial (6 waves) | Safest but slowest | |

**Rationale:** Wave-by-affinity maximizes the "lesson learned in wave N applies to wave N's remaining plans" heuristic without giving up parallelism. Per the roadmap note "parallel-capable waves but serialized to avoid shared-package churn."

---

## tsconfig Variant Mapping

| Subproject | Variant | Reason |
|------------|---------|--------|
| minion | `node` | CLI + gateway server ✓ |
| minion_hub | `svelte` | SvelteKit ✓ |
| minion_site | `svelte` | SvelteKit ✓ |
| paperclip-minion (server) | `node` | Express server ✓ |
| paperclip-minion (ui) | `base` | Standalone Vite React tsconfig may layer on `base` |
| pixel-agents (extension) | `node` | VS Code extension backend ✓ |
| pixel-agents (webview-ui) | `base` | React webview uses base |
| minion_plugins | `library` (if TS exists) | Library-ish content, no runtime target |

---

## Lint Config Adoption

| Option | Description | Selected |
|--------|-------------|----------|
| Replace + preserve subproject overrides | Use preset as source of truth, layer overrides in subproject config | ✓ |
| Pure replace (drop overrides) | Clean but may break existing code that relies on overrides | |
| Layer without replacing | Keeps two sources of truth — rejected | |

**Rationale:** Replace minimizes drift, preserve-overrides respects subproject-specific needs. Upstreaming overrides to the shared preset is deferred to Phase 8.

---

## Env File Adoption

| Option | Description | Selected |
|--------|-------------|----------|
| Additive, non-destructive migration | Ship both `.env.defaults` + `.env.example`; migrate existing vars; don't drop anything | ✓ |
| Clean slate (regenerate from scratch) | Risk of dropping in-use secret var names | |
| Skip `.env.defaults`, only `.env.example` | Violates ADOPT-01..07 acceptance criteria | |

**Rationale:** The 6-level env hierarchy from Phase 2 D8 requires both files per subproject. Existing `.env.example` content migrates forward; new `.env.defaults` is net-new per subproject.

---

## CI Verification

| Option | Description | Selected |
|--------|-------------|----------|
| Subproject's own CI + `minion doctor` | Each repo's CI is authoritative; doctor is cross-cutting health report | ✓ |
| Meta-repo CI runs subproject builds | Violates Phase 3 SC #4 ("no meta-repo checkout needed") | |
| Manual verification only | Insufficient for FOUND-09 / ADOPT-07 | |

**Rationale:** The roadmap's SC #4 explicitly requires each subproject to pass its own CI against published `@minion-stack/*` versions. Meta-repo's job is cross-cutting health via `minion doctor`, not running per-subproject CI.

---

## Branch Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| `feat/adopt-minion-stack` branch per subproject, PR for user merge | Safe, reversible, user-controlled merge | ✓ |
| Direct commit to default branches | Faster but bypasses review | |
| Mixed (some direct, some PR) | Inconsistent — rejected | |

**Rationale:** Each subproject's default branch is protected in practice. Feature branches allow CI to validate before the user merges. Meta-repo itself commits directly on `main` because Phase 3 meta-repo changes are `.planning/` artifacts only.

---

## Rollback

| Option | Description | Selected |
|--------|-------------|----------|
| Per-subproject PR close on failure, log in `03-0X-ISSUES.md` | Localized rollback, no cascade | ✓ |
| Revert the whole phase on any failure | Overkill for localized incompatibilities | |
| No defined rollback | Unsafe | |

**Rationale:** Each subproject adoption is independent. A failure in `pixel-agents` should not block `minion_hub`. Phase cannot complete with red PRs; deferrals must be explicit.

---

## Deferred Ideas

- Upstreaming subproject-specific lint rules into `@minion-stack/lint-config` → Phase 8
- Dedicated `@minion-stack/tsconfig/extension` variant for VS Code extensions → backlog
- Meta-repo-level `minion check --all` as CI gate → Phase 8
- `@minion-stack/env` `--projectSlug` flag drift fix → env@0.1.1 patch (Phase 2 deferred)

## Claude's Discretion

- Exact wave-internal plan order
- Lint override file placement (root vs `config/`)
- `pnpm dedupe` / `bun install --frozen-lockfile` timing
- Adoption PR description wording
