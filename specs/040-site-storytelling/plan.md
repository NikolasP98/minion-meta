# Implementation Plan: The landing tells the owner's story, in plain words

**Spec**: `specs/040-site-storytelling/spec.md` · **Repo**: `minion_site` (Bun, SvelteKit 2, Svelte 5 runes, Tailwind 4, Paraglide) · **Base**: `origin/dev` @ `4edd54f` · **Branch**: `feat/site-storytelling` · **PR base**: `dev` (draft, owner merges)

## Approach

One slice. The concourse world and every token stay; the change is voice, scale, composition and copy.

1. **Reading scale in `src/app.css`.** The contract's font-size roles are app density (body 14px) and adding marketing sizes to `contract.json` would need a repack of the vendored tokens tarball for one consumer; the site already owns its role classes (`.t-board/.t-row/.t-legend/.t-prose`) in `app.css`, so the new roles (`.t-head`, `.t-hero`, `.t-h2`, `.t-h3`, `.t-lead`, `.t-field`, `.t-btn`) live beside them with rem/clamp sizes. No literal colours (lint exempts only colours in `app.css`, and none are added).
2. **One section rhythm and one button recipe** (`.section*`, `.btn*`, `.link-action`) in `app.css`, replacing the per-section `.inner/.head/.title/.lede/.act/.tcta/.gbtn` copies. Consequence: `--page-max` consumers drop from 10 to 4; `scripts/token-integrity.test.mjs` pins that count and is updated deliberately in the same commit.
3. **Composition**: `+page.svelte` orders Hero → Problem (new) → Method → Week (new host for Cascade + Approval panels) → HowItWorks → Pricing → FAQ → FinalCTA (+ stay-in-touch). Bands alternate `--color-board-recess` with canvas.
4. **Copy** through a line-level edit of `messages/{es,en}.json` that keeps the files' mixed escaping untouched outside edited keys; 19 keys added per locale, ~85 values rewritten, parity checked by key-set equality.
5. **FAQPage JSON-LD** rendered in `<svelte:head>` from `getFaqItems()`, tags stripped, `<` escaped.
6. **Fonts**: add Barlow 400/500/600 (prose), keep Barlow Condensed (board) and Barlow Semi Condensed 500–700 (headings); drop unused weights.

## Gates (foreground, `timeout`, exit code captured, never piped)

`bun run check` · `bun run lint:design` · `bun run lint:tokens` · `bun run test` · `bun run build` · `bun run format:check:changed`

## Verification

Private headless Chromium via Playwright (`/usr/bin/chromium`, fresh process per capture, locale `es-PE`), never the shared :9223 browser. Two inspection rounds at 1440 and 390 (ES), one at 390 (EN) and one light-theme viewport. Evidence in `evidence/screens/` (after) and `evidence/taste/minion-ai.org-*` (before).

## Risks

- Body font changes globally (`--font-family-sans`), so `/members` prose also widens from Semi Condensed to Barlow. Same family; no layout change observed in scope; `/members` not reviewed.
- Removing caps from controls changes the dialog and auth pages' look; covered by `check` but not screenshotted.
