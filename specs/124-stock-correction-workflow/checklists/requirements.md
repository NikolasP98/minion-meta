# Specification quality checklist: Auditable stock correction workflow

**Purpose**: Validate documented requirement and design completeness; this is not implementation qualification or owner approval.
**Created**: 2026-11-16
**Feature**: [spec.md](../spec.md)

## Content quality

- [x] User journeys describe observable outcomes, including POS-only both-empty correction, stock-moving correction and blocked history.
- [x] Stakeholder requirements, pinned AS-IS evidence and technical companion contracts are separated and discoverable.
- [x] Mandatory Spec Kit sections, rationale, alternatives, risks and measurable outcomes are present.

## Requirement and contract completeness

- [x] Requirements distinguish source evidence, bounded local observations and proposed behavior; operational unknowns have explicit stop/approval gates.
- [x] The API contract closes source identity, discriminated request fields, array/numeric/body bounds, canonical preview/payload hash inputs, responses and per-effect capabilities.
- [x] The shared schema selects one exact five-kind migration, conditional nullability, same-org references, uniqueness, immutable grants/RLS and paired synthetic seed.
- [x] Transaction and authority contracts name F7 prerequisites, typed same-transaction seams, the first org gate, complete writer inventory/order, retry/timeouts and selected mapping cutover.
- [x] Native qualification selects one qa-native owner, thirteen exact semantic names/count, actual guarded multi-backend fixtures and whole-lane JSON completeness validation.
- [x] Tasks are unique, sequential, dependency-ordered and linked to exact files; each implementation checkbox remains unchecked.
- [x] Qualification explicitly includes the required build, pure/API/mounted/native/browser/permission/i18n/design-token and migration/seed evidence.
- [x] Repeated/concurrent booking realization proof is an explicit common prerequisite for F5 recovery, preserving lifecycle/payment boundaries and the existing source posting owner.

## Evidence and remaining gates

- [x] Review results and dispositions are recorded under `egm/`; this checklist does not assert a passing independent verdict or replace fresh review.
- [x] Real Spec Kit authoring/prerequisite receipts and pinned source references are identified in the feature's companion artifacts.
- [ ] Owner approval of the data spec before product code — pending.
- [ ] Product implementation and exact-candidate local/native/browser checks — pending.
- [ ] Independent implementation review, CI, owner merge, deployment and runtime proof — pending.
- [ ] Any F1/F2 exact production manifest/target/cost/period apply approval — separate and pending; not granted by this workflow spec.

## Validation notes

This author check verifies that the contracts, tasks and qualification instructions agree. Source baseline is Hub `c6c2d5739572356239c4048c0f564f40b0768adc`. No product code, schema, credentials, Git branches/worktrees or production data were changed by this documentation work. Independent review evidence is retained under `egm/`; no Goldfish pass, completed implementation or runtime success is claimed here. Planning authorization does not bypass constitution V.

Public stock_only remains HTTP 422 owner_evidence_required; private garment authority/evidence are defined in [garment-envelope.md](../contracts/garment-envelope.md). Active actor and mutable-input synchronization follow [transaction-protocol.md](../contracts/transaction-protocol.md). Require every named behavior in [native-qualification.md](../contracts/native-qualification.md), without treating these proposed changes as current production proof.

Qualify the [F7 authority bridge](../../128-faces-receivables-audit/contracts/authority-bridge.md) before F3 storage and helpers. New correction admission uses its guarded write adapter; actual baseline ACL/RLS and legacy adapter compatibility remain binding. Qualification and owner approval are pending.
