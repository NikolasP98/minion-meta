---
phase: 18-docs-governance
plan: "01"
verified: 2026-09-09T05:46:00Z
status: gaps_found
slice_status: passed
score: 1/3 roadmap truths verified to local-source boundary
slice_score: 2/2 plan truths verified to local-source boundary
requirements_verified_in_scope: [DOC-01]
requirements_completed: []
gaps:
  - truth: "Documentation and proposal dispositions cover supported behavior and remaining work."
    status: partial
    reason: "Active source instructions and a bounded inventory are verified. Full proposal/spec disposition and handoff convergence are separate phase-18 plans; deployed selection and every documentation sentence are not certified."
    artifacts:
      - path: .planning/phases/18-docs-governance/18-02-PLAN.md
        issue: "Historical proposal/spec convergence remains separately required."
      - path: .planning/phases/18-docs-governance/18-03-PLAN.md
        issue: "Whole open-items ledger convergence remains separately required."
    missing:
      - "DOC-02 and DOC-03 evidence, plus applicable release/runtime identity reconciliation before full phase closure."
---

# Phase 18, slice 01: Independent verification

**Phase goal:** Active instructions and proposal dispositions lead the operator to the supported behavior and remaining work.

**Result:** The active-instruction/source-inventory slice passes after two independent findings were corrected. This is not an all-documents audit or runtime certificate. DOC-01 remains globally pending under root ownership until its supported-source/runtime acceptance boundary is reconciled.

## Findings and recheck

1. **Unsafe first-tenant example survived the first edit.** Hub CLAUDE's API section still advised unauthenticated fallback and supplied executable `getTenantCtx` code selecting the first tenant. This contradicted its corrected Backend paragraph and09-03. Root replaced the entire example with identity-resolved context, null/403 behavior, enrollment and separate capability/record authority. The checker now catches the advice and executable pattern; its added negative test passes.
2. **Environment-file aliases escaped the first source guard.** `safeSource` rejected lexical `.env*` and outside-root symlinks but initially permitted an in-root innocuous alias resolving to `.env.local`. Root added a resolved-relative-path environment check and a synthetic alias regression. The test rejects before reading the synthetic environment file. No actual secret disclosure was observed or attempted.

Both findings are closed in the candidate below. Neither is left as an undocumented source gap.

## Observable truths and source facts

| Truth | Result | Evidence |
|---|---|---|
| Inventory distinguishes registry, actual checkouts, source claims and authority limits | Verified for local source | Fresh `buildManifest` yields6 registry entries,12 local entries and7 named facts. Registration/conventional branch is separate from local branch/HEAD. Source facts include path, digest, markers and bounded confidence. |
| Updated instructions direct supported source behavior and safe commands | Verified for edited claims | Root/README qualify platform inventory; DB exports and physical catalog are separated; Hub documents current Supabase/PostgreSQL with surviving LibSQL; Site explicitly selects Supabase versus legacy Better Auth. Unsafe tenant example removed; retired Hub DB scripts are explained rather than recommended. |
| Proposals/specs mapped and disposed | Not verified | Separate18-02 scope. |
| Every open source item and proposal reconciled | Not verified | Separate18-03 scope. |

Human prose was checked against executable source rather than accepting regex matches alone:

- Hub `db/client.ts` imports LibSQL and defaults `TURSO_DB_URL` to a local SQLite file; `pg-client.ts` imports PostgreSQL Drizzle and shared `/pg`; `pg-pool.ts` requires `SUPABASE_DB_URL` and separately reads pool size.
- Hub `resolveViaSupabase` verifies browser identity and resolves profile membership before constructing context. Selected bearer and explicit development paths are distinct. A legacy storage import does not establish legacy browser identity.
- Site `appRootHandle` selects Supabase when `AUTH_PROVIDER === 'supabase'`, except the retained `/api/auth/*` handling; the legacy default still calls Better Auth. Site's legacy DB client remains present. Documentation does not assert which branch is deployed.
- Shared DB package exports both `/schema` and `/pg`. That is an export inventory, not a physical table count or migration owner.
- `minion.json` contains six CLI entries. Local discovery includes additional independent checkouts; parent-repo identity is not assigned to ordinary nested folders.
- Existing force-bearing UI, RBAC, multi-agent and honesty conventions remain. The removed code example was unsafe active advice, not a historical document rewrite.

