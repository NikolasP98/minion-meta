---
phase: 12-dependency-provenance
plan: "01"
status: complete-private-candidate
requirements-completed: []
snapshot: /home/nikolas/.cache/claude-tmp/12-01-392e01c2/minion_hub
executed: 2026-09-11 (continuation of the 2026-09-09 partial; fixtures were already complete)
executor: Claude (Fable 5.1) continuation, ponytail mode
base: "minion_hub origin/master 1df0a921 (fix(ui): native Dialog consumers … #245)"
owned_files:
  - path: minion_hub/package.json
    before: 12199632c49e0bc9960ec32203357b6bdfe90981f7b4d78ba771c1b9f5e547f6
    after: 9746f3d623c2976793c8f193e47b82f51385728c16ee1b7b103d8e0cb4c21724
  - path: minion_hub/bun.lock
    before: ebc14272d106ebd486bedc7128fbaa5e775b15f1f675c026c33d5c9507c2963d
    after: 363e2ee6b753e9c1d72c8c5417b39b02660c181bdaa5e0e0e668c2e16053a82f
  - path: minion_hub/vitest.config.ts
    before: 5a894f6d1623a3c84298b8efe23365698704ff8a0a159cb644de64c43ca9b182
    after: 113bc156de2ad4375efe006ce57f509a5081bf6447decfc080d63125a4a1f971
  - path: minion_hub/tests/dependencies/security-compatibility.test.ts
    before: ABSENT
    after: de630b38a76aa25608e75d4bc5540a50b314cbdc2f973c105fd46cf9db0de6c3
  - path: .planning/phases/12-dependency-provenance/12-ADVISORIES.md
    before: 318bb3d2dfa87ebb209420d2904dcd39a43b21e575212adae59d8dc03e82a68e
    after: ca5e44fa53f341da40dba4f181d69c106093c0ca6d99fc68eb69e6824e097122
decision_ids: [D360-01, D360-04, D360-06]
---

# 12-01 Summary — bounded Hub dependency security patch (dependency transaction)

Source edits live only in the private snapshot `/home/nikolas/.cache/claude-tmp/12-01-392e01c2/minion_hub` (detached worktree of Hub `origin/master` 1df0a921). Nothing committed, staged, pushed, tagged, merged or deployed; the main Hub checkout, other worktrees, stashes and branches were not touched. Receipts: `/home/nikolas/.cache/claude-tmp/12-01-392e01c2/checks/` (`before.txt`, `after.txt`, `freeze.json`, every gate log ends with `exit=<code>`).

## What this continuation did

The 2026-09-09 run left the fixture and Vitest include reviewed and frozen, with the dependency transaction held by the failing full default build. Its frozen candidate lock (`/tmp/minion-360-12-01/candidate-package-lock.patch`, SHA-256 `8af0d3be…`) was **not** replayable: Hub master moved (`@event-calendar/core` added, happy-dom 15.11.7→20.11.6, svelte 5.56.4→5.57.0, svelte-check pinned 4.7.6, `vitest.config.ts` gained `resolve.conditions`). So the transaction was re-resolved on the current base with the same reviewed family selection.

### Task 1 — fixture and inventory (already complete; re-validated)

- `tests/dependencies/security-compatibility.test.ts` copied byte-for-byte from the reviewed 2026-09-09 candidate (`de630b38…`, unchanged; still carries its TODO(handoff)). It was absent on master.
- `vitest.config.ts`: one-line change — `'tests/dependencies/**/*.test.ts'` appended to `test.include` (the `resolve.conditions` block that master added since 09-09 is untouched).
- Platform inventory in `12-ADVISORIES.md` stands as recorded on 2026-09-09 (13 locks; only Hub mutated). 12-ADVISORIES.md gained a dated 2026-09-11 section with the new candidate identities, evidence table and PR #256 coordination notes; the status line was updated.
- Baseline on master (RED, real): Node fixture **3 failed / 1 passed / 1 skipped**, exit 1 (Accept + Markdown children `ETIMEDOUT` at 2.5 s; invalid entity serialization accepted; XML sign/verify/tamper passes). Native Chromium **1 failed**, exit 1 — page reports `FAIL: prototype attributes: inherited executable attributes` and `FAIL: detached sanitizer subtree: detached handler retained` (`checks/baseline-browser.png`, inspected).

### Task 2 — dependency transaction and product checks

Manifest (`package.json`): `@tiptap/{core,extension-drag-handle,extension-highlight,extension-image,extension-node-range,pm,starter-kit}` → exact `3.30.5`; `dompurify` → `3.4.13`; `@sveltejs/kit` → `2.70.2`; `vitest` → `4.1.11`; `overrides` += `prosemirror-model 1.25.11`, `prosemirror-view 1.41.9`, `@xmldom/xmldom 0.8.15`, `@tiptap/extension-collaboration 3.30.5`, `@tiptap/y-tiptap 3.0.7`, `dompurify 3.4.13` (existing `devalue`/`sha.js` overrides kept). No major bumps, no update-all.

