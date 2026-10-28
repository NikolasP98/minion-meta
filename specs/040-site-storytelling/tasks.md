# Tasks: The landing tells the owner's story, in plain words

Site anchors @ `origin/dev 4edd54f`. One worktree `~/.cache/claude-tmp/site-taste` (`git -C minion_site worktree add … -b feat/site-storytelling origin/dev`, real `bun install`). Gates in the foreground with `timeout`, exit code captured.

## Phase 1: Evidence
- [x] T001 Install the taste skill for Claude Code (`~/.claude/skills/taste` → `~/.codex/skills/taste`).
- [x] T002 Capture production at 1440/390 with the taste extractor; baseline analysis `evidence/taste/minion-ai.org.md` (+ §Baseline friction).
- [x] T003 [P] Reference analyses: basecamp.com (problem-first owner letter, one filled button), holded.com (Spanish-first SMB ERP, same buyer), waveapps.com (fallback for gusto.com, which served a Cloudflare challenge; warm trust for non-technical owners, FAQ as fears).

## Phase 2: Shared roles (US1)
- [x] T004 `src/app.css`: reading scale, section rhythm, button recipe, `.t-field/.t-btn`; `src/app.html`: font weights, Spanish title/description/OG, amended direction contract.

## Phase 3: Chapters (US1–US4)
- [x] T005 [US1] `Hero.svelte`: plain H1, method sentence, one amber ask + text link, board with flap caption.
- [x] T006 [US2] `Problem.svelte` (new): four pains + close line.
- [x] T007 [US2] `Method.svelte`: plain step names, flap numerals, expert-term footnote, data ground, ask row.
- [x] T008 [US3] `Week.svelte` (new) hosting `Cascade.svelte` + `Approval.svelte` as panels.
- [x] T009 [US1] `HowItWorks.svelte`: timeline + main ask + reassurance.
- [x] T010 [US4] `Pricing.svelte`: shared buttons, neutral badges; copy de-jargoned, stale beta badge fixed.
- [x] T011 [US4] `FAQ.svelte` two-column + FAQPage JSON-LD in `+page.svelte`; questions rewritten.
- [x] T012 [US4] `FinalCTA.svelte`: one ask + stay-in-touch WhatsApp door; `TODO(handoff)` + proposal `2026-10-24-site-stay-in-touch-updates`.
- [x] T013 [US1] `Navbar.svelte`/`Footer.svelte`: sentence case, 44px controls, nav CTA hidden < 30rem, WhatsApp contact column, tagline.
- [x] T014 `LeadFormDialog.svelte`, `AuthShell.svelte`, login/register: sentence-case title, labels, buttons.
- [x] T015 `messages/{es,en}.json`: copy changes, parity.
- [x] T016 `DESIGN.md` amendment; `scripts/token-integrity.test.mjs` `--page-max` pin 10 → 4.

## Phase 4: Verify and ship
- [x] T017 Gates: check 0, lint:design 0 (9/7/0 unchanged), lint:tokens 0, test 0 (17 node + 72 vitest), build 0.
- [x] T018 Two screenshot rounds (1440/390 ES, 390 EN, light 1440); fixes batched (nav CTA wrap, amber badges, duplicate "en beta", panel gaps, EN em dashes).
- [ ] T019 Commit (signed), push `feat/site-storytelling`, open DRAFT PR to `dev` with before/after screenshots; record the Vercel preview URL. **Blocked 2026-10-24: 1Password SSH signing returned `failed to write commit object`.**
- [ ] T020 Commit this spec on `spec/040-site-storytelling`, PR to meta `dev`. **Blocked by the same signing failure.**
- [ ] T021 Owner review on a phone (SC-006); owner merges.
