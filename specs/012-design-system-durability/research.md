# Research decisions

Inputs: the original eight-system audit and three fresh-source revalidation reports in evidence/. Primary design-system research remains in the original Lavish evidence/public-systems.json; this implementation uses its verified practices without re-claiming full external-system certification.

1. Reuse current shells. Existing collection and calendar already have PageShell/PageHeader/DataView; two runtime pilots decide whether any missing shared responsibility warrants extraction. No new shell now.
2. Catalog evolution appends new IDs to preserve existing user order, matching current tests. Explicit aliases migrate renamed keys; retired keys disappear; duplicate/unknown keys never enter normalized output.
3. Use existing action runtime for outcome classification. Conflict, unknown and committed-refresh-failed require different recovery; do not flatten them into generic retry.
4. Preserve current vendored-archive release strategy. Both consumers now use identical readiness bytes. Build complete canonical UI after all edits, with new archive identity and exact member inventory.
5. Site token gates are already satisfied on the fresh base. Extend only missing per-file debt ratchet. Missing git baselines must fail enforcing checks.
6. Intrinsic coarse-pointer target policy belongs in shared controls; avoid inflating arbitrary table rows and prose links.
7. Preference identity comes from canonical loaded user/org context. Never infer ownership of unscoped local storage.

Ponytail review rule: the smallest complete fix retains validation, accessibility and error recovery. No speculative abstraction or new dependencies; focused tests exercise behavior rather than mirroring implementation.
