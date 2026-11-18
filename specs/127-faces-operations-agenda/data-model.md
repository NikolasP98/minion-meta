# Data model: FACES personal-account agenda in the operations Space

## Terms

The stakeholder words in [spec.md](spec.md) map to existing Hub objects. The companion documents use only the right-hand terms.

| Term | Meaning |
| --- | --- |
| Space (operations Space) | One custom section, `NavConfig.sections[i]`, in the organization's `app_nav_config` document. The FACES operations Space is the section with slug `pdv`. It is not a workspace or company. |
| Agenda link | A new `NavPage` with `kind: 'link'`, `target: '/pos/appointments'` and `canonicalAccess: true`, appended to the `pdv` section. |
| Alias | Any `NavPage` with `kind: 'link'`. Its browser URL is the instance path `/<section>/<slug>~<id>`; `resolveNavInstance` maps that path back to the target. |
| Marked alias | An alias with `canonicalAccess: true`. Its access can never exceed the access of its canonical target ([canonical-access.md](contracts/canonical-access.md)). Aliases without the marker are unmarked and keep their current behavior. |
| Canonical target | The built-in route an alias points to, here `/pos/appointments`. |
| Navigation policy lock | The transaction advisory lock `pg_advisory_xact_lock(hashtextextended(orgId, 112))`, taken by `lockNavigationPolicy` in `src/server/services/nav-policy-lock.ts` and by the other writers listed in [canonical-access.md](contracts/canonical-access.md#lock-participants-and-unlocked-writers). |
| Stock write lock | The F7 advisory lock `hashtextextended('minion:stock-write:v1:' \|\| orgId, 0)`, which the F7 stock bridge ([authority-bridge.md](../128-faces-receivables-audit/contracts/authority-bridge.md)) takes before the navigation policy lock. F6 never takes it. |
| Trusted outer role | The PostgreSQL role of the existing server `ctx.db` transaction before `withOrgCoreTransaction` switches to the `app_ledger` role. Policy and actor reads run under it. |
| Native test | A test against a real PostgreSQL database, not mocked calls. |
| `qa-native` lane | The native test lane `NATIVE_POSTGRES_MANIFEST['qa-native']` in `scripts/qc/native-postgres-manifest.ts`, run by `vitest.qa-native-postgres.config.ts` ([quickstart.md](quickstart.md#native-postgresql-lane)). |
| Controller | The disposable PostgreSQL connection that creates and drops the test's own child database. It is used for fixture setup only, never for request phases. |
| Qualified | Passed every gate the [quickstart](quickstart.md) assigns to that step. |

## Existing navigation document

`NavConfig`: `version: 1`; `sections[]` of `{id, slug, label, hidden?, pages[]}`; `builtinSections`; `builtin`. `NavPage`: `id` matching `^[a-z0-9]{6}$`, `kind` (`link` or `main`), `slug`, `label`, `target`, optional `icon` and `hidden`.

Semantic limits: at most 20 sections, at most 30 pages, labels of at most 40 characters, section slug `^[a-z][a-z0-9-]{0,31}$`. The structural API schema is looser, so both checks apply.

Contextual page and section policies (`permission_rules` rows with `module` `page:<id>` or `section:<id>`) and each person's personal navigation preferences are stored separately from the document.

## Marker

`NavPage` gains optional `canonicalAccess: true`. The only valid values are literal `true` or omission; `false` is rejected. A new agenda link must carry it. When a stored page is marked, every later save carries the marker forward for that page ID, even when an older client omits it. Runtime access to a marked alias is the existing alias decision intersected with the canonical target decision. The document stays `version: 1` in the existing JSON column; there is no database migration.

## Derived revisions

Neither revision is stored.

- **Config revision**: SHA-256 of JSON containing the authenticated `orgId` and the normalized version 1 document. Object keys are sorted recursively by UTF-16 code-unit order; array order is kept. The strong ETag is `"nav-v1-<64 lowercase hex>"`. Identical documents in two organizations produce different revisions.
- **Policy revision**: SHA-256 of key-sorted JSON `{version: 1, orgId, sectionId, target, rolePolicyRevision}`, where `rolePolicyRevision` is the existing function in `organization-role-policy.ts` over the organization role model, role catalog and permission rules. It covers no membership roster. Full definition: [canonical-access.md](contracts/canonical-access.md#policy-fingerprint-and-fresh-read).

The scoped save compares both revisions under the navigation policy lock before any write. A mismatch returns HTTP 412 and changes nothing. Policy snapshots prove that policy is unchanged; they never authorize a policy difference.

## Scoped save mode

The preserve-single-link mode is request intent, not a stored field. It accepts only one marked-link append to an existing section, or the removal of that link as its inverse. It rejects any stored rule for the changed page key and skips policy pruning, so no unrelated policy or audit row changes, including orphan rules.

## Server-only authority data

`PolicyAuthorityRows` is server-only authority data (organization role policy, roles, rules) with no navigation field. The normalized `NavConfig` read under `app_ledger` row-level security is combined with it only for the existing recoverability check ([policy-read-seam.md](contracts/policy-read-seam.md)). Neither object is a new HTTP payload; fresh GET returns the existing config body plus the revision headers.

## Private execution manifest

The manifest at `.local/faces-followups-2026-11-16/speckit-F6/execution-manifest.json` is local and never committed. It records:

- resolved organization and section IDs, and each account ID verified for runtime proof;
- the target `/pos/appointments`;
- fresh before, candidate and rollback config revisions, and the policy revision;
- the backup pointer, approved one-link diff and inverse;
- before and after effective authority comparison and the rollback receipt.

The manifest has two stages. The intake draft (T007) is read-only and gives no write authority. The apply manifest (T017) is regenerated from a new fresh read after the qualified code release (T016) and needs owner approval of that exact diff.

Account availability is evidence, not a membership record. The owner confirmed that Coli is not provisioned; the manifest records the existing operations account's qualification separately from Coli's deferred proof. This slice creates no account, invite, role or membership. No production identifier is hardcoded into product code or public fixtures.

## Validation and lifecycle

All existing validation, enum and permission rules stay binding. No record is created from display text. Read-only projection tests and explicit no-op or stop outcomes run before any write. Forbidden states are in [behavior.md](contracts/behavior.md); real-database proof is in [quickstart.md](quickstart.md).
