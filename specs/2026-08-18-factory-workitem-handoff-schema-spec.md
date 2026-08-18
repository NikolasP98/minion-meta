---
id: 2026-08-18-factory-workitem-handoff-schema-spec
title: Typed WorkItem fields + commit-pinned, structured handoffs across the factory pipeline
stage: spec
status: draft
pass: 1
created: 2026-08-18
updated: 2026-08-18
repos: [minion-factory, minion-meta]
proposal: 2026-08-17-factory-workitem-handoff-schema
verdict: pending
tags: [logic, infra]
type: infra
---

# Typed WorkItem fields + commit-pinned, structured handoffs

## 0. Problem

Quoting the approved proposal (`proposals/2026-08-17-factory-workitem-handoff-schema.md`, audit 2026-08-17 P1):

> Specs are fetched by mutable id+branch (not commit SHA); reviewer output is grep-parsed
> markdown; multi-repo specs map to the FIRST recognized repo only (`queue.ts` repo
> resolution); intake normalizes into two different shapes (issues vs proposals).
>
> **Definition of done:** one typed WorkItem record (source trust, risk class, priority,
> owner, lifecycle state) for all intake paths; dev runs pin the spec by commit SHA and
> record it; review emits a structured JSON verdict artifact (findings, severity, head SHA)
> alongside the markdown; multi-repo specs either fan out per repo or fail loudly.
>
> **Out of scope:** priority scheduling policy (separate decision).

This spec was written by reading the live `NikolasP98/minion-factory` source (`runner/src/{queue,db,github,index,repos,lifecycle,automerge}.ts`, `agent/{run,spec,reconcile}.sh`, `playbooks/request-agent.md`) via the GitHub API, and `minion-meta`'s `proposals/{TEMPLATE.md,index.json}` + `scripts/proposal-index.mjs`. Every claim below cites the exact line/file it is grounded in; there is no local `minion_factory/` checkout in this session (meta-gitignored — the runner lives on Netcup and its repo is `NikolasP98/minion-factory`).

## 1. Evidence — where each defect actually lives

