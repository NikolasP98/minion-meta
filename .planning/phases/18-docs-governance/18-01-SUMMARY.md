---
phase: 18-docs-governance
plan: 01
status: source_verified
requirements-completed: []
requirements-source-verified: [DOC-01]
verified: 2026-09-09
---

# Active instruction and source inventory refresh

Updated the four owned active documents against the current registry, package scripts, source clients and identity routing. Hub PostgreSQL/Supabase and surviving LibSQL/legacy auth paths are distinguished; Site's provider switch is explicit. Removed fixed repository/table/version assumptions, absent database scripts, the retired shared-package path and the unsafe executable first-tenant fallback example. Existing force-bearing UI/RBAC/handoff rules and unrelated WIP were preserved. The historical green baseline is explicitly historical while delivery checks remain required.

Added `scripts/qc/repo-truth.mjs` and its tests. The script records timestamped local source identities and confidence, separates registered projects from discovered independent checkouts, strips HTTP remote credentials and never executes package scripts. Named source evidence produces seven verified source facts. Current manifest records twelve local entries including the meta root and six registry entries. These counts are source inventory, not deployed topology or table count.

## Verification

- Initial docs check found eleven stale claims or absent scripts.
- Independent review then found a dangerous older fallback code example missed by the first detector. Removed it and added a direct executable-pattern regression.
- Independent review found an in-root symlink could evade the lexical environment-file guard. The resolved path now rejects environment-file segments too; a synthetic alias test verifies the correction.
- Five meaningful checker tests passed. `node scripts/qc/repo-truth.mjs --check-docs` passed. Independent review compared a fresh manifest and checked the actual source claims.
- `node packages/cli/dist/index.js --help` and `list --json` passed without setup/migration actions. Ordinary `minion --help` resolved the gateway CLI instead; its startup also reported an existing missing content-pipeline manifest. No global installation or gateway config was changed.
- Scoped whitespace checks passed. Authoritative gate report: `18-01-VERIFICATION.md`.

## Remaining boundaries

The source checker detects selected claims and declared script names; it does not certify every sentence, external link, historical document or runtime. Physical schema ownership, other active repo docs and proposal/spec disposition remain under phases15/18. The CLI binary-name collision is now documented with an explicit built-entrypoint fallback; a broader naming migration needs consumer inventory. A required exact-site TODO was added at `packages/cli/src/index.ts` for its hardcoded display version and binary identity follow-up; this comment-only handoff is the sole addition outside the seven behavior/doc inventory files. The existing QC proposal records that issue and the source-versus-display distinction.

No environment values, customer rows or credentials were read into the manifest. No packages installed, DB commands applied, commits created or production state changed. DOC-01 remains globally unchecked until remaining supported-instruction and release gates are reconciled.


## September 11 adapter identifier correction

The active Paperclip registry and adapter export both use `openclaw_gateway`; four root AGENTS.md references still used `minion_gateway`. Root corrected only those four identifiers, preserving all other bytes and existing WIP. Native `repo-truth.mjs --check-docs` passes; the source registry was separately inspected because this identifier is outside that checker's selected claims. Before-image and exact hash receipt: `/home/nikolas/.cache/minion-qc/18-01-adapter-refresh/receipt.json`. No adapter code, installation or runtime configuration changed.
