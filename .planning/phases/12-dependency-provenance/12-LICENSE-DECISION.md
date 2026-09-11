# 12-03 license decision — @minion-stack/* packages

This is a decision document, not an implementation. Per this plan's
boundary ("legal attribution is the owner's call"), **no LICENSE file has
been created by this work.** It lays out the exact, verified current state
and the options for the repo owner (Nikolas Pinon) to pick from.

## Current state (verified, not inferred)

- **No `LICENSE` file anywhere**: `find . -maxdepth 1 -iname "LICENSE*"` at
  the meta repo root returns nothing, and the same check inside
  `packages/shared/`, `packages/crm-sdk/`, `packages/design-tokens/` also
  returns nothing.
- All three packages' `package.json` declare `"license": "MIT"` as a bare
  metadata string — no `LICENSE`/`LICENCE`/`COPYING`/`NOTICE` file is
  listed in any of their `files` arrays, and `scripts/qc/package-provenance.mjs`
  packing each one for real confirms none ships such a member in its
  tarball (`hasShippedLicenseFile: false` for all three — see
  `12-PACKAGE-MATRIX.md`).
- `packages/shared/README.md` (from the already-merged 12-08 clean-emission
  work) already carries a `TODO(handoff)` on exactly this gap, pointing at
  `proposals/2026-09-08-platform-qc-remediation.md`.
- Two of the three packages (`@minion-stack/shared`, `@minion-stack/design-tokens`)
  are already published to the public npm registry with the `"license":
  "MIT"` metadata field and no license file in the published tarball
  either (`npm pack @minion-stack/shared@0.9.0` / `@minion-stack/design-tokens@0.1.0`
  and inspecting the extracted tarball confirms this — see
  `12-PACKAGE-MATRIX.md`'s registry comparison). This is a live, public gap
  today, not a future risk.
- npm's own registry UI and `npm-registry-fetch` clients render an MIT
  badge for these packages from the metadata field alone; nothing currently
  contradicts that badge, but nothing in the actual archive backs it either.

## Why this matters

A `"license": "MIT"` field with no shipped license text is a common but
real gap: it signals intent without granting the actual permissions the MIT
license text grants (the field alone is not a license grant — most legal
guidance and OSI treat the *license text* as the operative grant, the SPDX
identifier as metadata about it). Consumers who vendor the compiled
tarball (not the git repo) have no license text in their copy at all.

## Options for the owner

### Option A — Add an MIT `LICENSE` file at the repo root, ship it in every package

1. Add `LICENSE` at the meta repo root: standard MIT text, copyright line
   `Copyright (c) <year> Nikolas Pinon`.
2. Add `"LICENSE"` to the `files` array of `packages/shared/package.json`,
   `packages/crm-sdk/package.json`, `packages/design-tokens/package.json`
   (and any other `@minion-stack/*` package meant for publication).
3. Either duplicate the root `LICENSE` file into each package directory (npm
   requires the file to be *inside* the package directory to ship it — a
   root-level file one level up is not picked up by `files` globs), or add a
   `prepack`/`build` step that copies it in before packing (the same pattern
   `packages/shared/scripts/build.mjs` already uses for validating its own
   output tree).
4. Re-run `scripts/qc/package-provenance.mjs` — `hasShippedLicenseFile`
   should flip to `true` for every package that got the copy step.

This is the standard, lowest-friction choice for an already-`"license":
"MIT"`-labeled, already-partially-published package family: it makes the
existing metadata field true instead of changing it.

### Option B — Change the declared license

If MIT is not actually the intended terms (e.g. a source-available or
proprietary license is intended, or these are meant to stay unpublished
internal tooling that happens to be under an npm scope):

1. Decide the actual terms.
2. Update `"license"` in all three (and any other) `package.json` files to
   the correct SPDX identifier, or `"UNLICENSED"` if the packages are not
   meant to be publicly redistributable at all (note: two are **already
   published** publicly under `"license": "MIT"` — switching to
   `"UNLICENSED"` going forward does not retroactively change what was
   already published at `0.9.0`/`0.1.0`; that would need its own decision
   about whether those already-public versions are deprecated).
3. Add whatever license/notice file that choice requires (a proprietary or
   source-available license still typically ships license text; only a
   deliberately-unlicensed/no-redistribution package ships none by design).

### Option C — Do nothing now, keep it as an explicit tracked gap

Leave the metadata as-is, keep the existing `TODO(handoff)` in
`packages/shared/README.md`, and let this document plus
`proposals/2026-09-08-platform-qc-remediation.md` be the record. This is
what the plan's closure policy defaults to if the owner does not pick A or
B: DEP-03 stays open on this specific point, tracked, not silently
resolved by inventing a file.

## What this task did NOT do

- Did not create any `LICENSE`/`NOTICE` file.
- Did not change any `"license"` field.
- Did not publish anything.
- Did not decide Option A vs B vs C — that is the owner's call, per this
  plan's explicit boundary.
