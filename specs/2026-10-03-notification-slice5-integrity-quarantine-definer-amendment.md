---
id: 2026-10-03-notification-slice5-integrity-quarantine-definer-amendment
title: Preserve private terminal rows while quarantining exact live notification claims
stage: spec
status: approved
pass: 2
verdict: approved
created: 2026-10-03
updated: 2026-10-03
repos: [minion_hub]
tags: [security, data, logic, test]
type: correction
parent: 2026-10-03-notification-slice5-audience-projection-spec
findings: [S5Q-001, S5Q-002, S5Q-003, S5Q-004]
---

# Notification Slice5 integrity-quarantine authority amendment

### Revision history

| Revision | Review state                                                                    | Contract change                                                                                                                                                                                                              |
| -------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| v1       | author draft `62a86e71365ff7ad942b04b8551d269d27c775e109e5a28de5ed8f3e6914ff87` | Fixed inaccessible definer, exact live-claim policy, shared single/batch path, v11 bridge transfer and finite catalog admission.                                                                                             |
| v2       | author response, pending renewed two-pass review                                | Names every changed transaction setting and exact owner column grant, restores prior settings on success and zero-result exits, and requires same-transaction scope equality plus a subsequent enqueue/projection operation. |
| v3       | author response, pending renewed two-pass review                                | Adds the shared worker initializer to the frozen source and DELTA, preserves exact table-level INSERT plus named column grants, and adds a captured/restored reason setting for exact post-transition equality.              |
| v4       | author response, pending renewed two-pass review                                | Adds the projector's distinct claim transaction to the caller delta and initializes/restores quarantine reason for both production transaction entry paths.                                                                  |

## 0. Decision and boundary

Slice5 keeps terminal outbox rows private from `notification_worker`. Integrity quarantine therefore
cannot remain a direct worker-role `UPDATE`: PostgreSQL row security rejects the transition when the
new terminal row is outside the worker's exact SELECT surface. The captured native failure is the
required source-bound proof; it is not a reason to restore a broad `FOR ALL` policy.

Replace the existing `public.notification_quarantine_claims(jsonb)` implementation with one fixed,
empty-search-path `SECURITY DEFINER` function owned by the existing inaccessible
`notification_event_trigger` role. Preserve its signature, finite input grammar, result shape and
only runtime caller. Both the one-event and batch TypeScript paths use this one mutation surface.

This amendment does not give the claim role terminal reads, does not add a role, does not add a
generic privileged executor, and does not authorize projection success. It changes no provider,
delivery, inbox, preference or browser behavior.

### Frozen inputs

- Parent v11 spec SHA-256:
  `425eb193f6cf86f3f27b721a474362653f8133602f108e8ee374bc07b1268fe6`.
- Recon: `notification-slice5-v12-integrity-quarantine-recon.json`.
- Native negative receipt: `notification-slice5-focused-native-v6.log`, SHA-256
  `bb038f28b367b4e61f93950c598ae7e514dcfb7d50ec583849aa1673f719ebe7`.
- Migration worktree SHA-256 before this amendment:
  `f5134e10f586adbc42842991e961c548de7bd2d5c46364416728799f03ebbea5`.
- Existing Slice3 migration SHA-256:
  `afde75a6976b2b403dd0bb6951f26391e34068449f92130f00db19c7f8eadead`.
- Shared worker-transaction SHA-256:
  `1bffe8e03911c4e34f55cf7d1552103a616ba3f7107e302d753295c108ccd5b9`.

No implementation is authorized until parent Spec and independent Standards reviews both pass this
exact frozen amendment and recon pair.

## 1. AS-IS

1. Slice3 defines `notification_quarantine_claims(jsonb)` as `SECURITY INVOKER`, validates the
   complete array before mutation, caps it at 250 claims and 64 KiB, accepts three finite reasons,
   sorts by event UUID, checks organization/event/owner/generation/live lease, and returns the number
   of changed rows. Only `notification_worker` has explicit EXECUTE.
