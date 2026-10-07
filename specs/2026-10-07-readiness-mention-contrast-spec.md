---
id: 2026-10-07-readiness-mention-contrast-spec
title: Resolved mentions inherit the AA-tuned foreground of every surface (HC-043)
stage: dev
status: implementing
pass: 2
verdict: pending
created: 2026-10-07
updated: 2026-10-07
repos: [minion_hub]
tags: [ui, test]
type: fix
proposal: 2026-10-07-hub-readiness-ui-a11y-followups
findings: [HC-043]
pr: 437
---

# Mention contrast on ordinary, error and user surfaces (HC-043)

## 0. Product

A resolved colleague mention (`@ana`) must stay readable wherever the hub renders it — the plain
panel text any consumer of `renderMention` gets, the error bubble, and the accepted user bubble —
on all 16 selectable presets and all 10 runtime accents, measured with valid CSS colour
conversion. This closes HC-043 from the readiness recon
(`2026-10-02-hub-gateway-production-readiness-recon`); HC-042's user-bubble contract (on-accent
foreground, underline, no keyboard affordance; hub #432) is preserved verbatim.

Canonicalized from the implementer's batch spec
(`~/.cache/codex-implementation/2026-10-03-hub-gw/spec-hc043-mention-contrast.md`); the
measured substance below is theirs.

## 1. Measurement method

- Static: `scripts/qa/hc043/resolve.ts` reads the shipped `src/app.css` `.mention` rule, the
  generated `tokens.css` (`@theme static` base + 15 `:root[data-minion-theme]` overrides), the 16
  `PRESETS`, and re-applies the 10 `ACCENT_OPTIONS` exactly as `applyTheme()` does
  (`--color-accent` + `onAccentFor`). Backgrounds are alpha-composited in sRGB over the full
  chain (bubble layer → host → canvas); `scripts/qa/hc043/css-color.ts` converts
  `oklab()`/`oklch()`/`color(srgb)`/`rgb[a]()`/hex per CSS Color 4. Self-check: Chromium's
  `oklab(0.80769 0.0975416 0.034682)` round-trips to the shipped `#fca5a5` and
  `oklab(0.443694 0.14388 0.0729957)` to `#991b1b`.
- Native: a static Vite fixture (`scripts/qa/hc043/fixture/`) imports the real `app.css` and
  mounts the real `ChatMessage.svelte` (aliases/ChatBlocks/AIDisclosureBadge stubbed; no app
  shell, no login, no production data) on a `--color-surface-2` host over the canvas — the live
  DetailPanel chain. Headless Chromium (browser-harness, `BU_CDP_URL=http://127.0.0.1:9223`)
  reads `getComputedStyle` colours for the mention and every ancestor, composites them with the
  same module, and cross-checks each opaque layer against a 2D-canvas fill (max delta 0.02/255
  across 480 rows). Error-bubble backgrounds arrive as `oklab(… / 0.15)` (Tailwind
  `bg-destructive/15`) and are converted, never read as RGB.
- Thresholds: every mention surface is 12px/600 → body text → 4.5:1. The historical
  `mention-other-surfaces-contrast-v1.json` error ratios (3.54:1 dark, 3.65:1 light) are not
  reproducible from valid data; its composited error background (20.5, 20.4, 23.0) is the
  unconverted Oklab triple. The valid composite for the same layers is (58, 45, 48).

## 2. AS-IS (hub master `32964676`, `.mention { color: var(--color-accent) }`)

Host `--color-surface-2`; `blue` = default accent, `min` = worst of the 10 runtime accents. Full
2112-row matrix (16 presets × 11 accents × 3 surfaces × 4 hosts):
`evidence-hc043/static-matrix-before.json`.

| theme | ordinary blue / min | error blue / min | user blue / min |
|---|---|---|---|
| new-york | 3.43 / 3.29 purple | 2.54 / 2.44 purple | 5.17 / 4.70 rose |
| btop-purple | 3.64 / 3.50 | 2.76 / 2.65 | 5.17 / 4.70 |
| cyberpunk | 3.76 / 3.61 | 2.89 / 2.78 | 5.17 / 4.70 |
| midnight-ocean | 3.38 / 3.24 | 2.53 / 2.43 | 5.17 / 4.70 |
| voxelized | 3.55 / 3.41 | 2.69 / 2.59 | 5.17 / 4.70 |
| void | 3.99 / 3.83 | 3.20 / 3.08 | 5.17 / 4.70 |
| obsidian | 3.65 / 3.51 | 2.76 / 2.66 | 5.17 / 4.70 |
| crt | 3.86 / 3.71 | 3.02 / 2.90 | 5.17 / 4.70 |
| github-light | 5.17 / 2.15 amber | 3.95 / 1.64 amber | 5.17 / 4.70 |
| solarized-light | 4.79 / 1.99 | 3.69 / 1.53 | 5.17 / 4.70 |
| catppuccin-latte | 4.87 / 2.02 | 3.73 / 1.55 | 5.17 / 4.70 |
| one-light | 5.17 / 2.15 | 3.95 / 1.64 | 5.17 / 4.70 |
| nord-light | 4.82 / 2.00 | 3.70 / 1.54 | 5.17 / 4.70 |
| rose-pine-dawn | 4.98 / 2.07 | 3.82 / 1.59 | 5.17 / 4.70 |
| gruvbox-light | 4.69 / 1.95 | 3.61 / 1.50 | 5.17 / 4.70 |
| ayu-light | 5.17 / 2.15 | 3.95 / 1.64 | 5.17 / 4.70 |