1. **Mutable spec fetch.** `runner/src/github.ts:fetchMetaFile()` and `runner/src/index.ts:fetchMetaFile()` (a duplicate) both call `GET /repos/{slug}/contents/{path}?ref=${META_BRANCH}` — always the branch head, never a SHA. Three call sites read a spec this way: `index.ts` `POST /pipeline/spec` (reads the proposal), `index.ts` `POST /runs {specId}` (reads the spec a human/board asks to implement), and `queue.ts:postFinish()` (spec-run-passed → auto-queues a dev run, reads the spec again). Between "pass-2 approved this spec" and "the dev container actually reads it," another push to `dev` (a concurrent spec run, a manual edit, `push_meta()`'s rebase-driven index regen) can change the file. The dev run then implements text nobody reviewed.
2. **Grep-parsed review verdict.** `agent/run.sh:408`: `verdict=$(grep -m1 -oE 'VERDICT: (PASS|FAIL)' /out/REVIEW.md ...)`. The artifact is unstructured prose; findings, severity, and the commit the review actually ran against exist only as free text inside a markdown file posted as a PR comment. `runner/src/automerge.ts` already independently invented a *different* mechanism for the one piece of this it needed (`head_sha` binding on `runs`, stamped in `queue.ts:postFinish()` from the PR's `head.sha` right after a pass) — proof the evidence-binding problem is real and already partially, inconsistently solved.
3. **Multi-repo spec → first-match repo.** `runner/src/queue.ts:postFinish()`:
   ```ts
   const repos = Array.isArray(fm.repos) ? fm.repos : [fm.repos].filter(Boolean) as string[];
   const repoId = repos.map((r) => REPO_ALIASES[r]).find(Boolean);
   ```
   `.find(Boolean)` silently takes the first frontmatter repo that maps to a fleet id and drops every other one — no log visible outside the container's stdout, no board signal. A spec tagged `repos: [minion-hub, minion-site]` only ever gets a `minion-hub` dev run auto-queued; the `minion-site` half of the work simply never happens, permanently, with nothing marking it undone.
4. **Two intake shapes.** Typed path: `proposals/*.md` (frontmatter: `id, title, status, repos, tags?, value?, source?, ...`, schema-checked by `scripts/proposal-index.mjs`), written by `agent/chat.sh` (human-driven) and `agent/reconcile.sh`'s CI-watch block (machine-driven, but its heredoc at `reconcile.sh:~60` never sets `source:` at all). Untyped path: `runner/src/index.ts` `POST /hooks/monitor` files a raw **GitHub Issue** (`POST /repos/{META_SLUG}/issues`) with no status enum, no tags, no source, no owner — just title/body/labels. `minion-base`'s board (`src/routes/kanban/+page.svelte:134`, comment in the source: *"Proposals (the pipeline's stage-1 artifacts) lead the column; GitHub issues follow"*) concatenates both into one visual column from two disjoint data shapes. A monitor-filed item can never flow through `runner/src/lifecycle.ts:transition()` (only understands `kind ∈ {proposal, spec}`) — it is structurally excluded from the typed lifecycle everything else uses.
5. **"Risk class" already exists twice, disagreeing.** `runner/src/lifecycle.ts` (`promoteSweep`) and `runner/src/automerge.ts` (`sweep`) each hardcode their own `HIGH_STAKES` tag set for "this needs a human" — `{security, data}` in one file, `{security, data, infra, auth, perms, permissions, migration, migrations, billing}` in the other. A proposal tagged `infra` is auto-approvable by lifecycle.ts's rule but would never auto-merge by automerge.ts's rule — the same underlying concept, computed twice, inconsistently. This is direct evidence that "risk class" needs to be one typed, shared value, not an ad hoc recomputation per consumer.
6. **`value` is already untyped in practice.** The source proposal itself carries `value: medium` (a word); `2026-08-17-base-deploy-status-branch-filter.md` carries `value: 8` (a number) plus `effort: S`. Nothing validates either. `owner` does not exist anywhere in the 47 live proposals.

## 2. Approach — five vertical slices

Each slice is sized for one factory dev run (the pipeline's own `FACTORY_TEST_LOOP`/turn caps assume slice-scoped tasks — see `sdlc-board-triage-and-phase-gates` memory: *"slice-scoped dev runs mandatory (monolith = 101-turn burn)"*). Land and verify independently, in order (2–5 don't hard-depend on each other, but 1 introduces the test harness the others reuse).

### Slice 1 — Commit-SHA-pinned spec fetch + node:test harness (minion-factory, ~6h)

**Files:** `runner/src/github.ts`, `runner/src/index.ts`, `runner/src/queue.ts`, `runner/src/db.ts`, `runner/src/repos.ts`, `runner/src/*.test.ts` (new), `agent/spec.sh`, `agent/run.sh`.

**Changes:**
- `agent/spec.sh`: after the pass-2 `push_meta()` succeeds, capture `spec_sha=$(git rev-parse HEAD)` and add it to `emit()`'s JSON: `{note, specId, specSha, testExit}`.
- `runner/src/db.ts`: add column `spec_sha TEXT` to `runs` (same additive-migration pattern as the existing `ALTER TABLE ... ADD COLUMN` block — no destructive change).
- `runner/src/queue.ts`:
  - `finish()`: COALESCE `result.specSha` into `runs.spec_sha`, mirroring the existing `spec_id` COALESCE (same reasoning: an early-death auto-fix/requeue row must not null a pre-seeded value).
  - `postFinish()` (spec-run-passed → auto-queue branch): stop calling `fetchMetaFile('specs/...')` against the branch. Use the just-recorded `run.spec_sha` directly: `fetchMetaFile(path, run.spec_sha)` (new optional `ref` param on `fetchMetaFile`, default `META_BRANCH` for back-compat callers). The auto-queued dev run row also gets `spec_sha: run.spec_sha` set at INSERT time.
- `runner/src/github.ts`: add optional third param `ref?: string` to `fetchMetaFile(path, ref = META_BRANCH)` — the contents API already accepts a full commit SHA as `?ref=`, no new endpoint needed. Add `resolveFileHeadSha(slug, path, ref): Promise<string | null>` using `GET /repos/{slug}/commits?path={path}&sha={ref}&per_page=1`, returning `[0].sha` — this is how a caller who does *not* already have a SHA (the manual path below) pins one.
- `runner/src/index.ts` `POST /runs {specId}` (manual/board-triggered dev run for an already-approved spec): resolve `const sha = await resolveFileHeadSha(META_SLUG, `specs/${specId}.md`, META_BRANCH)`; fail the request with 400 if null (spec genuinely not found — same failure the old code already had, just now explicit); fetch content via `fetchMetaFile(path, sha)`; store `spec_sha: sha` on the inserted row. Delete `index.ts`'s duplicate local `fetchMetaFile` and import the one from `github.ts` (currently duplicated verbatim in both files — this slice is the natural point to deduplicate it since both now need the same `ref` param).
- `agent/run.sh`: no behavior change needed for correctness (the content is already pinned by value via `FACTORY_SPEC_CONTENT`); for auditability, prepend the pinned SHA as an HTML comment when writing `FACTORY_SPEC.md`: `<!-- pinned specs/${FACTORY_SPEC_ID:-spec}.md @ ${FACTORY_SPEC_SHA:-unknown} -->`. `queue.ts` passes `FACTORY_SPEC_SHA` alongside the existing `FACTORY_SPEC_CONTENT` env var when `run.spec_sha` is set.
- Test harness: add `runner/src/frontmatter.test.ts` using Node's built-in `node:test` + `node:assert/strict` against the existing (currently untested) `parseFrontmatter()` in `github.ts` — proves the harness works with zero new dependencies (tsx already installed). Wire it into `runner/src/repos.ts`'s `minion-factory` `selfTest`: append `&& npx tsx --test src/*.test.ts` to the existing `cd runner && npx tsc --noEmit ... && cd .. && bash -n ...` string. Add `"test": "tsx --test src/*.test.ts"` to `runner/package.json` scripts for convenience.

**Definition of done (machine-checkable):**
- `cd runner && npx tsc --noEmit -p tsconfig.json` passes (existing gate, now covering the new `ref` params and `spec_sha` column typing).
- `cd runner && npx tsx --test src/*.test.ts` passes and includes at least the new `frontmatter.test.ts`.
- `sqlite3 /opt/factory/data/factory.db "PRAGMA table_info(runs)"` (or a fresh `:memory:`-equivalent temp DB created by importing `db.ts` in a throwaway script) lists `spec_sha`.
- Manual E2E: `POST /pipeline/spec` a real proposal → note the pass-2 commit SHA from the meta repo → `POST /runs {specId}` for it → `GET /runs/:id` shows `spec_sha` equal to that commit, not whatever `dev` has moved to since.

### Slice 2 — Structured JSON review verdict, script-stamped head SHA (minion-factory, ~6h)

**Files:** `agent/run.sh`, `runner/src/queue.ts`, `runner/src/db.ts`, `runner/src/stats.ts`.

**Scope note:** this covers `run.sh`'s dev-run PR-review stage specifically (real branch/PR/head SHA). It is the concrete mechanism for the "formalize into the same sidecar score format" item already named for G4 in `specs/2026-08-17-sdlc-phase-gates-scoring-spec.md` §3 — that spec owns the board-facing scoring rollout across *all* gates; this slice ships the one artifact G4 needs for the review gate specifically, without waiting on the rest of that design. It does not touch the pass-2 spec-review sidecar (`specs/<id>.review.md`), which already has its own typed frontmatter (`pass`, `verdict`, `reviewer`) under that spec's G2.

**Changes:**
- `agent/run.sh` review-stage prompt (the `STAGE_PROMPT.md` heredoc around line 334): instruct the harness to write **both** `/out/REVIEW.md` (unchanged — human-readable, still posted verbatim as the PR comment via `--body-file`) **and** `/out/review.json` with this shape:
  ```json
  {
    "verdict": "pass" | "fail",
    "findings": [
      { "severity": "critical" | "high" | "medium" | "low", "claim": "...", "file": "path", "line": 123, "fix": "..." }
    ],
    "memoryConsulted": ["file or observation title", "..."]
  }
  ```
  (findings `[]` when verdict is `pass`). Keep the existing severity rubric and hunt-priority text as the instructions for *populating* `findings`; add a short schema block to the prompt.
- Immediately after the harness call, **before** trusting anything from `review.json`, `run.sh` stamps two fields the LLM must never be trusted to self-report (same principle already applied to `head_sha` in `queue.ts:postFinish()` — evidence binding by the orchestrator, not the agent):
  ```bash
  headSha=$(git rev-parse HEAD)
  if jq -e . /out/review.json >/dev/null 2>&1; then
    jq --arg sha "${headSha}" --arg run "${FACTORY_RUN_ID}" '.headSha=$sha | .runId=$run' /out/review.json > /tmp/review.json && mv /tmp/review.json /out/review.json
  else
    jq -n --arg sha "${headSha}" --arg run "${FACTORY_RUN_ID}" '{verdict:"missing", findings:[], memoryConsulted:[], headSha:$sha, runId:$run}' > /out/review.json
  fi
  ```
- Verdict parsing switches from the markdown grep to `verdict=$(jq -r '.verdict // "missing"' /out/review.json | tr '[:lower:]' '[:upper:]' | sed 's/^/VERDICT: /')` so the rest of `run.sh`'s existing state machine (`[ "${verdict}" = "VERDICT: PASS" ]`, the fix-loop, the `VERDICT: MISSING` fail-closed path) is untouched — this is a parser swap, not a control-flow rewrite. A malformed/absent `review.json` still resolves to `MISSING`, preserving the current fail-closed behavior exactly.
- `runner/src/db.ts`: add `runs.review_findings_max_severity TEXT` (nullable) — the highest severity present in the final `review.json`, or `null` when verdict is pass/missing. `queue.ts:finish()` reads `${outDir}/review.json` (same directory `result.json` already lives in — no new mount) if present and sets this column alongside the existing `result.json`-driven fields.
- `runner/src/stats.ts`: surface `review_findings_max_severity` in the per-run stats output (additive field on the existing run row shape it already returns) — no new aggregation required for this slice; consuming it in the `/stats` UI is a follow-on, not blocking.

**Out of scope for this slice:** wiring `review_findings_max_severity` into `automerge.ts`'s merge gate (e.g. "no Critical/High ⇒ never auto-merge even on double-pass"). That is a genuine, obvious follow-on once the field exists, but it changes merge *policy*, and this proposal's own out-of-scope line ("priority scheduling policy — separate decision") signals policy changes belong to a separate decision; this slice ships the artifact, not a new gate.

**Definition of done (machine-checkable):**
- `bash -n agent/run.sh` passes (existing gate).
- `jq -e . /out/review.json` is valid JSON on every run.sh review-stage exit path, verified by a manual run against a scratch branch with (a) a clean diff (expect `verdict: pass`, `findings: []`) and (b) a deliberately broken diff (expect `verdict: fail`, ≥1 finding with `severity` set).
- `review.json.headSha` equals `git -C work rev-parse HEAD` at the moment the review ran, not whatever the LLM wrote (verified by comparing the stamped value against the harness's own JSON transcript, which must NOT contain a `headSha` key pre-stamp — i.e., diffing pre/post-jq confirms the field was added by the script).
- `sqlite3 factory.db "PRAGMA table_info(runs)"` lists `review_findings_max_severity`.

### Slice 3 — Multi-repo spec: fan out or fail loudly (minion-factory, ~5h)

**Files:** `runner/src/queue.ts`, `runner/src/repos.test.ts` (new).

**Changes:**
- Extract the current inline resolution into a pure, testable function in `runner/src/queue.ts` (or a new `runner/src/fleet.ts` if that reads cleaner — implementer's call, keep it pure/no I/O either way):
  ```ts
  function resolveFleetRepos(repos: string[]): { mapped: string[]; unmapped: string[] } {
    const mapped = [...new Set(repos.map((r) => REPO_ALIASES[r]).filter((r): r is string => Boolean(r) && Boolean(REPOS[r])))];
    const unmapped = repos.filter((r) => !REPO_ALIASES[r] || !REPOS[REPO_ALIASES[r]]);
    return { mapped, unmapped };
  }
  ```
- `postFinish()` (spec-run-passed branch): replace `.find(Boolean)` with `resolveFleetRepos(repos)`.
  - `mapped.length === 0`: unchanged today's log-and-stop behavior is upgraded to **fail loudly** — POST to this same runner's own `/hooks/monitor` (loopback `fetch('http://127.0.0.1:${PORT}/hooks/monitor', ...)`, the exact pattern the auto-fix escalation ladder already uses a few lines above in the same file) with `source: 'spec-fanout', title: "spec ${run.spec_id} has no fleet-mappable repo (${repos.join(',')})", fingerprint: "fanout-${run.spec_id}"`. This makes the failure land on the board instead of dying in a container's stdout that nobody tails.
  - `mapped.length === 1` and `unmapped.length === 0`: unchanged (today's single-repo happy path).
  - `mapped.length >= 1` and `unmapped.length > 0`: queue dev runs for every id in `mapped` (see fan-out below) **and** fire the same `/hooks/monitor` loopback call for the dropped `unmapped` entries — partial fan-out must not silently swallow the part it couldn't route.
  - `mapped.length > 1`: queue **one dev run per mapped repo id**, each with `task` rewritten to `Implement ONLY the ${repoId} portion of Slice 0 (if present) and Slice 1 of the approved spec in FACTORY_SPEC.md — this spec also covers ${otherRepoIds}, out of scope for this run.` (reuses the existing S1-slice-scoping task template, just repo-scoped).
- The existing dup-guard `SELECT 1 FROM runs WHERE kind = 'dev' AND spec_id = ? LIMIT 1` incorrectly blocks the *second* repo's run once the *first* repo's run exists for the same `spec_id`. Scope it to the pair: `SELECT 1 FROM runs WHERE kind = 'dev' AND spec_id = ? AND repo_id = ? LIMIT 1`.
- `runner/src/*.test.ts`: unit tests for `resolveFleetRepos` covering: all-mapped single repo (today's happy path unchanged), two mapped repos (fan-out case), one mapped + one unmapped (partial), zero mapped (fail-loud case), and duplicate repo aliases in frontmatter (e.g. `[minion_hub, minion-hub]` — must not double-queue).

**Definition of done (machine-checkable):**
- `npx tsx --test src/*.test.ts` (from Slice 1's harness) passes, including the new `resolveFleetRepos` cases.
- `npx tsc --noEmit` passes.
- Manual E2E: approve+pass a spec with `repos: [minion-hub, minion-site]` → exactly 2 dev runs auto-queued, `repo_id` distinct, both `spec_id` equal, neither blocked by the other's dup-guard row.
- Manual E2E: approve+pass a spec with `repos: [minion]` (the gateway — deliberately excluded from the fleet per the existing `REPO_ALIASES` comment) → zero dev runs queued, one new meta issue/proposal appears from the `/hooks/monitor` loopback (visible via whatever Slice 5 makes that endpoint produce — see cross-slice note below).

**Cross-slice note:** Slice 3's fail-loud path and Slice 5's monitor-hook rewrite both touch `POST /hooks/monitor`'s *consumer* side (who calls it) vs *producer* side (what it writes). They compose without conflict — build in either order — but land Slice 5 first if the implementer wants the fail-loud path to surface as a typed proposal from day one instead of a raw issue for one release cycle.

### Slice 4 — Typed WorkItem fields: source, owner, single risk classifier (minion-meta + minion-factory, ~7h)

**Files (minion-meta):** `proposals/TEMPLATE.md`, `scripts/proposal-index.mjs`, `scripts/proposal-retrofit.mjs` (new, one-time), `proposals/*.md` (backfilled by the script, not hand-edited).
**Files (minion-factory):** `runner/src/risk.ts` (new), `runner/src/lifecycle.ts`, `runner/src/automerge.ts`, `agent/reconcile.sh`, `playbooks/request-agent.md`, `runner/src/risk.test.ts` (new).

**Changes:**
- `proposals/TEMPLATE.md`: document two new fields as **required** going forward, alongside the already-used-but-undocumented `tags`/`value`/`source`:
  - `source` (required): free-text provenance tag. Must be exactly `human` for chat-authored proposals (replaces today's implicit "absence of the field = human" convention — an absent field and an empty string currently mean the same thing by accident, not by contract) or a machine-source slug (`ci-watch`, `debt-sweep-N-YYYY-MM-DD`, `monitor`, `reconcile`, ...) for everything else.
  - `owner` (required): `human` (default for chat-authored, until a human claims it) or `factory` (autonomous machine ownership — CI-watch, monitor, debt-sweep items with no human assignee yet).
  - Document existing-but-informal `tags` and `value` as-is; no type coercion of `value` in this slice (leaving `value: medium` vs `value: 8` alone — normalizing that is a separate, smaller cleanup not blocking this DoD).
- `scripts/proposal-index.mjs`: add `source` and `owner` to the required-field check (same pattern as the existing `for (const key of ['id', 'title', 'status', 'created'])` loop) — this makes a proposal without them fail the index build, the same enforcement mechanism `spec-index.mjs` already uses for its own schema.
- `scripts/proposal-retrofit.mjs` (new, modeled on the existing `scripts/spec-retrofit.mjs` which did the same job for specs in 2026-08-13): one-time script, run once by the implementer as part of landing this slice, that backfills the 11 proposals currently missing `source` (7 `ci-*.md` files get `source: ci-watch`; the remaining 4 get `source: human`) and adds `owner: human` to all 47 (no proposal currently has an owner opinion recorded; `human` is the conservative default — nothing auto-promotes on `owner` alone). Not wired into any pipeline stage; it is a migration, run once, then deleted or left inert like `spec-retrofit.mjs` was.
- `runner/src/risk.ts` (new): single source of truth replacing the two diverging `HIGH_STAKES` sets found in evidence item 5 above:
  ```ts
  export const HIGH_STAKES_TAGS = new Set([
    'security', 'data', 'infra', 'auth', 'perms', 'permissions', 'migration', 'migrations', 'billing'
  ]); // union of the two prior sets — automerge.ts's was already the more conservative one
  export function classifyRisk(tags: string[] | undefined): 'high' | 'low' {
    return tags?.some((t) => HIGH_STAKES_TAGS.has(t)) ? 'high' : 'low';
  }
  ```
  `runner/src/lifecycle.ts` (`promoteSweep`'s auto-approve gate) and `runner/src/automerge.ts` (`sweep`'s merge gate) both delete their local `HIGH_STAKES` constants and call `classifyRisk(tags) === 'high'` instead. This is a **behavior change** for `lifecycle.ts`: proposals tagged `infra`/`auth`/`perms`/`migration`/`billing` (previously auto-approvable there) now require a human gate, matching what `automerge.ts` already enforced — closing the inconsistency evidence item 5 documents, in the stricter direction (fail-closed, matching this repo's own established default per `lifecycle.ts`'s existing comment: *"Fail closed: an UNTAGGED proposal is unclassified, not low-stakes"*).
- `agent/reconcile.sh` CI-watch heredoc: add `source: ci-watch` and `owner: factory` to the frontmatter it writes for new `proposals/ci-<repo>-<wf>.md` files (the refresh-in-place branch, which only rewrites the `## Latest failure` section, is untouched — it doesn't touch frontmatter).
- `playbooks/request-agent.md`: add one line to the "Your output: proposals" section: *"Always set `source: human` and `owner: human` (or the name the user gives you) in the frontmatter — every proposal must carry both."*
- `runner/src/risk.test.ts`: unit tests for `classifyRisk` covering each tag in `HIGH_STAKES_TAGS`, a low-stakes tag set, `undefined`, and `[]`.

**Definition of done (machine-checkable):**
- `node scripts/proposal-index.mjs` (from minion-meta root) exits 0 against the full retrofitted `proposals/` directory, and exits 1 (with a clear per-file error) if a proposal is missing `source` or `owner` — verified by temporarily stripping one file's `source:` line and re-running.
- `npx tsx --test src/*.test.ts` (minion-factory) passes, including `risk.test.ts`.
- `grep -c HIGH_STAKES runner/src/lifecycle.ts runner/src/automerge.ts` shows zero local set declarations in either file (both now `import { classifyRisk } from './risk.js'`).
- Manual check: a proposal tagged `[infra]` no longer appears in `promoteSweep()`'s auto-approve eligibility (previously would have).

**Cross-repo impact:** this slice edits `minion-meta`'s own `scripts/proposal-index.mjs` validator — the CI gate for `minion-meta` (`pnpm run build-all && pnpm run typecheck-all && pnpm run test-all`, per `runner/src/repos.ts`'s `minion-meta` entry) does not currently invoke `proposal-index.mjs` at all (it's invoked ad hoc by `push_meta()` inside the factory's own bash scripts, not by `minion-meta`'s own package scripts). No CI wiring change is required for this slice to be safe — the validator already runs on every factory-driven meta push; this is unchanged. Landing the retrofit script BEFORE the validator's `required` check goes live (in the same commit or PR) is mandatory — reversing the order breaks every subsequent `push_meta()` call across the whole fleet (spec pass-1/2, reconcile, chat) until the retrofit lands, since all of them run `proposal-index.mjs` as part of their push.

### Slice 5 — Monitor intake emits a typed proposal, not a raw issue (minion-factory, ~7h)

**Files:** `runner/src/index.ts`, `runner/src/db.ts`.

**Changes:**
- `POST /hooks/monitor` (currently `runner/src/index.ts:945`) stops calling `POST /repos/${META_SLUG}/issues`. Instead, on a new (non-deduped) event, it writes `proposals/monitor-<slug>.md` via the GitHub Contents API create-or-update pattern `runner/src/lifecycle.ts:transition()` already established (fetch-for-sha → PUT with `sha` when updating) — same repo, same auth, no new credential surface:
  ```yaml
  ---
  id: monitor-<slug>
  title: "<sanitized title>"
  status: draft
  created: <today>
  updated: <today>
  repos: []
  source: monitor
  owner: factory
  tags: [<from optional payload.tags, default []>]
  ---

  # <sanitized title>

  Automated runtime-monitor intake (source: `<src>`, fingerprint: `<effectiveFp>`).

  [existing safeUrl link line, if present]

  The block below is UNTRUSTED external alert data...
  ```
  (identical sanitization to today: `safeUrl` protocol allowlist, `safeDetail` backtick-neutering, `src` already alnum/`.`/`_`/`-`-restricted). **New requirement**, matching the existing lifecycle.ts precedent for reason strings landing in frontmatter: `title` must be whitespace-collapsed (`replace(/\s+/g, ' ').trim()`) and quote-escaped before it lands in the YAML `title:` field — today's code only strips `\r\n` for the *issue* title, which was safe for a GitHub issue title but is not safe once the same string is interpolated into YAML frontmatter (an embedded `"` or a colon-plus-space sequence can break the parser or inject a sibling key, exactly the class of bug `lifecycle.ts`'s hardening round already fixed once for `reason`). Reuse `lifecycle.ts`'s existing escaping, or extract it into a small shared helper both files import.
  - Accept an optional `tags` array on the POST body (`string[]`, default `[]`) so callers (PostHog alerts, finance alerts, the Slice-3 fail-loud loopback) can pre-classify; unvalidated tags are dropped (allowlist against a small known set, or simply pass through — implementer's call, but must not let an external POST inject an auto-approve-eligible tag combination it doesn't deserve without at least the same untrusted-data fencing already applied to `detail`).
- Dedup/refresh logic (the `monitor_events` table, fingerprint TTL, flood guard) is unchanged in mechanism — only what gets created/refreshed on a non-deduped event changes (proposal file instead of issue). On a refresh of an existing-but-not-stale fingerprint, append an "## Recent occurrences" line to the existing proposal body (mirroring `reconcile.sh`'s CI-watch "refresh in place while red" pattern) instead of creating a new file, via the same fetch-sha-then-PUT flow.
- `runner/src/db.ts`: `monitor_events.issue_url` column is reused unchanged to store the proposal's GitHub blob URL (`https://github.com/{META_SLUG}/blob/{META_BRANCH}/proposals/monitor-<slug>.md`) — no schema change, no rename (avoids a migration; the column's *meaning* shifts slightly but every reader already treats it as an opaque "where did this land" URL).
- After writing/refreshing the proposal, also regenerate `proposals/index.json` in the same commit — this endpoint does a single-file PUT via the Contents API (no local clone), so it must fetch, parse, patch, and PUT `proposals/index.json` itself, following the exact best-effort pattern `lifecycle.ts:transition()` already uses for the same file (fail-soft: index staying stale until the next `push_meta()`-driven regen is an accepted, already-established risk in this codebase, not a new one).
- `minion-base`'s board needs **no code change**: it already renders `proposals/index.json` in the Proposal column (`loadProposalIndex`) separately from `r.issues` (`loadGitHub`'s per-repo issues fetch); monitor items simply stop appearing via the `issues` path and start appearing via the `proposals` path, in the same visual column, now with real `status`/`tags`/`source`/`owner` instead of a bare issue title. Any *organically* human-filed GitHub issue on `minion-meta` (not synthetic) still shows up via `r.issues` exactly as before — this slice only changes what the monitor hook itself produces.

**Definition of done (machine-checkable):**
- `npx tsc --noEmit` passes.
- Manual E2E: `POST /hooks/monitor {source:"test", title:"...", detail:"..."}` twice with the same fingerprint within the TTL → first call creates `proposals/monitor-test-....md` (verify via `GET /repos/.../contents/proposals/`) and a `proposals/index.json` entry with `source: monitor, owner: factory, status: draft`; second call updates the same file (verify the git blob `sha` used in the PUT changed, i.e., it was a real update not a duplicate-create attempt) and does **not** create a GitHub Issue (verify `GET /repos/{META_SLUG}/issues` has no new entry from this test).
- Manual E2E: POST a `title` containing a double-quote and a newline → resulting frontmatter still parses (`node -e "require('./scripts/spec-frontmatter.mjs')..."` or simply `node scripts/proposal-index.mjs` exits 0 against the freshly written file).

## 3. Cross-repo impact assessment

| Change | Repos touched | Mitigation / alert |
|---|---|---|
| `spec_sha`, `review_findings_max_severity` new `runs` columns (Slices 1–2) | minion-factory only | Additive `ALTER TABLE`, same pattern already used 6 times in `db.ts` — zero-downtime, no data loss, existing rows just have `NULL`. |
| `fetchMetaFile` gains a `ref` param (Slice 1) | minion-factory only | Default value preserves every existing call site's behavior; only the two call sites this spec explicitly changes pass a non-default `ref`. |
| Verdict parsing swaps grep→jq (Slice 2) | minion-factory only | `run.sh`'s external contract (`REVIEW.md` posted to the PR, `VERDICT: PASS/FAIL` semantics visible to a human reading the PR) is unchanged — only the *internal* parse source changes. |
| Dev-run fan-out: one spec can now produce N PRs instead of 1 (Slice 3) | minion-factory only | **Alert, not mitigated:** a human watching for "one PR per approved spec" will now sometimes see two+. No board/UI change proposed here to group them — flagged as a natural Slice 6 (out of scope, see below) if it proves confusing in practice. |
| `lifecycle.ts` auto-approve becomes stricter for `infra`/`auth`/`perms`/`migration`/`billing` tags (Slice 4) | minion-factory only | **Behavior change, intentional** — closes a real inconsistency (evidence item 5). Any proposal auto-approved under the old, looser rule in the last 24h (the sweep's own window) should be spot-checked once after deploy; no code-level mitigation needed since the change only makes the gate *more* conservative, never less. |
| `proposal-index.mjs` requires `source`+`owner` (Slice 4) | **minion-meta** | **Hard mitigation required, not optional:** the retrofit script must land in the same commit/PR as the validator change (see Slice 4's explicit ordering note) — every one of the four pipeline scripts (`chat.sh`, `spec.sh`, `reconcile.sh`, and the runner's own `lifecycle.ts`/`index.ts` Contents-API writers) calls `proposal-index.mjs` (or, for Slice 5's writer, must independently satisfy the same required-field contract) as part of its push/write path. Skipping the retrofit breaks every factory push touching `proposals/` fleet-wide until fixed. |
| Monitor intake stops filing GitHub Issues (Slice 5) | minion-factory only (minion-base board reads the change but needs no code edit — see Slice 5) | A human who currently watches `minion-meta`'s Issues tab for monitor alerts will stop seeing new ones there; they now appear as proposals on the board's Proposal column, which was already the "watch this" surface for everything else the pipeline files. Worth one line in the next operator-facing changelog/memory note, not a code change. |

## 4. Out of scope

- **Priority scheduling policy** (explicit in the source proposal) — this spec adds `owner`/`source`/risk-class as typed *fields*; it does not change `queue.ts`'s FIFO `ORDER BY created_at` dequeue order, and does not introduce a numeric priority field beyond the already-existing, still-untyped `value`. A future spec can decide how (or whether) any of these fields should reorder the queue.
- **Normalizing `value` to one type** (word vs number, evidence item 6) — noted as a real inconsistency but small and independent; folding it into Slice 4 would blow its size budget for no DoD-relevant gain (the proposal's DoD names `priority`, not `value`'s representation specifically).
- **Wiring `review_findings_max_severity` into `automerge.ts`'s merge gate** (Slice 2's explicit out-of-scope note) — artifact-only in this spec; using it to change merge policy is a follow-on decision.
- **Grouping/visualizing multi-PR fan-out on the board** (Slice 3's cross-repo alert) — flagged, not built.
- **The G0–G5 scoring/sidecar rollout** in `specs/2026-08-17-sdlc-phase-gates-scoring-spec.md` — that spec owns the board-facing score chips and backward reconciliation; this spec only ships the `review.json` artifact G4 will eventually consume. No conflict, no `supersedes` relationship — genuinely separate concerns (data contract fidelity vs. board-facing quality scoring) that happen to share one artifact.
- **Retrofitting `owner`/`source` semantics onto historical GH issues already filed by the pre-Slice-5 monitor hook** — those stay as-is (tombstones of the old mechanism); only new events after Slice 5 lands use the new path.

## 5. End-to-end verification

After all five slices land (any order satisfying Slice 4's internal ordering note and Slice 1-before-3's shared `fetchMetaFile` signature):

1. File a test proposal via `POST /chat` → `POST /chat/:id/message` (or hand-write one) with `repos: [minion-hub, minion-site]`.
2. `POST /pipeline/spec {proposalId}` → wait for pass-2 → confirm the spec's `verdict: approved` and note the pass-2 commit SHA from the meta repo's commit history.
3. Confirm the spec run's DB row has `spec_sha` equal to that exact SHA (Slice 1).
4. Confirm the spec-run-passed auto-queue produces **two** dev runs, `repo_id` = `minion-hub` and `minion-site` respectively, both carrying the same `spec_id` and the same `spec_sha` (Slice 1 + Slice 3), and that `GET /runs` shows neither blocked by the other's dup-guard.
5. Let one dev run reach its review stage; confirm `/opt/factory/runs/<id>/review.json` exists, is valid JSON, has a `headSha` equal to `git rev-parse HEAD` on that run's branch at review time (not whatever the harness's own transcript claims), and that the run's `runs.review_findings_max_severity` column is populated consistent with `review.json.findings` (Slice 2).
6. `POST /hooks/monitor` a synthetic alert; confirm it lands as `proposals/monitor-*.md` with `source: monitor`, `owner: factory`, appears in `minion-base`'s board Proposal column with the same card shape as every other proposal, and that `GET /repos/NikolasP98/minion-meta/issues` gained no new issue from it (Slice 5).
7. `node scripts/proposal-index.mjs` from a fresh `minion-meta` checkout exits 0 against the full `proposals/` directory, including the file just created in step 6 and every retrofitted historical file (Slice 4).
8. Tag a scratch proposal `[infra]`, confirm `promoteSweep()` no longer auto-approves it (Slice 4's `classifyRisk` behavior change), then confirm the *same* tag would still block `automerge.ts`'s auto-merge sweep (unchanged there — proving both consumers now agree, where before they disagreed).