2. Slice5 replaces `notification_outbox_worker FOR ALL` with separate worker SELECT and UPDATE
   policies. SELECT exposes only exact-org `pending` or `processing` rows. UPDATE can transition a
   selected live row to `processing` or `quarantined`. The terminal row is intentionally not
   worker-readable.
3. The single-event helper still issues a direct UPDATE. The projection and Slice3 batch paths call
   the bounded SQL function. This creates two mutation paths with different behavior under Slice5.
4. `withNotificationWorkerTransaction` currently initializes generation but does not initialize
   scope mode, event ID or quarantine reason. An absent-setting rejection would therefore reject
   ordinary one-event and claim-page calls unless the shared initializer joins this delta.
5. `claimOneProjectionEvent` uses a separate dedicated transaction. Its setup initializes scope
   mode, event ID and generation, but not quarantine reason, before sending a malformed claimed
   event to the same quarantine function. It must join the caller delta independently of the shared
   worker wrapper.
6. A disposable native run exercised the direct integrity-quarantine path after the private
   terminal policy. PostgreSQL rejected it with `new row violates row-level security policy for
table notification_outbox`; the transaction committed no terminal row. Eight neighboring tests
   passed. Reopening terminal SELECT would make the test pass by weakening the privacy invariant.
7. `notification_event_trigger` is already an inaccessible, `NOLOGIN`, `NOINHERIT`, non-superuser,
   non-bypass role. It owns only the fixed enqueue trigger function. The reviewed v11 migration
   bridge gives the migration transaction temporary SET authority, preserves the supported
   PostgreSQL 17 platform ADMIN-only edge or PostgreSQL 18 empty edge, and disappears before commit.
8. Runtime catalog admission currently fingerprints the operational table/column ACLs, policies,
   owner graph and four fixed definer functions. It does not yet include the quarantine function or
   the extra exact owner policies required by this amendment.

## 2. TO-BE invariants

### 2.1 One fixed function and no generic authority

The only privileged quarantine entry point is:

```sql
public.notification_quarantine_claims(claims jsonb) returns integer
```

It is PL/pgSQL, `SECURITY DEFINER`, `SET search_path=''`, owned by
`notification_event_trigger`, and has no dynamic SQL. It accepts no relation, column, role,
function, policy, search-path, SQL fragment or catalog name. Every referenced application object is
schema-qualified in its frozen body.

`PUBLIC` and every role other than `notification_worker` and the inaccessible owner have no
EXECUTE. The owner has no LOGIN, SUPERUSER, BYPASSRLS, INHERIT, CREATEDB, CREATEROLE or REPLICATION;
no browser, application, worker, assistant, service or migration runtime role has SET or USAGE
reachability to it. It owns exactly `notification_event_enqueue()` and
`notification_quarantine_claims(jsonb)`, no relation and no schema. It retains no `public` schema
CREATE after migration.

### 2.2 Exact input and all-or-none claim locking

Before the first row effect, the function validates the entire JSON value:

- top level is an array with 1 through 250 elements and canonical text size at most 65,536 bytes;
- every element is an object with exactly `eventId`, `generation`, and `reason`;
- `eventId` is a lowercase canonical UUID string;
- `generation` is a decimal string in `[1, 9223372036854775807]`;
- `reason` is exactly `payload_invalid`, `digest_mismatch`, or `envelope_invalid`;
- event IDs are unique.

The function overwrites `app.notification_scope_mode` with `integrity_quarantine`; the caller
cannot select another privileged mode. The exact transaction settings changed by the function are
`app.notification_scope_mode`, `app.notification_event_id`,
`app.notification_generation`, and `app.notification_quarantine_reason`; it changes no other
setting. `withNotificationWorkerTransaction` initializes all four to finite text values before its
callback, using the empty string when no narrower scope exists. The function rejects a noncanonical
direct invocation if any prior value is absent, then captures all four prior strings before changing
one.

