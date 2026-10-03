---
spec: 2026-10-03-notification-slice5-audience-projection-spec
pass: 2
verdict: approved
reviewer: parent-spec-and-gateway-standards
created: 2026-10-03
---

Independent Spec PASS and parent Standards PASS on author spec SHA-256 `ecf538761909e1b9ad881a660c3f3a44a2451403bdf0a80072f80d72483af27e` and recon SHA-256 `574e40f55ffb065e5ced77f801cce15811d440c96147064e25e6644508971f0d`.

Review resolved coherent authority snapshots with fresh serialized final fencing, exact runtime/organization/event scope, source RLS alongside existing permissive browser policies, bounded role and evidence fanout, exclusive receipt-backed projected settlement, current-authority revalidation, and exact no-replay terminal reconciliation. The final revision uses one trigger-only empty-search-path definer and one deferred receipt INSERT guard: it derives exact scope internally, ignores stale INSERT `NEW.finalized_at`, reselects the current finalized receipt and attributed terminal outbox through narrow RLS, and executes once even for 10,000 candidates. Receipt-first insertion satisfies candidate foreign keys while the finalizer remains authoritative by recomputing the persisted set.

This approves local implementation under the user's notification request. Native restricted-role, concurrent fence, plan, mutation, compiled-runtime and full configured-check evidence remain required. It grants no production migration, external delivery, merge or release authority.

## v8 amendment — renewed two-pass approval

Parent Spec PASS and independent Gateway Standards PASS bind author SHA-256 `66a82e3faf77c567a2805591df9fcb6d563135df423c201497b66493ac2a8da6` and recon `919be555702be1304aa0e6a293310fecd4af3436aafecdbad67a07db418f50c6`. Frozen inputs, executable SQL/reproduction, cleanup receipts and independent review are preserved under `.planning/operations/readiness-2026-10-03/evidence/notification-slice5-v8/manifest.json`.

This amendment supersedes v6's source-policy strategy: retaining PUBLIC made the real baseline policy graph recursive. Exact command-capable consumers and the relation owner retain unchanged policy expressions; one complete worker SELECT policy per source relation removes that recursion. Admission inventories every ACL grantee and transitive member. Unknown grants and inherited authority must fail closed before policy mutation or worker admission.

The only finalizer-role membership exception is the frozen Supabase PostgreSQL17 platform creator ADMIN-only edge, with SET and USAGE false. PostgreSQL18 requires zero edges. Temporary ownership-transfer authority is revoked; no runtime caller receives membership or ADMIN authority. Actual PostgreSQL17/18 finalizer adoption, browser/service/app-ledger parity, unknown-grantee and membership mutants, current-authority fencing, bounded plans and cleanup remain required implementation evidence. Contract review is not implementation acceptance.

The user's instruction to implement every finding authorizes this local development. Human merge and production migration remain separate gates.

The v8 evidence-only correction replaces stale v7 author metadata and the old inventory digest inside the recon. A renewed independent Hub-client Spec PASS binds recon `919be555702be1304aa0e6a293310fecd4af3436aafecdbad67a07db418f50c6`, inventory `74e3da957caa7470859736edd61348d9d7dd7d8cd527f39eb333f1b1bcf4cc83` and exhaustive command-role SQL `489154021e0c0466d1726749209265407f805931ca566da5cef9e85d54f7bdb8`. Author contract bytes remain `66a82e3f…`; the correction changes no policy or runtime semantics. The retained earlier Standards receipt is historical; this paragraph binds the corrected recon for implementation.

## v10 ownership-transfer amendment

Parent and independent review PASS bind authored spec `167f99e8c32859a2f392d39ecd592981f082acebb8774493faa0b04df4e8c762`, recon `2de62fb4bd1d33ada33ac44d408185884c7d0b3099bdd0524ae713d576e8bae3`, evidence JSON `25dafe4fffc45d2270ffb51ecd650a0a66f71ecdb6fae16efff42f9a45b53d98`, parent receipt `4e9ab0e9835e779647bdc38e55141c6ca332e935f0ae028eb047089b4e2306b0` and independent receipt `ff715c612cebffb09e611c2a525d07c45e5a5de392f09529a7b6b4dd1a6e2fda`. Frozen source and14 evidence leaves are under `evidence/notification-slice5-v10/manifest.json`.

The v8 temporary direct-role-grant strategy is withdrawn: it crashed the pinned disposable Supabase PostgreSQL17 backend. The v10 transaction-local initial-membership bridge admits exactly the four-row PG17 or two-row PG18 temporary graph, transfers ownership, revokes schema CREATE, drops the bridge and verifies the exact persistent graph. Committed-success and injected-failure rollback probes pass on both versions, with cleanup.

These probes transfer one harmless function to qualify the mechanism. Production source must still transfer exactly the three fixed definers and pass native adoption, policy parity, transitive membership/ACL mutations, runtime projection, cleanup and compiled checks. Contract approval does not qualify the actual migration or authorize production writes.
