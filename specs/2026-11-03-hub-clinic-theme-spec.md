---
id: 2026-11-03-hub-clinic-theme-spec
title: Clinic theme pair and complete token coverage
stage: test
status: review
verdict: pending
pass: 1
created: 2026-11-03
updated: 2026-11-03
repos: [minion-meta, minion_hub]
proposal: 2026-11-03-hub-clinic-theme
---

# Clinic theme pair and complete token coverage

## 0. Product

Implement the user's three clinical UI references as a new Hub theme with both
light and dark modes. Additional research requested by the user covers Pinterest
and other UI galleries/libraries. The style uses cool blue neutrals, cobalt
actions, softly rounded panels, subtle elevation, and lilac/cyan chart accents.

The user directly authorized local implementation. Formal approval before
development and independent two-pass review are bypassed for this reversible
theme addition; local standards and requirements reviews will be recorded here.
No merge or deployment is authorized. Edits stay in the existing checkouts:
the session instructions forbid changing branches/worktrees without a request.

## 1. AS-IS

- At the meta candidate's parent `071ff5ae`,
  `packages/design-tokens/scripts/contract.mjs:resolveTheme` resolves 43
  per-mode tokens. Five categorical tokens are emitted globally by the CSS
  generator; status recipes are selected by mode. The contract declares 20
  modes, 71 foundation tokens, and 50 aliases.
- The initial local Hub checkpoint (section 6) recorded 16 exposed presets and a
  bundled token dependency in `package.json` and `bun.lock`.
- That checkpoint's `src/lib/themes/runtime.ts:applyTheme` selects
  `data-minion-theme` and keeps
  the user's independent accent pair. Theme preferences already persist locally
  and synchronize through the existing server preference API.

## 2. TO-BE and invariants

- Add `clinic-light` / Clinic Light and `clinic-dark` / Clinic Dark.
- Each mode resolves every theme token, including all chart colors, with the
  same shared foundations and aliases; no property is undefined. The
  [generated inventory](../packages/design-tokens/inventory.json) owns theme IDs
  and resolved counts; the [contract](../packages/design-tokens/contract.json)
  owns foundation and alias definitions.
- Three readable text levels meet 4.5:1 on all five surfaces; accent/on-accent
  and status foreground/surface pairs meet 4.5:1. Accent controls and categorical
  chart marks meet 3:1 on their checked surfaces. Disabled text is exempt.
- Radius: 4/8/12/16/24/9999 px. Complete light/dark shadow recipes include focus
  and status glow. Frozen typography, spacing, responsive layout, motion,
  control sizes, and stacking remain shared under the D2 contract.
- Every selector resets chart colors. Existing modes retain their exact values.
- The existing picker, accent choice, persistence, and semantic aliases work
  without per-component theme selectors. Existing defaults remain unchanged.

## 3. DELTA and verification

| Transition | Implementation | Proof |
|---|---|---|
| Add a complete paired theme | Contract colors, Clinic radius/shadow/status recipes, chart palettes | Shared contract tests; text checks on every surface |
| Resolve theme-specific palettes/statuses | Optional `statusRecipe` and `palettes`; default fallback/reset | Generated selector checks; every old theme restores defaults |
| Make the installed Hub consume it | Pack token artifact; update dependency/lock; preset catalog | Installed/source byte parity; Hub runtime contract/contrast tests |
| Verify real component styling | Isolated browser fixture mounts production primitives and runtime | Desktop/mobile screenshots; switch/reload/focus/overlay checks |

Run `pnpm --filter @minion-stack/design-tokens build`, Hub's
`bun run lint:design`, `bun run lint:tokens`, focused theme tests, `bun run check`,
and `bun run build`. Run the normal test suite and distinguish unrelated
baseline failures from this change. Browser fixtures use local synthetic data
and no production APIs.

## 4. Reference research

- User references: Cliniko appointment density and category colors; Clinic's
  blue-white surfaces and rounded cards; Cosmasol's lilac/cyan analytics palette.
