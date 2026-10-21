# Desktop updater qualification

UI capture source: Hub PR #577, commit `9026275e`. Local actual-component fixture at
`http://127.0.0.1:5201/fixture.html`, dedicated headless Browser Harness session.
Data and Tauri IPC are synthetic; these screenshots do not show an installed
OS update or production behavior. Package installation/relaunch remains tracked
in `proposals/2026-10-21-hub-desktop-updates.md`.

- [Available, light, 460 × 340](available-light.png): install/restart and Continue.
- [Download progress](progress-light.png): 43 percent with a native status event.
- [Recovery, dark, 360 × 400](recovery-dark-narrow.png): Check again and Continue.
- [Debian package notice, narrow](debian-dark-narrow.png): direct installer action.

Measured button heights are 44 px. At 360 px width, document scroll width is
360 px. Tab focuses Check again. Coordinate clicks exercised Install and restart,
Check again, Get installer and Continue; the fixture recorded their exact narrow
IPC commands. Generated native IPC tests separately prove that hosted Hub,
external origins and the wrong local window cannot invoke installation.

Local checks: ten Rust tests, eleven release contracts, updater UI build,
svelte-check (zero errors/warnings), design ratchet, token integrity and actionlint.
The full web suite passed 7,843 tests (263 skipped), plus three architecture
tests. The production build and both client-boundary checks passed. Four-target
packaging CI passes as recorded below. No new release was published during implementation.

Rust baseline: full release library output included an unused 221,744,274-byte
static archive and 325,256-byte shared library. The desktop-only probe emits only
rlib. Cold and dependency-rebuilding timings are not comparable; no measured
installer-size or startup-speed improvement is claimed.

## Packaged UI and live CDN checks

The native UI bundle was rebuilt from Hub `f1f53848` and served on loopback.
A pre-document native IPC stub and Spanish browser locale exercised the actual
bundled `desktop/main.ts` entry, rather than a hot-reloaded language switch.
[Spanish startup notice at 360 × 400](packaged-spanish-narrow.png) renders both
buttons in Spanish, at 44 px high, with no horizontal overflow. This remains a
browser proof with synthetic native IPC, not an installed OS update.

The existing public `desktop-v0.0.1/SHA256SUMS` release asset returned HTTP 200
with 582 bytes and an ETag. Repeating its download with `If-None-Match` returned
HTTP 304 with zero body bytes. This proves conditional delivery on the current
release CDN; the new updater feed itself has not been published.

## Publication dry run

`publisher-dry-run.mjs` executes the Hub publisher with synthetic metadata, a
synthetic token and an in-process HTTP stub. It performs no network requests or
GitHub writes. Six scenarios passed: bootstrap channel creation, advancing an
existing feed, rejecting a draft, rejecting a downgrade, repeating an identical
feed without writes, and rejecting a missing public package before mutation.

Run it against the candidate checkout:

```sh
node specs/evidence/hub-desktop-updates-2026-10-21/publisher-dry-run.mjs /path/to/minion_hub
```

The simulated mutation counts were 2 for bootstrap (create/upload), 2 for advance
(delete/upload), and 0 for each remaining scenario. These are HTTP protocol and
publication-order checks, not proof that a release has been published.

## Final candidate and cross-platform CI

Hub head `c0528fedf99a21b13870e8cfc46ae4cb9fc26ed2` passed both
[desktop qualification](https://github.com/NikolasP98/minion_hub/actions/runs/39553642753)
and [the complete web CI](https://github.com/NikolasP98/minion_hub/actions/runs/39553642738).
Desktop qualification ran all ten native tests and packaged installers on Linux
x64, Windows x64, macOS Apple Silicon and macOS Intel. The release-contract job
also passed. Vercel's status for this head confirms successful preview deployment;
this is not a production desktop release.

All four uploaded platform artifacts were downloaded for read-only inspection.
Five installer hashes and four updater payload signatures/signed versions verify.
[Artifact receipts](ci-artifacts.json) retain file sizes, hashes and key digests.
These use disposable CI keys; they cannot be published through the production
update channel. The macOS archives contain the expected `.app` layout.

The receipts identify GitHub's PR merge commit
`4ce5c5f3ac84c8e3d1bfd4c2fe37365c55e371ae`. Its Git tree
`062f37a84a5d63389cfb402ad85c64819dc2db6f` exactly matches the candidate head's
tree. That identity was checked through the GitHub Git API and local Git.

Installed old-to-new replacement and relaunch remain unproven on all four OS
targets and are explicitly tracked before first updater publication. No new
desktop release or `desktop-updates` feed was published by this task.
