# Desktop updater qualification

Source: Hub PR #577, commit `9026275e`. Local actual-component fixture at
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
packaging CI is recorded in the PR as it finishes. No new release was published during implementation.

Rust baseline: full release library output included an unused 221,744,274-byte
static archive and 325,256-byte shared library. The desktop-only probe emits only
rlib. Cold and dependency-rebuilding timings are not comparable; no measured
installer-size or startup-speed improvement is claimed.
