# Implementation Plan: FACES personal-account agenda in the operations Space

**Branch**: Planned `127-faces-operations-agenda` (not created) | **Date**: 2026-11-16 | **Spec**: [spec.md](spec.md)

**Input**: [spec.md](spec.md), parent proposal item F6.

## Summary

Inventory the existing navigation, policy and personal preferences. If the agenda link is already in place, deliver a verification with zero writes. Otherwise add one marked agenda link to `/pos/appointments` in the `pdv` section, keeping every policy, role and unrelated field. Pinned source shows a race between a cached navigation read and a whole-document save, and shows that an alias can be more permissive than its target. Before the link is added, the code therefore changes in four layers:

- the navigation service and route: fresh read, conditional save and the preserve-single-link mode ([behavior.md](contracts/behavior.md));
- the navigation model, schema and editor copy path: the sticky `canonicalAccess` marker ([canonical-access.md](contracts/canonical-access.md));
- the permission service and request hooks: the canonical ceiling for marked aliases ([canonical-access.md](contracts/canonical-access.md#runtime-ceiling-for-every-role-combination));
- the section-access policy loader: an authority-only extraction ([policy-read-seam.md](contracts/policy-read-seam.md)).

There is no workspace provisioning, contextual-policy change, schema migration or new route. This security-tagged change is part of this owner-pending spec, not cosmetic configuration; unrelated defects found on the way still need a separate scope review.

## Technical Context

**Language/Version**: TypeScript strict, Svelte 5 runes, SvelteKit 2; Bun per the Hub registry and pinned package manifests.
**Primary Dependencies**: Existing navigation editor components, Zod schema and Drizzle PostgreSQL core and RBAC helpers. No new framework or package.
**Storage**: The existing org-scoped `app_nav_config` JSON document and `permission_rules` rows. No schema migration.
**Testing**: Existing Vitest and mounted Svelte harnesses; the `qa-native` real-PostgreSQL lane for concurrency and role phases; Browser Harness for UI acceptance.
**Target Platform / Project Type**: Authenticated Hub web application, desktop and 390px mobile; installed-app use is an optional separately recorded account check.
**Performance Goals**: The fresh read and conditional save each add a constant number of statements per save inside the existing transaction; ordinary cached navigation reads are unchanged. Record before and after statement counts for a save. No latency target is set.
**Constraints**: No broader permissions, unrelated WIP, production data writes, guessed identities or unrelated redesign. Owner approval before code or configuration; owner merge.
**Scale/Scope**: One proposal item. Synthetic fixtures stand in for the operations account and for denied and foreign controls. Coli is not provisioned (owner-confirmed) and its real-account proof is deferred.

## Constitution Check

| Principle | Pre-research | Post-design |
| --- | --- | --- |
| I Spec before code | Pass: specify precedes plan; no implementation | Pass: tasks follow plan; all tasks unchecked |
| II AS-IS / TO-BE / DELTA | Pass: pinned source; reported versus unproven facts separated | Pass: test oracles and explicit stop conditions |
| III Slice-scoped delivery | Pass: documentation only, no branch change | Pass: future isolated Hub checkout, PR to `master`, owner merge |
| IV Required gates | Pass: tokens, i18n, route and RBAC, browser requirements included | Pass: local QA and Hub checks required; none reported as run |
| V Data/security human gates | Pass for planning only | Pending owner approval before implementation or configuration |

Implementation is blocked until owner approval and the runtime preconditions are met. Review results are recorded under egm/. No constitution exception is claimed.

## Project Structure

Documentation, all under `specs/127-faces-operations-agenda/`: spec.md, plan.md, research.md, data-model.md, contracts/behavior.md, contracts/canonical-access.md, contracts/policy-read-seam.md, quickstart.md, tasks.md, implementation-inventory.md, checklists/requirements.md, and the generated design-review.md.

Hub source: [implementation-inventory.md](implementation-inventory.md) is the complete list of Create, Modify and no-change files, including tests. This plan does not repeat it. No file is deleted.

## Phase 0 — Evidence and reproduction

Read the source list in [research.md](research.md) on the implementation candidate and record changes from the pinned baseline. Run the inventory and synthetic scenario in the [quickstart](quickstart.md) before editing code. Classify each requested behavior as supported, configuration-only, reproducible gap or unavailable evidence. Supported behavior needs verification, not reimplementation. Any unexpected data or security defect becomes a separately reviewed amendment with owner approval.

## Phase 1 — Data model and contracts

Follow [data-model.md](data-model.md) and the three contracts. Use custom navigation, not workspace provisioning: `app_nav_config` stores custom sections and aliases, while `workspaces.service` handles company access. A new workspace would add unrelated membership; a new agenda page would duplicate the existing screen.

Do not broaden authoritative storage to solve a display gap. A denied route must stay denied on the page, `__data.json`, actions and `/api/nav/resolve`, not only in the menu.

## Delivery slices and test oracles

1. Inventory and reproduction, including forbidden and foreign controls, with no production writes.
2. User Story 1: the read-only current-state report (T006, T007), then the code that the selected design requires before any write: the conditional save and preserve-single-link mode (T008), the marker and copy path (T018), the canonical ceiling (T019) and the policy-read extraction (T020), verified by T009.
3. User Story 2: the persistence and recovery tests, synthetic rehearsal and native qualification (T010 to T012), kept separate from unrelated business mutations.
4. Full candidate qualification and owner-reviewed release (T013 to T016), then the real configuration change (T017). Local tests, CI, merge, deployment and post-merge runtime proof are recorded separately.

## Required gates and evidence

In the isolated Hub candidate run `bun run check` (zero errors and warnings), `bun run test` and `bun run build`, plus `bun run lint:design && bun run lint:tokens` after UI changes and `bun run i18n:compile` for changed strings. Check registered route contracts even though no route is added. Use the Browser Harness skill, with an isolated session if work is concurrent, and inspect route-data outcomes rather than a 200 document shell. Test Spanish and English, light and dark, 390px and desktop, keyboard focus and reload persistence. Record screenshots and network and redaction assertions with synthetic data only. Commands are in the [quickstart](quickstart.md).

## Complexity and risks

No new framework, schema or generic architecture. The main risk is misreading a supported feature, or a denied facet, as missing business data; keep availability and source provenance explicit. Configuration writes need owner-approved diffs and rollback evidence in the same scope. Tests that mock storage do not prove row-level security or real policy enforcement; the real-database checks are required.

## Configuration sequence

Seed the current-state inventory from the sanitized [read summary](../../audits/2026-11-16-faces-followups/evidence/meeting-case-read-summary.json), then re-read the live document before acting. Its `pdv` section has eight page objects and no agenda link; keep those pages and all unrelated configuration unchanged. Do not put live page or account IDs in fixtures. Record the target `/pos/appointments` in the private execution manifest; [research.md](research.md#decisions-rationale-and-alternatives) shows the screen is aliasable. Resolve the operations personal account; it is not in the sanitized summary and is unverified until T007. Record Coli's proof as pending separate provisioning; the operations account and the org-wide link can complete independently. Do not invite, create an account or add a per-user grant.

Build one candidate from a `fresh=1` read: keep `version: 1` and every original object and order, and add only a marked `kind: 'link'` page to `/pos/appointments` with a collision-free six-character ID, within the limits in [data-model.md](data-model.md#existing-navigation-document) and the slug and target validation. Obtain the owner's approval of the diff, PUT once in preserve-single-link mode with the fresh config and policy revisions, then fresh-read persistence. Recovery, rollback and the handling of unknown responses follow [behavior.md](contracts/behavior.md#operator-sequence-and-recovery). There is no contextual-policy, role or membership write.

Then re-read each account's member-filtered navigation and preferences and test fresh login and reload, alias resolution, canonical loader data and denied controls. A link alone is not permission. If existing permissions do not allow the view, record the denial and stop that account's qualification; any access change needs a separately reviewed, owner-approved amendment.

The real change happens only in T017, after the qualified release in T016; the task order is in [tasks.md](tasks.md#dependencies-and-parallel-opportunities).
