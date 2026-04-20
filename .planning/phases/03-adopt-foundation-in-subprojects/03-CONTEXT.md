# Phase 3: Adopt Foundation in Subprojects - Context

**Gathered:** 2026-04-20 (auto mode)
**Status:** Ready for planning

<domain>
## Phase Boundary

Propagate the Phase 2 shared packages (`@minion-stack/tsconfig`, `@minion-stack/lint-config`) and the 6-level env contract (`.env.defaults` + `.env.example`) into every TypeScript-using subproject. The subproject registry in `minion.json` is the source of truth for scope: `minion`, `minion_hub`, `minion_site`, `paperclip-minion`, `pixel-agents`, `minion_plugins`.

**In scope:**
- Each subproject's `tsconfig.json` extends from a `@minion-stack/tsconfig` variant
- Each subproject adopts `@minion-stack/lint-config` presets (oxlint / eslint / prettier as applicable)
- Each subproject ships or updates `.env.defaults` (non-secret) and `.env.example` (secret var names)
- Each subproject's own CI passes against the **published** `@minion-stack/*` versions — no meta-repo checkout required
- `minion doctor` reports all 6 subprojects healthy at phase close

**Out of scope (deferred to other phases):**
- Fold `minion-shared` into `@minion-stack/shared` (Phase 4)
- Extract DB (Phase 5), Auth (Phase 6), WS (Phase 7)
- Meta-repo CI automation, changesets release automation (Phase 8)
- Any code refactor beyond config/env adoption
- Dependency bumps unrelated to adoption
- Build system changes (bun stays for SvelteKit; pnpm for pnpm-based; npm for the rest — diversity is acceptable per PROJECT.md)

</domain>

<decisions>
## Implementation Decisions

### Scope substitution (locked)
- **D-01:** All npm-scope references in this phase use `@minion-stack/*`, not `@minion/*`. The scope was locked in Phase 02 plan 02-02 (see reference_npm_org_creation.md) after `@minion` org name was rejected by npm as reserved. Every CONTEXT.md, PLAN.md, and task spec downstream must use `@minion-stack/*`.

### Plan structure (one plan per subproject)
- **D-02:** Six plans, one per subproject, following the roadmap: 03-01 `minion`, 03-02 `minion_hub`, 03-03 `minion_site`, 03-04 `paperclip-minion`, 03-05 `pixel-agents`, 03-06 `minion_plugins`.
- **D-03:** Plans are `autonomous: true` by default — each adoption is mechanical (config files + env scaffolding). No checkpoints unless a subproject's CI runs into a genuine incompatibility.

### Wave grouping (minimize shared-package churn)
- **D-04:** Wave 1 = `minion` + `paperclip-minion` (both pnpm + Node-server — share the `node` tsconfig variant and oxlint+ESLint+Prettier stack).
- **D-05:** Wave 2 = `minion_hub` + `minion_site` (both bun + SvelteKit — share the `svelte` tsconfig variant, same lint-config wiring).
- **D-06:** Wave 3 = `pixel-agents` + `minion_plugins` (both npm; pixel-agents is a VS Code extension with custom `node` config, minion_plugins has minimal or zero TS — handled last because they have the most unique shapes).
- **Why:** Subprojects in the same wave share a `tsconfig.json` extension target and lint-config entry, so one lesson learned in a wave applies to the whole wave. Serializing by affinity keeps troubleshooting tight.

