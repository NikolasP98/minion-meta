# UI Design Governance Hardening — Findings + Proposals

Date: 2026-07-15. Companion to `specs/2026-07-13-hub-ui-coherence-implementation-spec.md` (which stays the normative authority). This document records a full source audit of the token system, enforcement gates, and hub UI patterns, the governance fixes shipped with it, and proposed net-new manifest items for the UI-coherence program to adopt.

## Shipped with this audit

| Change | Where | Why |
|---|---|---|
| `lint:design:ci` step added to CI | `minion_hub/.github/workflows/ci.yml` | The debt ratchet was **not enforced anywhere** — CI ran only `lint:tokens:ci`, while `scripts/DESIGN-LINT.md` claimed `lint:design:ci` was the gate. Base ref resolves from PR base SHA or push `before` SHA via `DESIGN_LINT_BASE_REF`. |
| `ui-design-governance` skill | `.claude/skills/ui-design-governance/SKILL.md` (canonical, meta-repo) + `minion_hub/.claude/skills/ui-design-governance/SKILL.md` (mirror) | Agent-facing governance layer, auto-triggers on any UI work. |
| Governance sections | meta-repo `AGENTS.md` (Key Conventions), `minion_hub/CLAUDE.md` (REQUIRED-build-step section) | The ratchet was previously discoverable only by reading `scripts/`. |

## Audit findings

### Token package (`packages/design-tokens`, contract v1.0.0)

Healthy: 16 themes × 43 resolved tokens (hard-asserted), 10 AA-validated accent pairs, 34 aliases frozen by deep-equal test, stale-CSS and contrast guards at build. Gaps:

- **Orphan tokens** with no utility, alias, or README guidance: `--ease-spring`, `--shadow-focus`, `--shadow-status-glow`, `--letter-spacing-normal`.
- Semantic spacing tokens (`--space-control-gap/field-gap/card*/section/page-section`) have no README rows or utilities.
- `typographyStyles` emit `--theme-letter-spacing/line-height/font-weight` that nothing consumes.
- `decoration: crt|voxelized` is contract metadata with zero enforcement (consumer-owned, undocumented handoff).
- Spacing scale is deliberately non-contiguous (`--space-5/7/9/10/11/16` absent) but this is documented nowhere consumers look.
- `utilities.css` is hand-authored while `tokens.css` is generated — an asymmetry worth stating in the README.
- `aliases` is frozen by an exact deep-equal in `tests/contract.test.mjs`; `domainAliases` is the only extensible bucket. Undocumented.

### Enforcement (minion_hub)

- Global baseline (`scripts/.design-lint-baseline.json`) ceilings only **3 of 11 rules**: raw-color 855, bare-button 511, native-select 27. The other 8 rules have per-file ratcheting only.
- 23 exception entries across 12 files; debt concentrates in the marketplace identity-card family (IdBadgeCard raw-color 38, MinionLogo 35, CardBack 25, agents page 21) and `settings/CRTConfigModal.svelte` (raw-color 46).
- No pre-commit/husky hooks; pre-push runs build only.

### Hub UI patterns (142 route pages, ~430 components)

Well-covered (no action): focus ring (single global `:focus-visible`), scrollbars, status-color adoption (321 semantic uses, 0 palette bypasses), `.t-*`, `.surface-*`, PageHeader (102 uses), Button (145 uses), centralized Zag toast.

Gaps, ranked:

