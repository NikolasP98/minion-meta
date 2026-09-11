---
phase: 12-dependency-provenance
plan: 01
status: in_progress
requirements_completed: []
---

# 12-01 bounded Hub dependency security patch

The isolated candidate closes the selected SvelteKit, Tiptap, DOMPurify, xmldom and Vitest advisory version matches and passes focused behavioral compatibility. The shared checkout manifest and lock remain unchanged while full build admission is pending. DEP-01 remains open.

## Boundaries

Owned source: package.json, bun.lock, tests/dependencies/security-compatibility.test.ts and the independently admitted Vitest include glob only. The manifest/lock candidate is in `/tmp/minion-360-12-01/candidate/`; the clean frozen-install copy is `/tmp/minion-360-12-01/clean/`. This plan does not upgrade unrelated advisory families, modify production, migrate data, install a new browser runtime or claim container provenance. Existing staged work stays intact.

Selected exact versions: Kit 2.70.2; all active Tiptap 3.30.5; collaboration 3.30.5 and y-tiptap 3.0.7 peers; ProseMirror model 1.25.11 and view 1.41.9; DOMPurify 3.4.13 across transitive copies; xmldom 0.8.15; Vitest 4.1.11. The 44 changed package records stay within these families. All 47 checked editor peer contracts match. Four local package archives and their verified integrity records are preserved. See 12-ADVISORIES.md for exact baseline/candidate hashes, primary sources and residual records.

## Actual evidence

- Clean `bun install --frozen-lockfile --ignore-scripts`: passes with preserved candidate lock. Only empty synthetic public analytics bindings are used; private environment files and unrelated filesystem trees were excluded.
- Baseline security fixture: 4/5 grouped tests fail. Malformed Accept and Markdown inputs exceed a 2.5-second child-process deadline; invalid XML entity serialization is accepted; Chromium reproduces prototype-inherited attributes and detached sanitizer descendant defects. XML signing already passes. These are bounded fixture findings, not proof every exploit is reachable in the app.
- Candidate final fixture: 5/5 grouped tests pass in 2.98 seconds, including real Chromium editor paste/Markdown, plain sanitizer, prototype attributes and detached descendant safety. Screenshot candidate-browser-final.png was visually inspected. Native fixture requires explicit MINION_DEPENDENCY_BROWSER=1 and exclusive dedicated browser ownership; default unit skip does not qualify it.
- Actual finance signXml synthetic RSA signature verifies, then rejects tampered invoice content. The existing SUNAT algorithm contract is preserved; no real certificate, SUNAT call or invoice mutation occurs.
- Clean `bun run check`: passes, 0 errors and 0 warnings. Initial missing public static bindings were corrected with empty synthetic environment values; that initial harness failure is not classified as library incompatibility.
- Full `bun run build`: client/server compilation passes, but Vercel packaging fails with Node heap OOM and exit -6. The explicit 8 GB retry was interrupted at the diagnostic cutoff. Default build compatibility has not passed.

## Open work and handoff

Real Hub package admission, installed-checkout verification and independent candidate review remain pending. Nineteen advisory records remain in other Hub families; every unreviewed platform/container/plugin surface and exact non-Hub family child plan remains open. TODO(handoff) is recorded in the dependency fixture with a pointer to the root-owned QC proposal UI-06; root owns the matching proposal and planning updates.

The default packaging OOM is a separate build-budget finding. Source CI has no Node heap override; the matched original-lock baseline also fails with a default-heap OOM. This proves a packaging problem predates the selected dependency changes on this source snapshot; it does not prove identical root causes or qualify the candidate. If the explicit 8 GB retry succeeds, that result must not be reported as a default CI build pass.

The final Node fixture adds post-import readiness assertions before hostile parsing. Candidate: 4 passed; baseline: 3 failed, 1 passed, with the native case intentionally skipped in this rerun. Both baseline readiness assertions passed before the 2.5-second parser timeouts, distinguishing them from import/tool failures. A fresh-baseline missing generated Svelte tsconfig caused a separate initial test startup error; explicit `svelte-kit sync` corrected the setup before these results. Native browser logic is unchanged from the inspected 5/5 run. Scoped Prettier check passes.

Root independently reviewed the readiness markers, real signing/tamper fixture and native production-library fixture as coherent. Fixture/config are frozen; source family admission remains held by the build disposition. The default-heap baseline build with the original lock and matching 2,390 source input files completed with exit -6 after 394.4 seconds, with fatal OOM reported around 307.8 seconds and peak child RSS 5,672,356 KiB. No diagnostic cutoff was applied. Partial outputs remained 52 MiB SvelteKit and 29 MiB Vercel static. The next build investigation should first isolate the actual @vercel/nft reachable graph and trace culprit; route splitting or build heap configuration requires its own bounded admission.

The heavy-work window was released after the baseline child fully exited. Root now owns manifest/lock coordination for 12-04 reproduction/selection only; no real dependency application was performed. Frozen candidate package-lock patch SHA-256: `8af0d3be77868e3023c2da8d2335ab06eb4f71508bb33288c2736df805b13583`. The independently reviewed fixture/config remain unchanged. Build diagnosis is drafted separately in 12-05-PLAN.md; no configuration or source repair is admitted by that draft.