For each element in UUID `C` order it overwrites the exact event, generation and reason settings,
then locks the one matching outbox row. A match requires the exact validated current organization
UUID, event UUID, caller scope owner UUID, generation, `processing` state and
`lease_expires_at > clock_timestamp()`. A malformed organization/owner setting produces no match
and never raises an unsafe cast.

If any of the sorted live rows cannot be locked, the function returns `0` before any row effect.
After every live row is locked, it updates the same rows in the same order. Every update repeats the
full predicate against the database clock. An unexpected zero or multi-row command tag raises and
rolls back the entire function statement. Success returns exactly the input length. A mixed
valid/stale or cross-organization batch cannot partially commit.

Immediately before either a successful return or the zero-count early return, the function restores
the captured scope mode, event ID, generation and reason through transaction-local settings and
verifies their exact text equality. It does not catch an exception: every error propagates, and
PostgreSQL statement/subtransaction rollback restores all four settings together with every row
effect. No exception is converted into success or a zero count.

### 2.3 Exact transition and terminal privacy

The fixed owner retains exactly its preexisting table-level INSERT on `notification_outbox` for the
enqueue trigger. It has no other table-level privilege. The amendment adds only these exact outbox
column grants:

- SELECT on `organization_id`, `event_id`, `state`, `lease_owner`, `generation`, `claimed_at`,
  `hard_deadline`, `lease_expires_at`, `renewal_count`, `completed_at`, `quarantine_reason`,
  `terminal_owner_id`, and `terminal_generation`;
- UPDATE on `state`, `completed_at`, `quarantine_reason`, `lease_owner`, `claimed_at`,
  `hard_deadline`, `lease_expires_at`, and `renewal_count`.

The combined ACL is therefore exactly table-level INSERT plus the named column-level SELECT and
UPDATE sets. It receives no DELETE, TRUNCATE, REFERENCES or TRIGGER privilege. Two role-specific
policies apply only when
`current_user='notification_event_trigger'` and scope mode is `integrity_quarantine`:

1. a SELECT/UPDATE source branch sees only the exact live processing row for current organization,
   event, owner, generation and unexpired lease;
2. a post-transition SELECT/check branch sees only the exact just-quarantined row whose
   `terminal_owner_id`, `terminal_generation`, organization, event and `quarantine_reason` exactly
   match the four current scope settings and finite allowed reason.

The transition guard gets one separate fixed `notification_event_trigger` update branch for this
mode. It permits only `processing -> quarantined`, the three integrity reasons, a database-clock
`completed_at`, cleared lease fields, unchanged immutable routing/claim counters, and terminal
owner/generation copied from the old live lease. The existing enqueue INSERT branch stays exact and
unchanged. All other updates by this owner fail.

`notification_worker` retains its pending/processing SELECT policy. It cannot SELECT a terminal
row before or after calling the function, cannot project a row, and cannot execute a direct terminal
UPDATE successfully. No receipt, candidate, event payload, runtime-control or organization-control
read is added to `notification_event_trigger`.

### 2.4 Callers and return semantics

`withNotificationWorkerTransaction` initializes scope mode, event ID, generation and quarantine
reason to empty strings in the same transaction-local setup statement that installs role,
organization, owner and finite timeouts. Commit, rollback, timeout and pooled-connection reuse must
all leave no setting from the previous callback.

`claimOneProjectionEvent` retains its distinct dedicated transaction and initializes
`app.notification_quarantine_reason` to the empty string in the same setup statement that installs
`projection_claim`, clears event/generation, installs finite timeouts and binds runtime/org scope.
Its success, rollback, timeout and pooled-connection reuse behavior has the same four-setting
cleanup invariant as the shared wrapper.

`quarantineNotificationEventsInTransaction` continues to call the fixed function once per bounded
batch and require `settled === rejected.length` before its transaction can commit.