1. **Icon sizing — no token.** ~1,150 hardcoded lucide `size={N}` across 9 distinct values (12→227×, 13→173×, 14→278×, 16→171×, 11→101×, 15→87×, 10→44×, 20→43×, 18→35×). No convention; 13/14/15/16 used interchangeably.
2. **Chip/pill/tag — no primitive.** 24 files define local `.chip/.pill/.badge` styles; ~117 usages. `Badge` exists but is a different shape.
3. **Empty states — adoption debt.** `EmptyState.svelte` used in 23 files; ≥13 routes hand-roll the markup.
4. **Loading — adoption debt.** `Spinner` (13 uses) / `Skeleton` (6) vs 37 hand-rolled `animate-spin` + 20 `animate-pulse` + 2 bespoke `skel-pulse` keyframes.
5. **Transitions re-declared** in route styles: `transition: all var(--duration-fast) var(--ease-standard)` ×20, `border-color …` ×12.
6. **Multiline clamp hand-rolled**: 21 ellipsis + 5 `-webkit-line-clamp` in local styles; `line-clamp-2` utility used only 6×.
7. **StatusDot duplicated**: `ui/StatusDot.svelte` (canonical, 4 uses) vs `decorations/StatusDot.svelte`; raw `.status-dot` markup themed in app.css bypasses both.
8. **Tooltips**: `Tooltip` in 15 files vs native `title=""` ×78 in 26 route files.
9. **FormField family** used in 8 files vs ~30 routes hand-rolling label+input+error stacks.
10. **Avatar/initials — no primitive** (27 files reference; only an editor modal + dicebear helper exist).
11. **Dead `dark:` variants** (20× in 3 files: `workforce/inbox/+page.svelte`, `PipelineGateControls.svelte`, `PipelineTrace.svelte`) — no darkMode wiring exists, these never activate.
12. Zag wrappers duplicate part-styling constants per component instead of composing `.surface-*`.

## Proposals (for the UI-coherence program / Codex to adopt)

P-numbers are priority-ordered. Contract changes go through `contract.json` → regenerate → package release, per D1/D2.

- **P1 — Icon-size scale.** Add `--icon-size-xs: 12px / -sm: 14px / -md: 16px / -lg: 20px` to `contract.json` foundations + an `Icon` wrapper (or lucide default-size map) in `$lib/components/ui`. Collapse 9 ad-hoc values to 4. Then a `raw-icon-size` design-lint rule (regex `size=\{\d+\}` on lucide imports) to ratchet stragglers.
- **P2 — Chip/Tag primitive.** One `Chip` component (variants: default/removable/count/dot) in `packages/ui` or `$lib/components/ui`; add `.chip` to `utilities.css` `@layer components`. Retire the 24 local definitions wave-by-wave.
- **P3 — Utility classes** in `utilities.css`: `.skeleton` (surface + existing pulse keyframe), `.transition-fast`, `.transition-colors-fast`, `.clamp-2`, `.clamp-3`. Mirrors the precedent set by `.hover-lift`.
- **P4 — Unify StatusDot + add Avatar.** Collapse to `ui/StatusDot.svelte` (status-triple color + optional `dot-pulse`), delete the decorations copy; add `Avatar` primitive (image | initials fallback, sizes tied to P1 scale).
- **P5 — Adoption ratchets.** New design-lint rules (or grep-based checks) for hand-rolled empty states, `animate-spin` outside `ui/`, native `title=` on interactive elements, and label+input stacks outside `FormField` — start advisory, promote to ratchet once counts stabilize.
- **P6 — Expand the global baseline to all 11 rules.** `--update-baseline` currently snapshots 3; store ceilings for spacing/radius/shadow/motion/easing/layer/type-size/palette-utility too.
- **P7 — Document orphan and semantic tokens.** README rows for `--ease-spring`, `--shadow-focus`, `--shadow-status-glow`, semantic spacing, the non-contiguous spacing vocabulary, the hand-authored status of `utilities.css`, and the `aliases`-frozen/`domainAliases`-extensible split.
- **P8 — Delete dead `dark:` variants** in the 3 workforce files; rewrite to semantic tokens. (Mechanical, no design decision.)
- **P9 — Zag wrapper styling pass.** Wrappers compose `.surface-*`/`--shadow-overlay`/`--layer-*` instead of duplicating part constants.