## Artifacts and wiring

| Artifact | Verification |
|---|---|
| `scripts/qc/repo-truth.mjs` | Substantive CLI and importable inventory/check functions; no package scripts or DB setup executed. Source paths are lexical/realpath confined, env aliases denied and HTTP remote userinfo/query/fragment stripped. |
| `scripts/qc/repo-truth.test.mjs` | Five passing tests cover source-path denial, remote sanitization, no inherited Git identity, absent commands/evidence and unsafe tenant example. |
| `18-REPO-TRUTH.json` | Parsed and compared against a fresh in-memory manifest:7 saved source fact digests match current source;12 entries and6 registered. Timestamped local snapshot, not a live release receipt. |
| `AGENTS.md`, `README.md`, Hub/Site `CLAUDE.md` | Real entrypoints reference the inventory workflow and qualified current source authority. Command declarations checked against owning manifests. |

GSD `verify artifacts` passes2/2 declared artifacts. The inventory CLI writes the named manifest only in normal generation mode; `--check-docs` inspects current sources and documents without executing declared commands. README/AGENTS point at this command, and the checker actually reads all four active instruction files. These are wired tooling/documentation paths rather than unused generated notes.

Level-4 dynamic UI tracing is not applicable. The equivalent chain is registry/Git/package/named source → manifest records → docs comparison; the seven claims were manually followed into actual source implementations.

## Independent checks

| Check | Result |
|---|---|
| `node --test scripts/qc/repo-truth.test.mjs` after both fixes |5/5 passed; total duration63ms. |
| `node scripts/qc/repo-truth.mjs --check-docs` |PASS:6 registry entries,7 source facts, declared commands checked. |
| In-memory `buildManifest` plus saved JSON comparison |12 entries,6 registered,7 observed facts; all saved fact hashes match. No manifest overwritten by verifier. |
| Scoped root/Hub/Site diff review and `git diff --check` |Passed for inspected instruction/source paths; unrelated WIP preserved. |

No browser, production connection, package install, migration or seed operation was used. Executable command presence is verified through package source; actual deployment/setup success is not claimed.

## Requirements, limitations and review axes

DOC-01 is addressed for the edited active claims and local source inventory. The script intentionally checks selected patterns and declared commands, so a passing check does not prove every prose statement or linked historical artifact. Its confidence label `source-pattern-observed` is appropriately weaker than runtime qualification. Runtime receipts are not embedded in this manifest; declared and local branches must still be reconciled with supported release workflows before operational action.

DOC-02 and DOC-03 are assigned to18-02/03, within this same phase. They are not later-phase deferrals and remain real phase gaps. No orphan phase requirement was introduced.

**Standards:** Both discovered guard/advice defects were corrected and rechecked. Existing technical symbols and force-bearing instructions are preserved. No source/docs edit by the verifier.

**Spec:**2/2 plan truths pass at the explicitly local-source boundary. Full phase is not complete. No further human test is needed for these deterministic source facts; deployment-specific provider, migration and release decisions still require their appropriate operational evidence.

## Candidate identity

| Source | SHA-256 |
|---|---|
| `scripts/qc/repo-truth.mjs` | `08169757386aafd40af4da7aa7c1b28ab958d880bf55efb3771d74729da2b1cb` |
| `minion_hub/CLAUDE.md` | `0e655b188c8f89dd2d0d1efeb21db7ff09a41318a258d67ab50056f25a9afbaf` |

Independent GSD verifier. Only this verification report was authored for18-01; no commit or global status mutation.