`settleNotificationEventInTransaction` sends each integrity reason through the same function as a
one-element array and returns `settled === 1`. A stale or wrong-scope claim returns `false` from the
single-event helper. Its legacy `projected` branch remains a direct worker-role transition for
pre-Slice5 databases and remains DB-denied after Slice5; it is not routed through the definer.

No caller infers success from a missing error. Exact function count is authoritative. The worker
does not issue a post-state terminal SELECT.

### 2.5 Owner transfer and finite catalog

The migration first admits the exact Slice3 function signature, language, invoker status, empty
search path, owner, body and ACL. It replaces the body and metadata in the same transaction. The
existing v11 initial-membership bridge supplies the already reviewed temporary SET chain; while the
exact schema CREATE window is open, the migration transfers the quarantine function to
`notification_event_trigger`, installs the exact owner-granted worker EXECUTE ACL, and then revokes
schema CREATE and drops the bridge.

No direct actor-to-existing-owner GRANT/REVOKE is introduced. The v11 PostgreSQL 17 six-row and
PostgreSQL 18 three-row temporary graphs remain exact because the transfer creates no role edge.
The persistent graph remains the v11 graph byte-for-byte.

Postflight requires:

- `notification_event_trigger` owns exactly the enqueue and quarantine functions and no other
  function/relation/schema;
- the enqueue owner, body, ACL, SECURITY DEFINER flag and empty search path remain exact;
- the quarantine signature, result, language, owner, SECURITY DEFINER flag, empty search path,
  exact body and ACL are exact;
- only the three reviewed projection finalizer functions are owned by
  `notification_projection_finalizer`;
- no bridge role, schema CREATE, runtime SET/USAGE path, extra membership edge, extra policy, extra
  ACL grantee or inherited authority remains.

Runtime admission adds `notification_event_trigger` to the exact owner-role attribute inventory;
adds the quarantine function to the exact function inventory; and fingerprints the exact
table-level INSERT plus owner column ACLs and policies. Any owner, ACL, search-path, security mode,
body, policy expression,
function count, role attribute, membership or reachability drift makes admission return false
before runtime lease acquisition.

## 3. DELTA

1. Extend the migration preflight with exact Slice3 quarantine-function metadata/body/ACL
   admission.
2. Replace the invoker body with the reviewed fixed definer body and exact lock-first/all-or-none
   algorithm.
3. Add the owner-specific minimum column grants, SELECT/UPDATE policies and transition-guard branch;
   leave the worker terminal SELECT denial intact.
4. Transfer this existing function through the already admitted v11 bridge, then strengthen exact
   owner counts and persistent postconditions.
5. Add `worker-transaction.ts` to the owned source delta and initialize the four exact managed
   settings before every callback. Prove commit, rollback, timeout and pooled-connection reuse clear
   callback scope.
6. Add `projection/projector.ts` to the caller setup delta and initialize quarantine reason in its
   distinct claim transaction before any malformed-event quarantine call.
7. Route the single integrity-quarantine TypeScript path through the same function; preserve the
   batch call and exact count checks.
8. Expand the finite runtime catalog statement, expected PostgreSQL 17/18 snapshots and mutation
   tests for the owner role, function and policies.
9. Run the actual full migration runner and native behavior matrix on both supported database
   majors. Focused mechanism experiments alone do not qualify the migration.

## 4. Required proof matrix

### 4.1 Functional and concurrency proof

1. One valid claim returns `1`, writes `quarantined`, copies exact terminal owner/generation, clears
   lease fields and leaves terminal SELECT invisible to `notification_worker`.
2. A valid 250-row batch performs one function call, returns `250`, and leaves 250 exact terminal
   rows. A repeated call returns `0` and changes nothing.
3. Wrong organization, event, owner, generation, expired lease and already-terminal claims each
   return `0` with no row change or information-bearing row result.
4. A batch containing one valid and one stale/foreign claim returns `0` and changes neither row.
5. Malformed object keys/types, invalid UUID, zero/overflow generation, unsupported reason,
   duplicate event, empty/251-item/65,537-byte input each fails before effects.
