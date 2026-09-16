# 13-14 final local qualification

The eight-file candidate is frozen in `freeze/manifest.json` (SHA-256 `333ed08be8ca1762113b6f3f190ccc1d47034f6c4f67efc668b5e8330e757ca8`), with exact copies under `freeze/files/`.

Final command, from `minion_site`:

```sh
env -i PATH=/usr/bin:/bin HOME=/home/nikolas/.cache/minion-qc/13-14-GBkGxWfg/home LANG=C.UTF-8 PLAYWRIGHT_BROWSERS_PATH=/home/nikolas/.cache/minion-qc/browsers-2026-09-11 MINION_WEBKIT_EXECUTABLE=/home/nikolas/.cache/minion-qc/webkit-runtime-2026-09-11/run-webkit.sh /usr/bin/node scripts/qc/ui-fixtures.mjs
```

Exit 0. Run `ui-fixtures-aUkIQd`: 22 tooling, 56 ordinary native, 22 real gateway contract cases, then 75 browser cases (25 each Chromium, Firefox, WebKit), zero skips or retries. Actual rune compiler client hash remains `c278d82385dee0a125c2d1959f8b4f08dbac183100e3675cf39ce56aef1784d8`. Full native source/package/artifact closure matched before/after. All selected font faces loaded with EN/ES samples; all native browser cases have runtime/network/error evidence. Combined retained output, including receipt, is 16,000,622 bytes, below 250 MiB.

Native eight-file Prettier check, scoped config/spec TypeScript check and design lint passed. The global existing 289-file formatting debt remains unchanged. `checks/final-input-check.json` verified all 28,232 preserved input records and all 36 internal dependency links, with zero unexpected changes. No installation or active checkout mutation occurred.

Earlier attempts are preserved. The sixth full run passed all 75 browser cases but the final evidence inventory rejected native fontconfig cache aliases. The final change excludes private cache/home/tmp directories from both upload and evidence budget; evidence members still reject symlinks, tested with a real cache alias and a forbidden evidence alias. The seventh complete entrypoint passed. Setup failures, earlier 72/75 browser result and diagnostic quota failures are not counted as acceptance.

New workflow actions are pinned to official commit identities in `checks/actions/selected.json`. The original baseline check-and-build job was preserved exactly; the fresh upstream dev branch has newer gates and must be merged independently by the release owner. All three output bundles are uploaded, excluding private caches.

Remaining boundaries: stock Ubuntu 24.04 browser-library installation and hosted workflow execution have not run; local WebKit uses the qualified private Linux wrapper. Browser tests exercise synthetic authentication and loopback protocol fixtures, not a real deployed authenticated session. The selected shared C tarball is the root-authorized local artifact; this receipt is not an npm publication or production package identity claim. Root owns fresh-dev three-way integration, source review, commit/push and deployment. No unowned source, plan, global status or proposal writes were made by this task.
