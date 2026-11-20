# Elephant dispositions after stages 5–7

Every original severity remains in the stage reports. These are proposed/applied prototype and design corrections, not reviewer approval or production acceptance.

| Raw IDs | Severity | Disposition | Concrete response | Verification |
| --- | --- | --- | --- | --- |
| ZI-1, DC-2 (lifecycle) | Major | PROPOSE FIX / applied to scratch | Wire extraction generation clearing into successful gateway RPC reset/delete cleanup after embedded run ends, before store replacement. Failed cleanup retains budget. Scope other auto-rotations as adoption item. | Actual source-bound cleanup helper + real runner: baseline2 fail/3 controls pass; corrected5/5 pass. Not full gateway startup. |
| DC-2 (retention) | Major | PROPOSE FIX / testing | Cap256 states, expire idle30min lazily; preserve active work, decline new session at capacity; getters cannot bypass cap. | Follow-up retention tests required before final claim. |
| ZI-2, DC-3 | Major | PROPOSE FIX / testing | Filter text and explicit speech text before TTS summary/synthesis; filter generated summaries; keep dispatcher final guard. | Real source TTS function with synthetic provider exports; final counts pending. |
| ZI-3, DC-4 | Major | PROPOSE FIX / testing | Terminal ordinary-tool-only fallback, distinct from control-only silence, intermediate chunks and media-only replies. | Real dispatcher seam; final counts pending. |
| DC-5 | Major | PROPOSE FIX / testing | Fail whole DSML-contaminated output including mixed false receipts; do not retain unverified success prose. | New mixed receipt fixture required; final counts pending. |
| CP-1, DC-1, ST-1 | Major | PROPOSE FIX / applied to document | Explicitly select bounded list+exact count; no continuation/enumeration; narrow filters/disclose truncation. Remove impossible later-page test. | Existing501-row PGlite test, explicit response contract. |
| FS-1, FS-2 | Nit | PROPOSE FIX / applied to document | Use threshold-is-met language and ordinary identifier descriptions. | Text inspection. |

No findings contested or silently downgraded. Updated document saved as approaches-after-critics.md. The uninterrupted review is a single five-stage pass, not a claim of convergence from two clean rounds.

## Final dispositions superseding earlier testing statuses

- ZI-1/DC-2 lifecycle: corrected and five source-bound lifecycle tests pass. Automatic non-RPC rotation remains explicit adoption work.
- DC-2 retention: six retention tests pass; cap256 and idle30min retention selected. Process-local generation budget scope is explicit.
- ZI-2/DC-3, ZI-3/DC-4, DC-5: corrected TTS and terminal paths with fail-closed mixed DSML; initial boundary20cases passed. Stage9 then found composition omission, retained below rather than treating initial green as sufficient.
- CP-1/DC-1/ST-1: bounded list/count contract selected; no continuation or enumeration claim. Native501-row fixture passes.
- FS-1/FS-2, IS-1/IS-2, IZ-1: wording/file list/final candidate notes aligned. Earlier results remain labeled superseded.
- IR-1 Major/CD-1 Blocker: disabled TTS→dispatcher omission corrected, new chained cases pass; fresh codebase re-audit closes original Blocker at its original severity.
- CD-2 Blocker: explicit finance-property presence preserved, blank inputs reject before forwarding; chained cases pass; fresh codebase re-audit closes original Blocker.
- CD-3 Major: five native preview rejection cases added with table/SQL/effect assertions; fresh codebase re-audit closes at native local evidence level.
- RR-1 Major: eight further finance acceptance cases plus exact default bounds/mode added;17-case finance-chain suite passes. Root-verified after the only re-audit; not independently re-reviewed.

No finding was contested, deleted or downgraded. Candidate scope has no known unaddressed mechanism failure from these reviews. Production adoption remains blocked by explicit integration/qualification items; zero claims of full review convergence or release readiness.