### tsconfig variant selection per subproject
- **D-07:** `minion` → extends `@minion-stack/tsconfig/node.json` (CLI + gateway server)
- **D-08:** `minion_hub` → extends `@minion-stack/tsconfig/svelte.json` (SvelteKit)
- **D-09:** `minion_site` → extends `@minion-stack/tsconfig/svelte.json` (SvelteKit)
- **D-10:** `paperclip-minion` → extends `@minion-stack/tsconfig/node.json` (Express server + React Vite UI — server is canonical; UI's own tsconfig may extend `base.json`)
- **D-11:** `pixel-agents` → extends `@minion-stack/tsconfig/node.json` for extension backend; webview-ui may extend `base.json`
- **D-12:** `minion_plugins` → if any TS exists, extends `@minion-stack/tsconfig/library.json`; if none, skip tsconfig adoption (still ships env files)

### Lint config adoption (replace, preserve overrides)
- **D-13:** Replace each subproject's existing root lint config with `@minion-stack/lint-config` presets (oxlint where present, flat ESLint where present, Prettier where present).
- **D-14:** Preserve subproject-specific lint overrides in a per-subproject config that imports the preset and extends. Do NOT try to upstream subproject overrides into the shared preset in this phase.
- **D-15:** `minion` uses oxlint+oxfmt per its existing setup — lint-config preset must be compatible or provide an oxlint-only entrypoint.

### Env file adoption (additive, non-destructive)
- **D-16:** Each subproject ships both `.env.defaults` (committed non-secret values) and `.env.example` (required secret var names with descriptions, no values). If `.env.example` already exists, migrate content; do not drop variables.
- **D-17:** Each subproject's `.env.example` secret var names must match the subproject's Infisical project (`minion.json → subprojects.<id>.infisicalProject`). Discovery grep in each subproject for existing env var names drives the initial `.env.example` content.
- **D-18:** `.env.defaults` entries are safe to commit (booleans, local URLs, port numbers, feature flags). No secrets. Reviewed per-subproject.

### CI verification strategy (own CI, published versions)
- **D-19:** Each subproject's OWN CI (GitHub Actions in its repo) is the verification authority. The meta-repo does not run subproject CI.
- **D-20:** Each subproject installs `@minion-stack/*` via npm/pnpm/bun as regular deps at the currently published version (0.1.0 from Phase 2). No `workspace:*` or `file:` references — the adoption must work for someone who cloned only the subproject.
- **D-21:** Verification = subproject's own `build` + `lint` + `typecheck` + `test` (where those scripts exist) succeed locally AND in CI on the adoption PR.
- **D-22:** `minion doctor` from the meta-repo is a cross-cutting health report, NOT the CI gate. It must report green for all 6 at phase close.

### Branch strategy per subproject
- **D-23:** One feature branch per subproject, named `feat/adopt-minion-stack` (consistent across repos).
- **D-24:** Open a PR on each subproject repo for the adoption. Do not merge on behalf of the user — present the PR URL and let user merge after CI passes.
- **D-25:** Meta-repo (`.planning/`, docs, etc.) commits for this phase land on meta-repo `main` directly. No meta-repo feature branch.

### Backout / rollback
- **D-26:** If an adoption PR fails CI in a non-trivial way, the plan captures the failure in a `03-0X-ISSUES.md` artifact and the subproject's PR is closed (not merged). The meta-repo phase does NOT complete until all 6 subprojects have green adoption PRs or an explicit deferral reason.
- **D-27:** Deferral reason for any subproject must be logged in `deferred-items.md` with a recommended resolution path. `minion_plugins` (zero-TS) is a valid candidate for a partial deferral (env files only, no tsconfig).

### Claude's Discretion
- Exact order of wave-internal plans (e.g., `minion` before `paperclip-minion` within Wave 1)
- Whether to co-locate shared lint override config files (`.oxlintrc.json`, `eslint.config.js`) at subproject root or in a `config/` folder — follow each subproject's existing convention
- When to run `pnpm dedupe` / `bun install --frozen-lockfile` post-adoption
- How to word the adoption PR description (link back to meta-repo Phase 2 + the published `@minion-stack/*` npm pages)

### Folded Todos
None folded — no pending todos matched Phase 3 scope.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Meta-repo source of truth
- `minion.json` — subproject registry (paths, package managers, branches, Infisical projects, commands per subproject). The canonical list of which repos adopt what.
- `.planning/PROJECT.md` — Validated Requirements section lists M1 (Foundation) artifacts adoption depends on. Active section defines ADOPT-01..07.
- `.planning/REQUIREMENTS.md` — ADOPT-01..07 acceptance criteria.
- `.planning/ROADMAP.md` §Phase 3 — phase goal, success criteria, depends-on.

### Phase 2 artifacts (what's being adopted)
- `.planning/phases/02-foundation/02-03-SUMMARY.md` — `@minion-stack/tsconfig@0.1.0` (variants: `base`, `node`, `svelte`, `library`)
- `.planning/phases/02-foundation/02-04-SUMMARY.md` — `@minion-stack/lint-config@0.1.0` (oxlint preset + flat ESLint + Prettier)
- `.planning/phases/02-foundation/02-05-SUMMARY.md` — `@minion-stack/env@0.1.0` (6-level env hierarchy, `.env.example` validation)
- `.planning/phases/02-foundation/02-06-SUMMARY.md` — `@minion-stack/cli@0.1.0` (`minion doctor` reports env + link-drift per subproject)
- `.planning/phases/02-foundation/02-08-SUMMARY.md` — root `CLAUDE.md` Meta-repo Workflow section + root `README.md` onboarding
- `.planning/phases/02-foundation/02-00-CONTEXT.md` §D4, §D6–D8 — locked decisions on npm scope, tsconfig variants, lint-config shape, env hierarchy
- `.planning/phases/02-foundation/02-07-RENAME-RUNBOOK.md` — Infisical project naming (source of truth for each subproject's Infisical slug)

### Scope and branding
- `/home/nikolas/.claude/projects/-home-nikolas-Documents-CODE-AI/memory/feedback_root_branding_minion.md` — "minion" branding at root
- `/home/nikolas/.claude/projects/-home-nikolas-Documents-CODE-AI/memory/reference_npm_org_creation.md` — why `@minion-stack/*` (not `@minion/*`)

### Subproject-specific
- `minion/CLAUDE.md` (actually `minion/.dmux-hooks/CLAUDE.md` per root CLAUDE.md)
- `minion_hub/CLAUDE.md`
- `minion_site/CLAUDE.md`
- `paperclip-minion/AGENTS.md`
- `pixel-agents/CLAUDE.md`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`@minion-stack/tsconfig`** (published 0.1.0) — 4 variants ready to extend from
- **`@minion-stack/lint-config`** (published 0.1.0) — oxlint preset + flat ESLint + Prettier, all peer deps optional
- **`@minion-stack/env`** (published 0.1.0) — not a direct Phase 3 dep, but subprojects' `.env.example` will be validated by `minion doctor` via this package
- **`@minion-stack/cli`** (published 0.1.0) — `minion doctor` is the cross-cutting verification tool; `minion link/unlink` helps during adoption to test local overrides before publishing
- **`minion.json`** — registry already lists all 6 subprojects with correct Infisical project names post-rename

### Established Patterns
- Subproject tsconfig files currently exist in all TS-using subprojects (verified: `minion`, `minion_hub`, `minion_site`, `paperclip-minion`, `pixel-agents`, `minion-shared` have `tsconfig.json`; `minion_plugins` does not)
- `.env.example` exists in 4 subprojects (`minion`, `minion_hub`, `minion_site`, `paperclip-minion`). `.env.defaults` exists in none — this is net-new.
- Package managers diverge by design (`minion` + `paperclip-minion` → pnpm; `minion_hub` + `minion_site` → bun; `pixel-agents` + `minion_plugins` → npm). Each subproject's adoption PR uses that subproject's package manager.
- Each subproject has its own GitHub Actions workflows under `.github/workflows/` — these are the CI gates, not meta-repo CI.

### Integration Points
- `minion.json → subprojects.<id>.infisicalProject` → drives which secrets go in each subproject's `.env.example`
- `minion.json → subprojects.<id>.commands` → what `minion doctor` runs to health-check each adopted subproject
- `packages/cli/src/lib/link-drift.ts` → detects when a subproject links to `@minion-stack/*` locally vs published; Phase 3's D-20 (published versions only) avoids triggering drift warnings
- Each subproject's existing `tsconfig.json` `extends` field → target for replacement with `@minion-stack/tsconfig/<variant>.json`

</code_context>

<specifics>
## Specific Ideas

- Adoption PR descriptions should link to the published npm pages (`https://www.npmjs.com/package/@minion-stack/tsconfig`, etc.) so reviewers can verify the shared packages independently.
- For subprojects with existing strict tsconfig options beyond the variant (e.g., `noUncheckedIndexedAccess`), layer those in the subproject's own `tsconfig.json` after `extends` rather than fighting the variant.
- Before committing adoption on a subproject, run the subproject's `check` / `typecheck` / `build` scripts locally — fail fast, don't wait for CI.

</specifics>

<deferred>
## Deferred Ideas

- **Upstreaming subproject-specific lint rules into `@minion-stack/lint-config`** — evaluate in Phase 8 (Polish) after real adoption feedback.
- **Dedicated `@minion-stack/tsconfig/extension` variant for VS Code extensions** — if `pixel-agents` adoption reveals a need beyond `node`, capture as backlog for a future tsconfig 0.2.0.
- **Meta-repo-level `minion check --all`** — deferred to Phase 8 (the CLI already supports `--all`, but enforcing it as CI gate is Phase 8 work).
- **`@minion-stack/env` `--projectSlug` flag drift fix** — tracked separately as env@0.1.1 patch (noted in Phase 2 deferred-items.md).

### Reviewed Todos (not folded)
None.

</deferred>

---

*Phase: 03-adopt-foundation-in-subprojects*
*Context gathered: 2026-04-20 (auto mode, all gray areas auto-resolved with recommended defaults)*
