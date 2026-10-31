# Tasks: The landing wears a clinic, and the week demo tells one patient's story

**Input**: `specs/044-site-clinic-journeys/{spec,plan}.md`

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Evidence
- [x] T001 [P] Taste runs on jane.app, pabau.com, parsleyhealth.com (onemedical.com blocked) → `evidence/taste/`.
- [x] T002 Spec, checklist, plan written; worktrees `meta-044` (off `origin/dev`) and `site-clinic` (off `origin/master`) created and installed.

## Phase 2: Foundational (blocking)
- [x] T003 meta `packages/design-tokens/contract.json`: add `clinic` (light) and `clinic-night` themes; regenerate; package build green (AA test for both).
- [x] T004 meta `node scripts/pack-design-system.mjs` → new tokens archive + receipt; copy archive to site `deps/`, update `package.json` file dep, `deps/design-token-provenance.json`, `deps/design-system-provenance.json`, pins in `src/lib/ui-button-artifact.test.ts` and `scripts/token-integrity.test.mjs`; `bun install`; `bun run test:tokens` green.
- [x] T005 site fonts: add `@fontsource-variable/fraunces` + `@fontsource-variable/instrument-sans`, remove the three Barlow packages; `src/app.css` imports.

## Phase 3: US1 the clinic world
- [x] T006 [US1] `src/app.css`: chart roles (`.t-head` serif, `.t-lead`, `.t-prose`, `.t-label`), plate (`.board` restyled: sheet, hairline, radius-lg, no bezel/shadow), buttons as pills (`.btn`, `.btn-primary` teal), `.section-band` = sheet on bone, stamp and line keyframes, reduced-motion guards; remove `.flap*`, `.t-board/.t-row/.t-legend`, bezel.
- [x] T007 [US1] `src/app.html`: default `data-minion-theme="clinic"`, `theme-color`, rewritten direction contract; `src/lib/stores/theme.svelte.ts`: `clinic`/`clinic-night`.
- [x] T008 [US1] `board/StatusBadge.svelte` → stamp (same props); `board/BoardTable.svelte` → day sheet; delete `board/FlapText.svelte`; `Hero.svelte`, `Method.svelte`, `Footer.svelte`, `Navbar.svelte`, `Pricing.svelte`, `HowItWorks.svelte`, `AuthShell.svelte`, `LeadFormDialog.svelte`, login/register: drop flap/caps roles, mascot filter, amber hovers → accent.

## Phase 4: US2/US3 the journey
- [x] T009 [US2] `week/JourneyRail.svelte` (7 icons, drawn line, tabs pattern) and `week/ChartCard.svelte` (entries with who + stamp).
- [x] T010 [US2] `week/Inbox.svelte` (typing dots → message → slot pick → reply + agenda figure), `week/Reminder.svelte` (auto-play), `week/Completion.svelte` (consumption dialog with editable qty incl. 0 → cascade, stock counter, receipt figure), `week/WeekSheet.svelte`.
- [x] T011 [US2] Restyle `RefundGate.svelte`, `StockAlert.svelte` (clinic products, level figures), `FaqReply.svelte`; add plan markers.
- [x] T012 [US2][US3] `sections/Week.svelte`: seven chapters, entries state, next/replay/reset, keyboard; `ondone(entries)` contract.
- [x] T013 [US2] `messages/{es,en}.json`: `week_*` rewritten; parity check; `i18n:compile`.

## Phase 5: Docs and gates
- [x] T014 `DESIGN.md` rewritten (chart world), `PRODUCT.md` incumbent-look note.
- [x] T015 Gates: check, lint:design, lint:tokens, test, build, format:check:changed; grep `flap` = 0 in `src`.
- [x] T016 Screens 1440/390 × es/en × light/night + journey played end to end → `evidence/screens/`; fixes batched.
- [x] T017 Commit (signed), push, draft PR site → `master`; meta: spec + contract PR → `dev`; flat stub spec + `spec-index`.
- [x] T018 [OWNER] Merged 2026-10-30: site #38 → master `46c212f` (Vercel prod success, `data-minion-theme="clinic"` live on www.minion-ai.org), meta #901 → dev `f06b5b8`. Phone review still open.
