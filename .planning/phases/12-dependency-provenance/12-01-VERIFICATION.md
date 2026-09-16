---
phase: 12-dependency-provenance
plan: "01"
verified: 2026-09-11
verifier: executing agent (self-check; independent verification still required)
snapshot: /home/nikolas/.cache/claude-tmp/12-01-392e01c2/minion_hub
status: complete-private-candidate
---

# 12-01 Verification — goal-backward check

Evidence root: `/home/nikolas/.cache/claude-tmp/12-01-392e01c2/checks/`.

## must_haves.truths

| Truth | Verdict | Evidence |
|---|---|---|
| Platform inventory identifies every supported dependency surface, exact affected versions/paths and minimum safe families; unknown surfaces remain explicit | **Partially met** — inventory of 13 locks + family table + explicit "not qualified" for images/plugins/Shells exists (12-ADVISORIES.md, 09-09 sections); Hub families have exact baseline→candidate versions. Non-Hub surfaces are listed but their affected paths/min-safe families are not individually resolved (needs child plans). | `12-ADVISORIES.md` §Platform inventory, §Bounded Hub family selection, §2026-09-11 |
| Reachable affected paths patched with passing compatibility/build evidence; residual advisory and candidate hashes recorded | **Met for Hub, in the private snapshot** — 44-record lock delta inside admitted families; fixture red→green (Node 3F/1P → 4P; native 1F → 5P); check 0/0; default-heap build exit 0; candidate hashes recorded in SUMMARY frontmatter and 12-ADVISORIES.md. Residual advisory table is the 09-09 record (not re-scanned; happy-dom rows flagged stale). | `checks/baseline-fixture-{node,native}.log`, `checks/candidate-fixture-{node,native}.log`, `checks/candidate-check.log`, `checks/candidate-build.log`, `checks/lock-semantic-diff.txt`, `checks/peer-contracts.txt`, `checks/after.txt` |

## must_haves.artifacts

| Artifact | Present | Provides |
|---|---|---|
| `minion_hub/tests/dependencies/security-compatibility.test.ts` | yes, snapshot only (`de630b38…`, unchanged reviewed bytes) | Accept-header CPU bound, Tiptap Markdown CPU bound, xmldom entity serialization rejection, real `signXml` sign/verify/tamper, native Chromium paste/Markdown + DOMPurify ordinary/detached-hook + prototype-attribute checks; skips native unless `MINION_DEPENDENCY_BROWSER=1` |
| `minion_hub/package.json` | yes, snapshot only (`9746f3d6…`) | exact Kit 2.70.2, Tiptap 3.30.5 ×7, DOMPurify 3.4.13, Vitest 4.1.11 + coherent overrides |

## must_haves.key_links

| Link | Verdict |
|---|---|
| fixture → `.planning/research/360-ui-dependency-verification.md` | Fixture exercises exactly the families that research names for step (1) of its minimal patch order (Kit, Tiptap family, DOMPurify, xmldom parents, Vitest patch) with the runtime/XML/signature/markdown fixtures it calls for. |
| `package.json` → `12-ADVISORIES.md` | Every manifest change maps to a row in the family table; the 2026-09-11 section records the resulting manifest/lock hashes and gate results. |

## Task verify commands (as written in the plan)

- Task 1: `cd minion_hub && node node_modules/vitest/vitest.mjs run tests/dependencies/security-compatibility.test.ts` → **4 passed, 1 skipped, exit 0** (candidate); 3 failed / 1 passed / 1 skipped, exit 1 on the unpatched base.
- Task 2: `MINION_DEPENDENCY_BROWSER=1 … vitest run …` → **5/5, exit 0**; `bun run check` → **0 errors 0 warnings, exit 0**; `bun run build` → **exit 0** (default heap). Check/build needed synthetic empty `PUBLIC_POSTHOG_KEY`/`PUBLIC_POSTHOG_HOST`; the refusal without them is logged.

## Not verified / open

- No independent (non-executing) review of this continuation yet.
- Candidate not applied to any real checkout, branch or PR; not deployed.
- Exclusive ownership of the shared headless Chromium (9223) not provable; native result is real but the plan's exclusivity precondition is unproven.
- Residual advisories not re-queried on 2026-09-11; non-Hub surfaces unqualified; DEP-01 remains open.
