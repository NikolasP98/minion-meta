# Implementation Plan: Discoverable persistent CRM profile classification and Instagram recording

**Branch**: Planned `129-crm-profile-followups` (not created) | **Date**: 2026-11-17 | **Spec**: [spec.md](spec.md)

**Input**: `specs/129-crm-profile-followups/spec.md`, proposal item F8.

## Summary

Scope is the spec's [DELTA](spec.md#delta): verification and configuration first, a tag contact-admission fix in US1, and the masked-key write repair and manual Instagram recording in US2, under the owner data and security approval gate. This plan adds the technical sequence only.

## Technical Context

**Language/Version**: TypeScript strict, Svelte 5 runes, SvelteKit 2.70.2; Bun per the Hub registry.
**Primary Dependencies**: Existing TagsField, OverviewCard and EditableGrid components; Drizzle PostgreSQL core, dataset and RBAC helpers. No new framework.
**Storage**: Existing org-scoped PostgreSQL records; viewer layout localStorage where already used. No schema migration.
**Testing**: Existing Vitest and mounted Svelte harnesses; local QA Postgres for tenant and policy qualification; Browser Harness for UI acceptance.
**Target Platform / Project Type**: Authenticated Hub web application, desktop and 390px mobile; installed-app use is an optional separately recorded check.
**Performance Goals**: Preserve existing bounded page reads; no per-row added fetch. The only new uncached read is the user-started fresh contacts page after a merge ([fresh-reconciliation.md](contracts/fresh-reconciliation.md)). No invented latency SLA.
**Constraints**: No broader permissions, unrelated WIP, production data writes, guessed identities or unrelated redesign. Owner approval before code/configuration, owner merge.
**Scale/Scope**: One proposal item, existing surfaces only; synthetic fixtures cover allowed, denied, owner-scoped and foreign personas.

## Constitution Check

| Principle | Pre-research | Post-design |
| --- | --- | --- |
| I Spec before code | Pass: specify stage precedes plan; no implementation | Pass: tasks follow plan; all tasks unchecked |
| II AS-IS / TO-BE / DELTA | Pass: pinned source plus reported/unproven distinction | Pass: oracles and execution stops stated |
| III Slice-scoped delivery | Pass: documentation only, no branch mutation | Pass: future isolated Hub checkout and PR to registry master; owner merge |
| IV Required gates | Pass: tokens, i18n, route/RBAC and browser requirements included | Pass: local QA and Hub checks required; not reported run |
| V Data/security human gates | Pass for planning only | Pending owner approval before implementation/configuration; gate is not waived |

Gate evaluation: review artifacts may be authored now; implementation is blocked until owner approval and runtime preconditions are met. No constitution exception is claimed.

## Project Structure

Documentation: spec.md; checklists/requirements.md; research.md; plan.md; data-model.md; contracts/behavior.md, client-compatibility.md, fresh-reconciliation.md and native-fixture.md; quickstart.md; tasks.md; implementation-inventory.md; design-review.md (generated). All under `specs/129-crm-profile-followups/`.

Hub source and test files, their actions and owning tasks are listed once, in [implementation-inventory.md](implementation-inventory.md). Commands are in quickstart.md and the inventory.

## Phase 0 — Evidence and reproduction

Re-read the source list in research.md on the candidate and record changes from the pin. Run the inventory and synthetic scenario in quickstart before editing code. Classify each requested behavior as supported, configuration-only, reproducible gap or unavailable evidence. Supported behavior needs verification, not reimplementation. An unexpected data/security defect outside [contracts/behavior.md](contracts/behavior.md) becomes a separately reviewed amendment.

## Phase 1 — Data model and contracts

Follow [data-model.md](data-model.md) and [contracts/behavior.md](contracts/behavior.md). Decisions, rationale and alternatives are in [research.md](research.md#decisions-rationale-and-alternatives). Propagate authorization through the source handle and sanitize outputs before they reach the browser; raw masked values must be absent from search, export and write responses as well as markup.

## Delivery slices

1. Inventory and reproduction, including forbidden and foreign controls, with no production writes.
2. User Story 1: tag contact admission (T018) plus verification of existing tagging and layout; wording only if reproduced.
3. User Story 2 in three buildable parts: masked-key update policy (T011), create/party/merge/gateway/loader (T019), client and fresh rows (T020); then the native fixture, suite and lanes (T017, T021, T012).
4. Candidate qualification and owner-reviewed release. Record local tests, CI, merge, deployment and post-merge runtime proof separately.

Each shipping slice runs its own gates:

- focused tests for the slice;
- for US2, the qa-native and crm-concurrent native lanes;
- `bun run check`, `bun run test`, `bun run build`;
- `bun run i18n:compile` after message changes and `bun run lint:design && bun run lint:tokens` after UI changes;
- Browser Harness acceptance;
- owner merge approval.

Commands and the route-contract note are in [quickstart.md](quickstart.md#full-qualification-and-result-recording).

## Masked-key and manual Instagram policy

The pinned details editor saves the masked projection back, so a restricted editor overwrites stored phone, email and `telefono` values and the phone identity. `CRM_PII_FIELD_KEYS` (`src/lib/pii.ts:20`) also lacks the manual Instagram keys. F8 registers those keys and makes every masked key read-only for restricted principals at the service layer, with a server-derived `canWriteSensitiveFields` option on every changed writer and no permissive default. The policy, signatures, storage-path choice and the gateway refusal are in [contracts/behavior.md](contracts/behavior.md). Never insert channel identities, connect accounts or send messages. Ordinary Vitest cannot prove concurrent SQL pre-image preservation; the qa-native suite does ([native-fixture.md](contracts/native-fixture.md)).

## Merge admission and feedback

`mergeContacts` gains a locked same-org participant check before any field read, a restricted refusal when a participant stores a manual Instagram key, and masked-override stripping ([behavior.md](contracts/behavior.md#merge-participant-admission)). Both merge hosts treat every outcome other than an acknowledgement or the known refusal as unknown and block further merges until a fresh read succeeds ([client-compatibility.md](contracts/client-compatibility.md)). The customer host's fresh read is the existing contacts GET with `fresh=1`; Hygiene's is the existing uncached duplicates GET ([fresh-reconciliation.md](contracts/fresh-reconciliation.md)).

## Existing host and caller compatibility

[client-compatibility.md](contracts/client-compatibility.md#required-existing-direct-test-callers) lists every existing direct test caller of the six changed signatures and the option value each passes. US2 qualifies two native lanes, each with its own report: the [existing crm-concurrent lane](contracts/client-compatibility.md#existing-crm-concurrent-lane-remains-separate) (seven behaviors) and the [qa-native Instagram suite](contracts/native-fixture.md) (nine behaviors). The native auth prerequisites, including the `service_role` ACL sentinel, come from F7's planned shared helper ([native-fixture.md](contracts/native-fixture.md#shared-f7-native-auth-prerequisite)); T017 waits for it. No runtime role or grant changes.

## Complexity and risks

No new framework, schema or generic architecture. Main risks: treating a supported feature or denied facet as a missing business fact, and the gateway behavior change for restricted assistants (spec decision 1). Configuration writes need owner-approved diffs and rollback evidence. Mocked storage does not prove RLS; real-database checks are required. This plan claims no reviewer verdict.
