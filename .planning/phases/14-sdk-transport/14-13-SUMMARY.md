---
phase: 14-sdk-transport
plan: "13"
status: source_scoped_pass
requirements_completed: []
---

# Canonical durable version negotiation

Added the optional receiver acceptance field and one pure bilateral version helper. Only explicit v1 from both sides selects durability. Undefined remains observable legacy absence; malformed/unsupported advertised values throw the existing fixed error without coercion or value disclosure. The helper is browser-safe and grants neither tenant authority nor storage readiness.

Independent verification passes all 46 focused cases and the strict native package type check. Root's earlier 43-case implementation check and scoped lint passed. The final three cases add explicit negative zero, function and boxed-number inputs; they were independently verified, not retroactively counted in the red baseline. Existing 21 contract cases remain passing. The native runner imports actual source and asserts its private cache path before running tests.

Red evidence: 22 new failures and 21 existing passing controls before implementation. These were missing-helper contract failures, not a reproduced live negotiation incident. The first runner used an unavailable ctx.vite accessor after tests, so it also had a setup error; a corrected createVitest runner repeated the same red result with private-cache verification before execution. The independent type-check attempt with --incremental false conflicted with composite configuration; ordinary native --noEmit passed. Both setup failures are retained in the verification receipt.

The source/test snapshot is /tmp/minion-14-13-cuet0lis/shared. Active source equals the tested snapshot; other source inputs and active cache hash/mtime were independently unchanged. Public root/gateway barrels already export the canonical helper. No active dist, package manifest/lock, installed dependency, database, receiver, sender, image or deployment changed.

Next: qualify a new complete private shared archive, then gateway parity/text-input validation, injected receiver and actual routing/lifecycle children. The older14-11 reconnect archive predates this source and is retained unchanged. Exact-site TODO and the root proposal record unimplemented sender/receiver negotiation. SDK-01 and AGT-04 remain open.

| Input | SHA-256 |
| --- | --- |
| `packages/shared/src/gateway/shells.ts` | `e480c90660f7c5936a32be9c933c857223077a893d3d66d0ad4bcc086ebaa8f7` |
| `packages/shared/src/gateway/shells-outcome.test.ts` | `3e8360cfa43e1b11fd12e8efb5f19176e26528b4afb1a1a6cd36c2d813280b49` |
| `.planning/phases/14-sdk-transport/14-13-PLAN.md` | `4f1bd5725b93f4ade45758ea4f3c81aff9024dbe089c385b89466aee45cf46ff` |
| `.planning/phases/14-sdk-transport/14-13-VERIFICATION.md` | `0721aa8d3b742fbca6dcbf815490f00b2637dff054434621ec1e50a5a926cc2a` |