## Layout-contract bugs (2026-07-15, post P1–P9)

Seven user-reported visual bugs traced to four root causes; all fixed and browser-verified. The systemic lessons are codified in the skill's "Layout contracts" section.

| Root cause | Fix | Bugs |
|---|---|---|
| `(app)/+layout.svelte` fade-wrapper was a block, so every shell's `flex:1` was inert — nav height, scroll ownership fell through to `route-viewport`, page bottoms clipped | wrapper → `flex flex-col`; `SectionNav` nav `height:100%` → `flex:1 1 auto` | POS nav height; settings nav scrolls with content; settings content cut |
| `@minion-stack/ui` Button slots children into a fixed-height inner `inline-flex` row span consumer classes can't reach | scoped `> span` overrides (POS sell `.card`, appearance `.theme-card`) | POS sell tiles collapse/overlap; theme cards non-uniform |
| ShiftBanner `.mini` display rules used `.box :global(.mini)` but `.mini` was a *sibling* of `.box` — never matched, mini rendered at all breakpoints | scoped `.mini-rail` wrapper anchors the rules | duplicate open-shift CTA |
| Stock/socials page roots lacked horizontal fill inside SectionShell's flex-row → shrink-to-content width tripped EditableGrid's `max-width: 620px` container query into 1 column | `flex-1 min-w-0` on both roots | stock dashboard single-column |

**P10 proposal (new):** `packages/ui` Button should expose its content wrapper to consumer layout (e.g. a `data-part="content"` hook or a `stacked` prop) so card-shaped buttons stop needing per-page `> span` overrides — three pages already carry the same workaround.

## DataTable batch (2026-07-15, later same day)

Three user-reported clusters (invisible/size-shifting row checkboxes, broken header filter dropdowns + dead click-outside, fit-to-content resize growing a few px per double-click) traced to one unifying root plus two independents — all fixed, measured, and browser-verified:

- **Unifying root:** DataTable/ColumnFilter passed styling classes as props to the shared `Button` primitive; every plain scoped rule for them (`.dt-check`, `.head`, `.backdrop`, `.ctx-item`, `.sort-h`, …) compiled but shipped dead, so Button's variant chrome rendered instead. Fixed by re-anchoring as `.ancestor :global(.class)`. Codified as the skill's **forwarded-class contract**.
- **Click-outside:** the dismissal backdrop was `position:fixed` inside the sticky `backdrop-blur` thead — `backdrop-filter` makes that thead the containing block, shrinking the backdrop to a 32px strip. Replaced with `<svelte:document onpointerdown>` + Escape. Codified as the **floating-panel dismissal contract**. Same fix applied to DataTable's column/bulk menus.
- **autoFit:** measured `td.scrollWidth`, which inner-truncating cells cap at current width. Now clones cell content into an off-screen `max-content` probe (font-copied), adds cell padding, clamps 64–640px — idempotent on second double-click (240→281→281px verified).
- New **selection-control contract** (fixed 1rem box both states, border-strong/surface-2 → accent/on-accent) applied to DataTable checkboxes and MultiSelectFilter.

**P11 proposal:** conformance tests for primitives-adjacent contracts (a probe that fails when a scoped rule targets a component-forwarded class without `:global`), candidate for `token-integrity.mjs` or a svelte-check preprocessor pass.

## Follow-up discovered during P9

Tooltip's positioner uses `!z-[9999]` and cannot adopt `--layer-*` in isolation: `app.css` has peer overlays hardcoded at 9998/9999 (lines ~589/925/968) and `ConnectionStatusIndicator.svelte` sits at 9999. These out-of-scale values exceed `--layer-debug` (100). Needs one coordinated stacking cleanup that moves all four surfaces onto the layer scale in a single change.

## Non-goals

- No changes to the frozen alias map or theme recipes here.
- No unilateral contract.json edits shipped with this audit — P1 is the only contract change proposed and it is additive.