Lock (`bun.lock`, Bun 1.3.4): `bun install` (47 pkgs; Bun kept locked collaboration 3.27.3 / y-tiptap 3.0.6 despite the new overrides — same quirk as 09-09) → `bun update @tiptap/extension-collaboration @tiptap/y-tiptap` (3.30.5 / 3.0.7) → `bun install --frozen-lockfile` **exit 0**. Semantic lock diff (`checks/lock-semantic-diff.txt`): **44 records changed**, all in the admitted families (SvelteKit 1, Tiptap 32, Vitest 8, DOMPurify 1, xmldom 1, ProseMirror 2) — same 44 as the 09-09 candidate. Four local `deps/*.tgz` records: 0 changed lines. Peer contracts: 48 checked, **0 violations** (`checks/peer-contracts.txt`). Single installed copy each of dompurify 3.4.13, @xmldom/xmldom 0.8.15, prosemirror-model 1.25.11, prosemirror-view 1.41.9.

| Gate | Result | Log |
|---|---|---|
| `node node_modules/vitest/vitest.mjs run tests/dependencies/security-compatibility.test.ts` | **4 passed, 1 skipped**, exit 0 | `checks/candidate-fixture-node.log` |
| same with `MINION_DEPENDENCY_BROWSER=1 BU_NAME=minion-12-01-392e01c2 BU_CDP_URL=http://127.0.0.1:9223` | **5 passed / 5**, exit 0; page shows 4 PASS (`checks/candidate-browser.png`, inspected) | `checks/candidate-fixture-native.log` |
| `bun run check` (`env -i` + `PUBLIC_POSTHOG_KEY= PUBLIC_POSTHOG_HOST=`) | **0 errors, 0 warnings**, exit 0 | `checks/candidate-check.log` |
| `bun run build` (same env, default heap, no NODE_OPTIONS) | **exit 0**, 264 s, 8,438 client / 6,368 server modules, adapter-vercel `✔ done`, `.vercel/output` 99 MiB, sampled peak tree RSS 2,807,664 KiB | `checks/candidate-build.log` |
| `bun run check` / `bun run build` without the two synthetic bindings | exit 1 / exit 1 — `src/hooks.client.ts` imports `PUBLIC_POSTHOG_KEY/HOST` from `$env/static/public` (harness precondition, recorded as the plan allows; not a library failure) | `checks/candidate-check-noenv.log`, `checks/candidate-build-noenv.log` |
| Prettier `--check` on the 3 owned Hub files + fixture | pass, exit 0 | `checks/prettier.log` |
| `git diff --check` | exit 0 | `checks/git-diff-check.log` |

The default-heap full build that blocked the 09-09 run **passed** here; the OOM did not reproduce on this base (12-02 also built 1df0a921 at default heap). The 09-09 packaging-OOM finding therefore stays an unexplained base/environment difference, not a candidate defect; the 12-05/06/07 diagnostics remain their own open items.

## Deviations

- Frozen 09-09 lock patch not replayed (base moved); re-resolved with identical family targets. The resulting 44-record delta matches the reviewed candidate's delta.
- Synthetic empty `PUBLIC_POSTHOG_KEY`/`PUBLIC_POSTHOG_HOST` used for check/build after both refused without them; no real key, no `.env`, no Infisical.
- Native browser gate ran on the shared dedicated headless Chromium (127.0.0.1:9223) with a unique `BU_NAME`; the fixture hard-requires that CDP URL. Exclusive ownership of that daemon cannot be proven from this session.
- Build log contains `PostHogFetchNetworkError` noise from `@inlang/paraglide-js`'s bundled posthog-node (pre-existing, silenced in vite.config.ts); not introduced by this change.
- Fixture's screenshot default path is `/tmp/…`; overridden via `MINION_DEPENDENCY_SCREENSHOT` into the snapshot to honor the no-/tmp rule (fixture bytes unchanged).

## Gaps / open (DEP-01 not closed)

1. **Real checkout admission**: the candidate exists only in the snapshot. Needs root's lock ownership + commit/PR on Hub (`master`), sequenced with open Hub PR #256 (12-02) which edits the same three files. Merge simulation (`checks/pr256-merge-sim.log`): adjacent-line conflicts only — `package.json` (drop `d3-scale`/`d3-shape`, keep `"dompurify": "3.4.13"`), `vitest.config.ts` (identical include entry; keep #256's `exclude` block); `bun.lock` must be re-resolved by whichever lands second (`bun install` → `bun update @tiptap/extension-collaboration @tiptap/y-tiptap` → `--frozen-lockfile`).
2. **Residual advisories not re-scanned** on 2026-09-11 (registry advisory queries are external network calls outside this run's package-install allowance). The 09-09 residual table stands, except the three `happy-dom 15.11.7` rows, which described the dirty worktree lock — master installs 20.11.6.
3. **Non-Hub surfaces** (meta, gateway, site, paperclip, pixel-agents, drone, langgraph, base, factory ×4, container images, bundled plugin runtimes): inventoried only; each needs its own bounded child plan before DEP-01 can close. None created here (outside `files_modified`).
4. **Native gate exclusivity** unproven (shared 9223 daemon).
5. Hub PR #256 itself is still unmerged (12-02 `complete_uncommitted`); 14-03's crm-sdk archive adoption (`776d8c49`) also touches Hub `package.json`/`bun.lock` — root must serialize the three lock owners (12-01 → 12-02 → 14 adoption per the plan index).

## Next gated plan

Root-owned Hub lock transaction: apply this snapshot's `package.json`/`bun.lock`/`vitest.config.ts`/`tests/dependencies/security-compatibility.test.ts` to a Hub branch off `master`, reconcile with #256, run the same six gates on the merged lock, open the PR; then independent verification at the merged SHA and exact child plans for the non-Hub families.