Failing: ordinary 449/704, error 535/704, user 0/704. Chromium (new-york/blue, pre-fix rule
re-injected in-page): ordinary `#2563eb` on `#18181b` = 3.43:1 (matches the historical valid RGB
evidence 3.4278), error `#2563eb` on `oklab(0.80769 0.0975416 0.034682 / 0.15)` over `#18181b` =
`#3a2d30` → 2.54:1.

Root cause: the runtime accent is a 600-scale action colour chosen so white clears AA on top of
it, which bounds its luminance low enough that it cannot also clear 4.5:1 as text on dark
surfaces; light presets fail with the bright accents (amber/green/cyan/emerald/orange).

## 3. TO-BE

| surface | foreground token | background | target |
|---|---|---|---|
| ordinary (any `renderMention` consumer) | inherits `--color-text-primary` (body `--color-foreground`) | host surface over canvas | ≥ 4.5:1 |
| error bubble (`ChatMessage` `error`) | inherits `--color-destructive` → `--color-danger-fg` | danger-fg @0.15 over host over canvas | ≥ 4.5:1 |
| user bubble (`.chat-user-message`) | inherits `--color-on-accent` (unchanged HC-042 identity) | `--color-accent` | ≥ 4.5:1, underline kept |

Invariants: the mention never reads worse than the text of the surface it sits on; identity is
non-colour (600 weight + underline) on every surface; no new token, no raw colour, no per-theme
selector; `cursor: default`, no `tabindex`, no keyboard affordance (mentions stay inert spans).

After (static, same layout; `evidence-hc043/static-matrix-after.txt`; ordinary/error no longer
depend on the accent):

| theme | ordinary | error | user blue / min |
|---|---|---|---|
| new-york | 16.97 | 6.91 | 5.17 / 4.70 |
| btop-purple | 13.70 | 7.51 | 5.17 / 4.70 |
| cyberpunk | 18.09 | 7.87 | 5.17 / 4.70 |
| midnight-ocean | 15.03 | 6.90 | 5.17 / 4.70 |
| voxelized | 16.13 | 7.34 | 5.17 / 4.70 |
| void | 11.40 | 8.73 | 5.17 / 4.70 |
| obsidian | 14.88 | 7.53 | 5.17 / 4.70 |
| crt | 9.03 | 8.22 | 5.17 / 4.70 |
| github-light | 15.80 | 6.35 | 5.17 / 4.70 |
| solarized-light | 4.99 | 5.93 | 5.17 / 4.70 |
| catppuccin-latte | 7.52 | 6.00 | 5.17 / 4.70 |
| one-light | 11.34 | 6.35 | 5.17 / 4.70 |
| nord-light | 11.64 | 5.94 | 5.17 / 4.70 |
| rose-pine-dawn | 7.00 | 6.14 | 5.17 / 4.70 |
| gruvbox-light | 10.53 | 5.81 | 5.17 / 4.70 |
| ayu-light | 6.26 | 6.35 | 5.17 / 4.70 |

Chromium after, new-york/blue, desktop 1280×900 and mobile 390×844 identical: ordinary `#fafafa`
on `#18181b` = 16.97, error `#fca5a5` on `#3a2d30` = 6.91, user `#ffffff` on `#2563eb` = 5.17;
github-light/blue: 15.80 / 6.35 / 5.17. All 16 presets × 10 accents × 3 surfaces in-browser:
480/480 ≥ 4.5 (min ordinary 4.99 solarized-light, error 5.81 gruvbox-light, user 4.70 rose).
Every row: 12px, weight 600, `text-decoration-line: underline`, `tabIndex -1`.

## 4. DELTA

