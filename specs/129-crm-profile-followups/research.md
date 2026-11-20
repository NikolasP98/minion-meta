# Research: Discoverable persistent CRM profile classification and Instagram recording

## Evidence baseline and reading list

Read the root AGENTS.md; pinned Hub AGENTS.md and its CLAUDE.md include; `.claude/skills/ui-design-governance/SKILL.md`; `.claude/skills/speckit-specify/SKILL.md`, `speckit-plan/SKILL.md`, `speckit-tasks/SKILL.md`; `.specify/memory/constitution.md`; the active spec, plan and tasks templates; and parent proposal item F8.

Hub source is the private pinned checkout `.local/faces-followups-2026-11-16/hub-source`, HEAD `c6c2d5739572356239c4048c0f564f40b0768adc`, verified by git rev-parse. Source paths below are relative to Hub; links pin that commit. Meta registry reports Hub master and Bun. Framework behavior was read from the installed `minion_hub/node_modules/@sveltejs/kit` 2.70.2, the version in Hub `bun.lock:869`.

| Evidence | Source anchor | Finding / reading purpose |
| --- | --- | --- |
| R1 | [`src/routes/(app)/crm/[contactId]/PageBody.svelte:84`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/routes/%28app%29/crm/%5BcontactId%5D/PageBody.svelte#L84) | Standard fields do not include Instagram; arbitrary nonreserved fields are Additional. |
| R2 | [`src/routes/(app)/crm/[contactId]/PageBody.svelte:228`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/routes/%28app%29/crm/%5BcontactId%5D/PageBody.svelte#L228) | The details editor rebuilds customFields from the masked projection and sends `phone` from the masked WhatsApp identity (`stdValue`, :137-151). |
| R3 | [`src/routes/(app)/crm/[contactId]/PageBody.svelte:426`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/routes/%28app%29/crm/%5BcontactId%5D/PageBody.svelte#L426) | Profile manual-tag POST/DELETE handlers and reload invalidation. |
| R4 | [`src/routes/(app)/crm/[contactId]/PageBody.svelte:932`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/routes/%28app%29/crm/%5BcontactId%5D/PageBody.svelte#L932) | Lifecycle stage control and CRM TagsField; placement TODO refers to a separate proposal. |
| R5 | [`src/routes/(app)/crm/[contactId]/PageBody.svelte:1003`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/routes/%28app%29/crm/%5BcontactId%5D/PageBody.svelte#L1003) | Identity card displays channel handle/externalId, read-only. |
| R6 | [`src/routes/(app)/crm/[contactId]/PageBody.svelte:1183`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/routes/%28app%29/crm/%5BcontactId%5D/PageBody.svelte#L1183) | EditableGrid `crm-contact-detail-v2`, edit permission and admin default control. |
| R7 | [`src/lib/components/dashboard/EditableGrid.svelte:55`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/lib/components/dashboard/EditableGrid.svelte#L55) | Account-scoped local storage and versioned layout; server defaults are distinct from user local state. |
| R8 | [`src/server/services/crm-contacts.service.ts:133`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/server/services/crm-contacts.service.ts#L133) | Synced identities store `handle` separately from contact metadata. For masked principals `getContact` (:1425-1428) and the roster (:1182-1186) mask `externalId` only; `handle` is returned raw, while `findDuplicates` masks both (`crm-cleanup.service.ts:422-431`). |
| R9 | [`src/routes/api/crm/contacts/[id]/tags/+server.ts:1`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/routes/api/crm/contacts/%5Bid%5D/tags/+server.ts#L1) | Apply/remove delegate to `applyTag`/`removeTag` (`crm-contacts.service.ts:2044-2084`), whose `assertSimulatedRecordAccess` reads no row for unscoped actors; the POST catch forwards raw error text (:17-21). |
| R10 | [`src/routes/api/crm/contacts/[id]/+server.ts:50`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/routes/api/crm/contacts/%5Bid%5D/+server.ts#L50) | PATCH resolves `maskSensitive` (:53-56), sanitizes success and stale rows (:81-104). |
| R11 | [`src/routes/(app)/crm/[contactId]/+page.server.ts:45`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/routes/%28app%29/crm/%5BcontactId%5D/+page.server.ts#L45) | Loader resolves `ownerFilter` and `maskPii` (:49-53) and returns `crm` (:127-137); no edit hint today. |
| R12 | [`src/lib/pii.ts:20`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/lib/pii.ts#L20) | `CRM_PII_FIELD_KEYS` excludes Instagram keys. |
| R13 | [`src/server/services/crm-contacts.service.ts:440`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/server/services/crm-contacts.service.ts#L440) | `rankContactsPageCached` wraps uncached `rankContactsPage` (:423) with `ttl: '2m'`, `swr: '1h'` (:466). Callers: [`crm/customers/+page.server.ts:98`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/routes/%28app%29/crm/customers/+page.server.ts#L98), [`api/crm/contacts/+server.ts:77` and `:92`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/routes/api/crm/contacts/+server.ts#L77), and [`api/crm/contacts/export.csv/+server.ts:147`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/routes/api/crm/contacts/export.csv/+server.ts#L147). All stay cached except the new `fresh=1` branch. |
| R14 | [`src/lib/components/crm/CrmHygiene.svelte:235`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/lib/components/crm/CrmHygiene.svelte#L235) | Hygiene groups come from the `/crm/settings` loader via `findDuplicatesCached` (`settings/+page.server.ts:47`, `crm-cleanup.service.ts:51-58`). No client calls GET `/api/crm/cleanup/duplicates`. |
| R15 | [`src/server/services/custom-properties-access.ts:55`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/server/services/custom-properties-access.ts#L55) | `crm.customers` custom properties are hidden from restricted principals; refusal identifier `sensitive_fields_restricted` (:40). |

## Current behavior and uncertainty

The current behavior and its uncertainty are stated once, in the spec's [AS-IS](spec.md#as-is) section. The table above gives the anchors.

## Decisions, rationale and alternatives

Decision: verify existing tags rather than create a second classifier. Rationale: CRM TagsField already scopes to manual tags and routes persist links; lifecycleOverride is separate. Alternatives: storing modelo as lifecycle changes customer scoring semantics; an event tag does not persist the classification on the profile. Reuse a matching manual CRM tag and report conflicting same-name tags for owner resolution.

Decision: add a same-org contact lock to the tag routes (US1). Rationale: R9 shows unscoped actors reach the insert with any contact ID, and the contact foreign key does not apply row security. Alternative: stop US1 pending an amendment; rejected because the fix reuses the merge admission helper F8 already needs.

Decision: manual Instagram recording uses the current profile editor, after inspecting org custom properties and existing Additional keys. Prefer an existing `crm.customers` property (R15 already hides it from restricted principals); otherwise qualify the Additional editor with a manual Instagram key. Alternatives: a standard instagram column or identity editing invents schema/identity behavior beyond the meeting. No remote Instagram API, validation claim or messaging authorization is implied.

Decision: make every masked key read-only for restricted principals in `updateContact`, not only Instagram. Rationale: R2 and `crm-contacts.service.ts:1736-1747` show restricted saves already overwrite phone, email and the phone identity with masks; registering Instagram as masked without this would add a fourth corrupted field. Alternative: detect mask bullets in values; rejected because a value's content is not authority.

Decision: refresh merge hosts with existing uncached GETs, not loader invalidation. Rationale: `replaceState` does not change the URL `invalidate` reloads (kit `client.js:417-426`, `:2551-2583`). Alternative: `goto(url, {replaceState: true, invalidate: [...]})` with an epoch; rejected as larger and still needing a server marker.

Decision: keep the layout and add only bounded wording/help if a personal-account walkthrough reproduces a discoverability issue. EditableGrid persists viewer-specific versioned layout in localStorage; same-browser reload is provable, cross-device sync is not.

## Cross-cutting design decisions

Use existing Svelte 5 components and semantic design tokens; no generated token CSS editing. User-visible labels go through Paraglide catalogs and `bun run i18n:compile`. Existing routes keep route-design-manifest and RBAC coverage; no route or module is created. Dataset denial, owner scoping and field masking are tested before serialization and in rendered UI; hiding controls alone is insufficient. Keep source-code and production/configuration evidence distinct.

## Review limits and execution preconditions

No browser, product test, production configuration write or implementation was performed for this item. No account or contact identity is inferred from meeting spelling. The reading list shows inspectable implementation behavior, not an exhaustive security audit. The orchestrating session supplied live read-only evidence, finalized as a repeatable-read app_ledger snapshot at 2026-11-16T19:20:30.051Z, summarized in the [sanitized summary](../../audits/2026-11-16-faces-followups/evidence/meeting-case-read-summary.json); private identities and raw records are not reproduced. Source and live-record evidence do not prove browser behavior or deployed source identity. Approval remains pending.

## Write-path evidence

`crm-contacts.service.ts:1587-1620` distinguishes whole-namespace replacement (`customFieldsMergeSql`) from partial merge (`customFieldsPatchSql`); only reserved keys are preserved today. Both helpers are exported and called directly by tests (`crm-contacts.service.test.ts:175-199`, `crm-contacts.custom-fields.test.ts:156-184`). The PATCH route resolves the principal's mask and sanitizes success/stale rows; the loader resolves the mask but returns no edit hint (`+page.server.ts:45-68,127-137`).

The other `updateContact` caller is `api/gateway/actions/contact-update/+server.ts:67-99`. It writes `phone` and `email` for the delegated principal and returns success and stale rows unsanitized. Its `requireAssistantCapability` result carries the delegated principal's capabilities (`api/gateway/_shared/action-auth.ts:8-32`). An existing real-handler test harness is `src/routes/api/gateway/actions/contact-update.server.test.ts` (PGlite, `fieldLevel: () => 0` at :94).

## Create/merge source evidence

The only production `createContact` caller is POST `api/crm/contacts/+server.ts:116-131`; its schema accepts arbitrary customFields and `createContact` (:1541-1560) inserts them and returns a raw row. POST `api/crm/parties/+server.ts:63-82,128-150` accepts customFields, strips reserved keys and calls the only production `ensureContactFacetForParty` caller (`party.service.ts:182-215`). POST `api/crm/cleanup/duplicates/+server.ts:21-40` is the only production `mergeContacts` caller and accepts arbitrary customFields overrides; `mergeContacts` (`crm-cleanup.service.ts:439-532`) backfills loser metadata, applies overrides and hard-deletes losers (:527-531). It relies on `assertSimulatedRecordAccess` (:453-455), which is not an existence check for unscoped actors, and writes no audit row. `crm-contact-ensure.ts:102-112` creates identities without arbitrary metadata and is not a manual edit path. These are source findings and planned regressions, not executed fixes.

The native suite and the existing crm-concurrent lane are described in [native-fixture.md](contracts/native-fixture.md) and [client-compatibility.md](contracts/client-compatibility.md#existing-crm-concurrent-lane-remains-separate). The `service_role` ACL sentinel comes from F7's planned shared helper and must exist before baseline grants.
