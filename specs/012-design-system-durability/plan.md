# Implementation Plan: Durable Minion design system

**Branch**: `feat/design-system-durability` | **Date**: 2026-10-16 | **Spec**: [spec.md](spec.md)

## Summary

Deliver eight audited initiatives through existing semantic tokens, shared controls, scoped preferences, action runtime and page shells. Use four bounded slices: foundation/qualification, layout and capabilities, edit/recovery/forms, then recipes/integration/release. Each slice is independently testable; dependency packaging follows shared code completion. Do not add a universal wrapper or preference SDK.

## Technical Context

TypeScript strict, Svelte 5/SvelteKit 2, Tailwind 4. Node22+, pnpm meta; Bun Hub/Site. Existing PostgreSQL version columns and authenticated preference API; browser localStorage for scoped fallback. Tests: node:test token/script checks, Vitest pure/mounted/endpoint tests, browser-harness actual component builds. Production: Vercel Hub and Site, immutable vendored package archives. Scope: two consumer products and two shared design packages. No schema migration or new dependency planned. Keep event handlers bounded; preference normalization linear in catalog size; clamp payload/card counts. Do not add per-frame network operations.

## Constitution Check

Spec before code: spec/plan/tasks and two-pass independent review precede edits. AS-IS anchors revalidated against fresh origin bases. Isolation: new clones preserve original WIP; each uses registered PR base. UI gates, i18n and existing RBAC retained. Owner explicitly authorized recommendation implementation/deployment including scoped preferences and stale-write protections; no production business-data scripts. Record review and deploy receipts; no stages bypassed. Recheck after implementation for scope drift.

## Project Structure and ownership

- meta `packages/design-tokens/`, all shared controls except FormField: foundation worker. both meta shared and Hub FormField plus Hub ErrorSummary: outcome worker. No concurrent edits to same file.
- Hub dashboard/layout preference helpers, FieldsList, DataTable/Picker/DataView: layout worker in sequential sub-slices.
- Hub records/autosave/action feedback, stock/event-type handlers/services, Dialog consumers and confirmations: outcome worker.
- Site lint scripts/CI: foundation worker.
- Hub app.css/design lint, recipes/capture manifest, docs, shared package packing, consumer manifests/locks, final verification and deployment: orchestrator.
- Messages: workers supply isolated JSON patches in feature evidence; orchestrator merges keys and compiles once, or workers coordinate exclusive append windows.
- Root owns feature artifacts and status. Shared fixture additions must consume installed archive components.

## Delivery sequence

1. Complete fresh-source evidence and two-pass review; record already-satisfied Site token gates.
2. Parallel foundation, layout integrity, outcome fixes with focused tests. Keep existing public API compatibility where safe; explicitly update consumers for stricter version/tuple boundaries.
3. Finish table API and composition pilots; shared form controls; update consumer CSS and ratchets.
4. Build shared packages, create immutable uniquely versioned archives plus source/member digests, install the exact bytes into Hub/Site. Vendored archives are the existing consumer release mechanism; npm publication is separate and not a prerequisite for deploying these consumers.
5. Run mandatory gates and mounted/real-browser fixture matrix. Independent code review with regression corrections. Scoped commits and draft PRs against meta/dev, Hub/master and Site/dev.
6. Merge when checks pass under owner's deployment authorization. Promote only scoped shared changes to meta/main and Site changes to master; inspect branch divergence so unrelated integration work is not released accidentally. Verify expected Vercel aliases, source revision and read-only smoke checks. Update report and receipts.

## Verification matrix

US1: 18-theme allowed-pair computation; installed computed typography + coarse targets in every size, density and theme; decorative isolation. US2: malformed/v0/v1/future layouts; catalog append+alias; scope rotation; slow saves; storage denied; keyboard move/resize/reset; DOM order. US3: 409 version mismatch; uncertain network; committed refresh failure read-only retry; stale owner fences; custom dirty dismissal; summary navigation/confirm retry. US4: logical activation after sorting/filtering; nested controls; nonempty views; preset precedence; collection/calendar plus board/gallery/detail/form/dashboard/workspace recipes. US5: unknown-token mutation, per-file debt transfer and missing-ref failures; archive digests and clean consumer installs. Capture 1440/390/320px, narrow desktop pane and 200% text zoom with EN/ES, keyboard and reduced-motion selected cells. The full theme/input contract is computed in the fixture; screenshots represent selected legible examples, not every permutation.

## Risks and mitigations

Unscoped legacy local preferences have unknown ownership: do not auto-import, keep old storage untouched and use defaults/scoped server state. Tightened version writes can break consumers: inventory all direct endpoint callers, return fresh versions and test stale retry. Raising target minimums can break dense toolbars: container fixtures must prove reflow. Token contrast changes may flatten hierarchy: adjust failing roles minimally and validate rendered styles. Version labels previously differed from source package version: use new immutable archive identity with member hashes. Production deploy may lag merge: report alias/source checks separately and keep working until verified or a concrete external blocker exists.

Review amendments in spec.md are binding, especially full contrast/target matrices, real autosave hosts and native PostgreSQL CAS proof. No implementation begins until reviewers clear them.