- [Doctors Clinic Dashboard](https://www.behance.net/gallery/206350509/Doctors-Clinic-Dashboard): paired light/dark clinic dashboard reference found through image search.
- [OneDoc dashboard](https://www.behance.net/gallery/222814913/OneDoc-Smart-Dashboard-for-Modern-Clinics/modules/1272116581): blue-white cards and restrained chart emphasis.
- [Dribbble medical dashboards](https://dribbble.com/tags/medical-dashboard): additional gallery search; direct browser access returned a blank page.
- [Radix Themes color](https://www.radix-ui.com/themes/docs/theme/color): paired tinted neutrals and semantic scale roles; retained Minion's own selector/runtime.
- [Pinterest search](https://www.pinterest.com/search/pins/?q=healthcare%20dashboard%20ui): attempted in browser and search tool; blank/inaccessible. No pin content claimed as inspected.

## 5. Out of scope

Dashboard redesign, route changes, production preference writes, automated login,
merge, deployment, package publication, and editing unrelated concurrent work.

## 6. Validation record

Historical initial-checkout qualification recorded on 2026-11-03, before the
current remote-base candidate in section 7. Counts, archive identities, and
outcomes below describe that earlier checkout:

- Shared token package build and eight contract tests pass. JSON Schema validation
  passes. All 18 prior themes resolve to exactly their previous values; shared
  foundations, responsive settings, aliases, and accent options are unchanged.
- Hub uses `deps/minion-stack-design-tokens-0.1.0-clinic-fec33270.tgz`.
  Archive SHA-256: `fec3327083c88eb99ee63b9815763ec32fb61990a85fb77d269ab32889c393fd`.
  The archive and installed package match all five source contract/schema/CSS/
  utility/README files byte for byte.
- Eight focused Hub contrast/runtime tests pass. The complete unit run with
  `bun run vitest run --maxWorkers=2` passes: 511 files, 4,364 tests; the existing
  suite skips three files and 193 tests. The separate architecture suite passes
  three tests. No SQL or authenticated account flow was added by this theme.
- `bun run check`: zero errors and zero warnings. `bun run build`: exit 0,
  including Vercel adapter packaging. The build prints existing optional-peer
  dependency and PostHog telemetry notices.
- `bun run lint:tokens`: zero violations. `bun run lint:design`: exit 0;
  existing repository debt is still reported, with no production Svelte edits
  in this change. `git diff --check` passes in both repositories.
- The browser preview builds current production components and the actual
  appearance page. Both modes resolve all 168 token properties and set the
  correct native color scheme. Desktop and mobile screenshots and executable
  browser results live under Hub's ignored `test-results/clinic-theme/`.
  The verifier passes reload persistence, native modal background-focus
  exclusion, Escape/focus restoration, 390px layout and dialog bounds, and
  selection/persistence through the actual appearance page. Both modes have
  zero document overflow. Review `light-desktop.png`, `dark-desktop.png`,
  `light-mobile.png`, `dark-mobile.png`, and `browser-results.json` in that folder.

Local standards review: semantic roles remain authoritative; generated CSS is
not hand-edited; complete categorical reset prevents stale palette values.
Local requirements review: both selectable modes cover every contract token,
with the existing preference and accent paths retained. These are self-reviews,
not an independent approval or release claim.

At that checkpoint, repository-wide metadata checks were blocked by earlier
files. Proposal indexing rejected unknown `custom-columns` / `filesystem` tags in
`2026-09-30-hub-custom-property-select-picker.md` and
`2026-10-03-gateway-managed-writer-generation-leases.md`. Spec checks reported
earlier heading/topic errors and the existing `verdict: partial` in
`2026-09-21-hub-customer-identity-guardians-spec.md`. The new proposal validates
in an isolated corpus; its generated entry was added without rewriting other
proposal entries. The spec index regenerated successfully; its full check still
reported those earlier errors. No unrelated document was changed to clear them.

At initial local qualification no commit, pull request, npm publication, merge,
production preference write, or deployment was performed.

## 7. Push candidate on current remote bases

The user subsequently requested pushing this work. Clean feature clones preserve
the original dirty checkouts. The meta candidate starts at `071ff5ae` on `dev`;
the Hub candidate starts at `f407d05b` on `master`. The registry PR bases are
`dev` and `master` respectively. The local no-mistakes project setting records
the meta PR base so the gate follows that registry role.

The pre-change contract in section 1 already includes the distinct warm-teal
`clinic` / `clinic-night` pair used by the Site and the `--page-max` foundation.
Preserve those existing themes and foundations.
This candidate adds only the blue pair documented in the
[package reference](../packages/design-tokens/README.md#clinic-themes); generated
theme IDs and resolved counts live in
[inventory.json](../packages/design-tokens/inventory.json). Hub keeps its curated
catalog and adds only the two new blue modes; Site-specific Concourse entries
remain outside the Hub picker.

Seventeen shared contract/audit/inventory tests pass, including the full
330-combination normal-text matrix. The current canonical packer qualifies all
eight token-package members, including the audit API and source inventory.
Hub retains its existing UI archive; its token dependency, immutable archive,
provenance receipts, and receipt pin change together. Initial-checkout evidence
above is historical; clean-candidate qualification and hosted CI determine
whether this branch is ready to merge. The documentation-phase checks of this
candidate pass `node scripts/spec-index.mjs --check` and
`node scripts/proposal-index.mjs --check`; the historical metadata blockers in
section 6 do not apply to this candidate. Push authorization does not assert that
a production deployment has happened.