6. Two transactions race quarantine versus lease renewal/reclaim/expiry in both winner orders. Only
   the exact live epoch can settle; no partial batch, stale attribution or post-terminal rewrite is
   possible.
7. The direct worker UPDATE remains denied. The one-event and projector/batch production APIs use
   the fixed function and preserve boolean/count behavior.
8. In one worker transaction, capture all four managed scope settings, run a successful quarantine
   and a zero-count stale quarantine, and prove byte-equal values after each call. Then perform a
   real enqueue/claim or projection call in that same transaction and prove it observes only its own
   explicitly installed scope. An exception case reaches its named failure, is caught only at a
   caller savepoint, and likewise leaves no changed setting or row effect. Repeat through committed,
   rolled-back and timed-out callbacks and then reuse the same physical pool connection; every
   callback starts from the four canonical initialized values.
9. Exercise every production quarantine caller: one-event settlement and claim-page quarantine
   through `withNotificationWorkerTransaction`, plus malformed projection quarantine through the
   distinct `claimOneProjectionEvent` transaction. For each, prove success, rollback, timeout and
   physical pool reuse begin and end with the exact four canonical settings and never inherit the
   prior claim's reason.

### 4.2 Authority and privacy proof

1. `notification_worker` can EXECUTE; `app_notification_worker`, `app_ledger`, coordinator, health
   reader, assistant, browser, authenticated, service and PUBLIC roles cannot.
2. Every ordinary/runtime role has no SET/USAGE/MEMBER path to `notification_event_trigger`.
3. Wrong-role direct calls fail. Wrong org/owner/generation calls return no data and commit no
   effect. The worker cannot SELECT the resulting terminal outbox row, any projection receipt, or
   any audience candidate.
4. The owner can see only the exact live/just-terminal scoped row inside the fixed function. A
   foreign organization, event, owner, epoch or reason is invisible. It has no source payload,
   receipt, candidate, control-table, arbitrary table or schema-creation authority.
5. Mutants that add terminal worker SELECT, broaden the owner policy, remove a scope equality,
   remove the live deadline, substitute one allowed reason for another, accept dynamic identifiers,
   change SECURITY DEFINER/search path/owner, broaden EXECUTE or the exact table/column ACL union,
   add an owner edge, or add another owner function fail native behavior or runtime catalog
   admission. Original bytes are restored and hashed after every source mutation.

### 4.3 PostgreSQL 17/18 migration proof

On pinned PostgreSQL 17 Supabase and pinned PostgreSQL 18 fixtures, run the actual migration chain
through `20261003170000`, not a copied mechanism:

- exact v11 temporary and persistent graphs;
- exact two-function event-owner inventory and three-function finalizer inventory;
- enqueue function metadata/body and real event-to-outbox insert;
- quarantine owner/ACL/SECURITY DEFINER/empty-search-path/body and semantic quarantine call;
- schema CREATE absent, bridge absent, no runtime SET/USAGE reachability;
- exact operational table/column ACL and policy inventory;
- injected rollback after quarantine replacement, ownership transfer, ACL installation, policy
  installation and bridge removal, with the named injection marker proven reached;
- committed success followed by a fresh-connection catalog and behavior check;
- child database, temporary roles and containers removed with zero residue.

PostgreSQL 18 denial checks use an ordinary restricted role; superuser bypass is not denial proof.
The PostgreSQL 17 platform ADMIN-only creator edge remains exact and does not count as runtime
SET/USAGE authority.

## 5. Acceptance and release boundary

Acceptance requires both review passes on the frozen amendment/recon, implementation review, green
focused and combined native lanes, actual PostgreSQL 17/18 runner receipts, runtime catalog mutant
receipts, cleanup receipts, and a configured Hub check with zero diagnostics.

This amendment authorizes no production migration, merge, release, external notification or data
write. Those remain separate human-gated actions after local source acceptance.