| # | Transition | Proof |
|---|---|---|
| 1 | `src/app.css` `.mention`: `color: var(--color-accent)` → `color: inherit`; add `text-decoration: underline`; keep `font-weight: 600; cursor: default`. One rule now carries the whole mention identity on every surface. | `mention-contrast.test.ts` matrix assertions; Chromium computed-style rows |
| 2 | `src/lib/components/chat/ChatMessage.svelte`: remove the `<style>` block `.chat-user-message :global(.mention) { color: inherit; text-decoration: underline }` — its declarations are now the global rule's; the `chat-user-message` class stays as the user-surface marker. | user-bubble computed style unchanged (5.17 / 4.70, underline, 600) |
| 3 | `src/app.css` `a` rule: `TODO(handoff)` comment only — links share the accent-as-text defect (3.3–4.0:1 on dark presets); out of HC-043 scope. | ledger entry in the proposal |
| 4 | New `scripts/qa/hc043/`: `css-color.ts` (conversion), `resolve.ts` (static matrix), `mention-contrast.test.ts` (vitest contract), `report.ts` (table printer), `fixture/` (Chromium fixture). No new dependency. | the test file itself |

## 5. Verification

- `bun x vitest run scripts/qa/hc043/mention-contrast.test.ts`: pre-fix 2 failed / 7 passed
  (`evidence-hc043/vitest-red-prefix.log`, worst pairs listed with fg/bg/ratio); post-fix 10
  passed (`vitest-green-postfix.log`). The contract asserts: Oklab self-checks, rejection of the
  historical unconverted composite, 16 presets × 11 accents × 3 surfaces × 4 hosts ≥ 4.5:1 except
  two named surface-text gaps, mention ≥ its surface's own text everywhere, user rows inherit
  on-accent with underline + 600.
- Chromium: `evidence-hc043/computed-contrast.json` (computed strings, layer chains, composites,
  ratios, font size/weight, decoration, tabIndex, canvas delta) + six screenshots
  (after/before-emulated new-york, after github-light × desktop/mobile). "before-emulated"
  re-injects the pre-fix global declarations in-page; because the HC-042 scoped rule is now folded
  into the global one, that emulation's user row reproduces the HC-042 1:1 case rather than the
  HC-043 baseline (5.17).
- Gates: `lint:tokens` 0 violations before and after. `lint:design` totals for this change are
  unchanged; the observed raw-spacing 27→28 and raw-icon-size 1111→1110 deltas come from
  concurrent uncommitted edits by another agent in the same worktree (`DeleteConfirmModal`,
  `RegistryAgentSheet`, `HostsOverlay`, `ConditionModal`, `DeleteChapterModal` — the HC-028 lane);
  neither HC-043 file adds an arbitrary value and `app.css` is not a lint target.
  `svelte-check --threshold error`: 2 errors, both in the foreign `ConditionModal.svelte` edit,
  0 in HC-043 files.

## 6. Implementation record

- Hub commit `1f1def7a` (`fix(chat): resolved mentions inherit each surface's AA-tuned
  foreground`) on `fix/readiness-hub-ui-a11y`, draft PR
  [minion_hub #437](https://github.com/NikolasP98/minion_hub/pull/437).
- Tests: `scripts/qa/hc043/mention-contrast.test.ts` red 2 failed / 7 passed → green 10 passed.
- Evidence (local, not committed): `~/.cache/codex-implementation/2026-10-03-hub-gw/evidence-hc043/`
  (`static-matrix-before.json`, `static-matrix-after.txt`, `computed-contrast.json`,
  `vitest-red-prefix.log`, `vitest-green-postfix.log`, six PNGs).

## 7. Out of scope / open ends

Every open end below is ledgered in `proposals/2026-10-07-hub-readiness-ui-a11y-followups.md`.

- Two hosts where the surface's own text already fails AA and an inheriting mention can only
  match it (not chat hosts; encoded as `KNOWN_SURFACE_TEXT_GAPS` with a `TODO(handoff)` in
  `scripts/qa/hc043/resolve.ts`): solarized-light `--color-text-primary` on `--color-surface-3`
  = 4.39:1 (the design-tokens contract gates text only against canvas), gruvbox-light
  `text-destructive` on `bg-destructive/15` over `--color-surface-3` = 3.86:1.
- `a { color: var(--color-accent) }` link contrast (`TODO(handoff)` in `src/app.css`).
- `concourse`/`concourse-day` exist in the contract but are not selectable presets; not measured.
- The composer `ref-pill` (`ChatInput.svelte`) already uses `--color-foreground` on a 14 % accent
  tint and is not a `.mention` surface; unchanged.
- No markup/serializer, token-contract, shared-package, i18n or data change.
