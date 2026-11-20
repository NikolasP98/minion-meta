# Independent integration review: Hub PR 656

Reviewed UTC: 2026-11-13T18:35:48.334863+00:00.
Checkout: `/home/nikolas/.cache/codex-work/hub-org-role-templates-20261112`.
Branch: `feat/113-org-role-foundations`; base: `master`.
Candidate commit: `da51646cbe5bc4d03b52feec566a8be4a332217f`.
Candidate tree: `6abb578eae04c69e9a220b97ab37bf02715de6b1`. Worktree clean at fingerprint verification.
Parents: reviewed feature `99341e7074541360eadcf2dcd32e67494f3c65ad` and incoming master `6a390a3c7978b1008feec7cebdabf88f66404128`.
Common ancestor: `523ca2e934e93d0fc0d6f7d052c94694b86553b6`.
Canonical approved spec: `/home/nikolas/.cache/codex-work/meta-org-role-templates-20261112/specs/113-org-role-templates/spec.md`.
Spec SHA-256: `292cda97641a7c963d634de66314da45e3456101758b477f4d12346d9061962f` (unchanged).
Prior source review: `/tmp/role113-final-independent-pass.md`; this receipt supplements, rather than replaces, its authorization-model review and bounded identity/platform contracts.

## Verdicts

- **Standards: PASS for the source integration delta.** The merge preserves both parents' non-overlapping changes and resolves only the two message catalogs by exact semantic union. No role authorization, lifecycle, schema, notification-worker or rollout source changed relative to the independently reviewed feature candidate.
- **Spec: PASS for the source integration delta.** Every feature-specific file and every feature translation value is preserved. The prior reviewed behavior and security amendments have not been relaxed by integration.
- Confirmed integration blockers: **0**. Accepted source open ends in this integration scope: **0**.

This is source integration approval only. It is not a green CI claim or proof of deployment/runtime behavior. The parent reports owner release authorization, including the requested administrator merge override; this reviewer did not perform a merge, production mutation or override.

## Deterministic integration proof

A read-only Python/subprocess check evaluated Git blobs and decoded JSON objects for both parents, their common ancestor and this candidate. It asserted:

- All **111 non-catalog feature paths** have exactly the same Git tree entry (mode/type/blob) as `99341e7`, covering product code, tests, migrations, fixtures, CI additions and runbook.
- All **266 incoming-only paths** exactly match incoming master. The only path overlap between the feature and incoming master is `messages/en.json` and `messages/es.json`.
- Both catalogs preserve **28 feature changes per language**, with English's **18** and Spanish's **17** incoming changes retained. There are zero same-key conflicting values, duplicate JSON keys, lost changes or unexpected changes. Each decoded result equals the independently constructed three-way semantic union; this includes unchanged values outside both change sets.
- Head, tree and clean working directory match the fingerprint above.

Evidence: `/tmp/role113-da516-integration-proof.json` (SHA-256 `430b0730724b246d3cd5b4c52a480e21dc9ddb530aefe90b445729f56b8486ec`).
Feature blob manifest: `/tmp/role113-da516-feature-blobs.txt` (SHA-256 `8751111bddfc56b6bb31216c4e5f7c8cdcb4845abe67468e9f6ee567f1d7f8ac`).
English catalog blob: `32895f6f476b3cccd1080362c274d7f9c2586fdf`.
Spanish catalog blob: `ae8666223d226666bca8f539faf3e9ed1446094d`.

## Indirect consumers and qualification limits

Inspected the incoming shared floating-panel implementation (`Popover`, `Dropdown`, `Combobox`, `portal-in-layer.ts`, `app.css`), user-page config loading, dependency/script changes and Vitest configuration. These are byte-identical to incoming master, rather than merge-created edits. Native top-layer behavior can affect contextual controls indirectly; preserved Roles and Join form code does not independently prove browser positioning/focus. Their direct shared `Select` and `Modal` sources are unchanged. No concrete role integration defect was found from these changes; exact-candidate browser qualification remains separate evidence.

The incoming Vitest refactor retains the ordinary flat unit `test` block when `STORYBOOK_TESTS` is unset, preserving the native PostgreSQL lanes' existing `base.test` override contract. It retains the feature's `NATIVE_POSTGRES_EXCLUDES` import and excludes. Storybook/browser mode is opt-in. Dependency/lockfile changes and regenerated Paraglide output still require the fresh candidate build/test checks; prior feature CI does not qualify the merged tree.

No heavy tests, generation or browser actions were duplicated during this source review because the parent is running fresh CI. The source verdict is independent of that pending outcome. CI failures, if any, must be assessed against this exact fingerprint before claiming qualification. The prior rollout order, worker-drain requirements, disabled activation flag and separate platform/private-object boundaries remain unchanged and applicable.
