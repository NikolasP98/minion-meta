# Implementation Plan: The landing wears a clinic, and the week demo tells one patient's story

**Branch**: `spec/044-site-clinic-journeys` (meta) · `feat/site-clinic-journeys` (site, off `origin/master` @ `558b53b`) | **Date**: 2026-10-29 | **Spec**: `specs/044-site-clinic-journeys/spec.md`

## Summary

Two slices in one site PR plus one meta PR. (1) The token contract gains `clinic` and `clinic-night`; the site vendors the new durability archive. (2) The site swaps the concourse world for the clinical chart (fonts, roles, plate, stamp motion) and rewrites the Week section as a seven-chapter patient journey with a rail and an accumulating chart card. Content outside `week_*` is untouched.

## Technical Context

**Language/Version**: TypeScript strict, Svelte 5 runes, SvelteKit 2, Tailwind 4, Bun (site); Node 22 + pnpm 10 (meta packer)
**Primary Dependencies**: `@minion-stack/design-tokens` (vendored durability archive), `@fontsource-variable/fraunces` 5.3.0 (serif voice), `@fontsource-variable/instrument-sans` 5.3.0 (UI voice), `lucide-svelte` (icons), Paraglide
**Storage**: none (prerendered marketing route)
**Testing**: `bun run check`, `bun run test` (vitest + node:test), `lint:design`, `lint:tokens`, `test:tokens`, `format:check:changed`, `build`; meta `pnpm --filter @minion-stack/design-tokens build`, `node scripts/pack-design-system.mjs`
**Target Platform**: Vercel, mobile-first evaluation on mid-range Android
**Constraints**: semantic tokens only; no colour literal outside `contract.json`; reduced motion parity; both locales; `lint:design` counts never rise

## Constitution Check

- I Spec before code: spec.md written and validated (checklists/requirements.md).
- II AS-IS/TO-BE/DELTA with anchors: present; taste evidence in `evidence/taste/` (jane.app, pabau.com, parsleyhealth.com).
- III Slice-scoped: site worktree `~/.cache/claude-tmp/site-clinic`, meta worktree `~/.cache/claude-tmp/meta-044`; gates foreground with `timeout`; PRs: meta → `dev`, site → `master` (scoped release, as #35/#37).
- IV Required build steps: token contract extended (not bypassed); `lint:design && lint:tokens`; Paraglide `m.*()` + `i18n:compile` for every string; no new route, so no RBAC/route-contract work.
- V Security/data: none touched.

## Research decisions

- **Theme values** (from the three taste analyses, `evidence/taste/`): warm off-white ground (parsley `#F8F6F2`), green-black ink instead of black (parsley `#284849`), one teal for actions (jane `#027989`), tinted flat plates and no shadows (all three), serif headline + sans UI (jane, parsley), pills for actions only (parsley). Chosen: canvas `#f7f5f0`, sheet `#ffffff`, tint `#edf3f1`, ink `#223f40`, accent `#1f6f68` on white; night: canvas `#0f1a1a`, accent `#6fd3c4` on ink. All pairs must pass the package's AA test; values are adjusted there, never in the site.
- **Status colours** stay the contract's light/dark recipes (green/amber/red) so the stamps read the same in hub and site.
- **Domain aliases** `--color-board-*` are kept as the names the site already consumes (the alias layer is machine-named; DESIGN.md documents the chart meaning). No alias is added, so the hub is unaffected beyond two extra themes it does not select.
- **Fonts**: Fraunces variable (opsz/wght, soft serif that reads warm at 64px and sharp at 28px) and Instrument Sans variable (humanist, tabular numerals). Both exist on npm at 5.3.0; fallback if install fails offline: `Georgia`/`ui-serif` and `system-ui`.
- **Motion**: CSS keyframes only (`stamp-land`, `line-draw`, `type-dots`, `print-out`), one JS counter tween for stock 12 → 11 guarded by `matchMedia('(prefers-reduced-motion: reduce)')`, and the existing beat timers pattern from `YesCascade`. No animation library.
- **Chart card state**: one `$state` list of entries in `Week.svelte`; each chapter calls `ondone(entries)`; replay replaces that chapter's entries (edge case in spec).

## Project Structure

### Documentation (this feature)

```text
specs/044-site-clinic-journeys/
├── spec.md
├── plan.md
├── tasks.md
├── checklists/requirements.md
└── evidence/
    ├── taste/        # jane.app, pabau.com, parsleyhealth.com (.md + .json)
    └── screens/      # after: 1440/390 × es/en × light/night
```

### Source code

```text
packages/design-tokens/contract.json          # + clinic, clinic-night
packages/design-tokens/{tokens.css,inventory.json}  # regenerated

minion_site/
├── deps/minion-stack-design-tokens-0.1.1-durability.h<new>.tgz
├── deps/{design-system-provenance,design-token-provenance}.json
├── package.json, bun.lock
├── src/app.html                              # direction contract, default theme clinic
├── src/app.css                               # chart roles, plate, stamp, journey line
├── src/lib/stores/theme.svelte.ts            # concourse → clinic names
├── src/lib/components/board/StatusBadge.svelte   # stamp
├── src/lib/components/board/BoardTable.svelte    # day sheet
├── src/lib/components/board/FlapText.svelte      # deleted
├── src/lib/components/sections/{Hero,Method,Week}.svelte
├── src/lib/components/sections/week/
│   ├── JourneyRail.svelte      # icons + drawn line
│   ├── ChartCard.svelte        # accumulating record
│   ├── Inbox.svelte            # ch1 WhatsApp → slot → agenda
│   ├── Reminder.svelte         # ch2 auto-play
│   ├── Completion.svelte       # ch3 consumption → cascade + receipt
│   ├── RefundGate.svelte       # ch4 (kept, restyled)
│   ├── StockAlert.svelte       # ch5 (clinic products, level figures)
│   ├── FaqReply.svelte         # ch6 (kept, restyled)
│   └── WeekSheet.svelte        # ch7 summary
├── messages/{es,en}.json                      # week_* rewritten
├── DESIGN.md, PRODUCT.md
└── src/lib/ui-button-artifact.test.ts, scripts/token-integrity.test.mjs  # pins
```

## Gates (foreground, `timeout`, exit code captured, never piped)

meta: `pnpm --filter @minion-stack/design-tokens build` · `node scripts/pack-design-system.mjs` · `node scripts/spec-index.mjs`
site: `bun run check` · `bun run lint:design` · `bun run lint:tokens` · `bun run test` · `bun run build` · `bun run format:check:changed`

## Verification

Private headless Chromium (`BU_CDP_URL=http://127.0.0.1:9223` via browser-harness, or a fresh `/usr/bin/chromium` process), `vite preview` of the built site; captures at 1440 and 390 for es and en, light and night; journey played end to end once at 1440 and once at 390; reduced-motion run with `emulateMedia`.

## Risks

- The durability archive changes identity for every consumer that pins it; the hub keeps its current archive (different version pin), so only the site moves.
- Fraunces variable is ~200 KB per axis set; subset to Latin via fontsource's `latin` files only.
- `/members` inherits body font and plate restyle (same class names); not reviewed, flagged as a known gap like spec 040 did.
