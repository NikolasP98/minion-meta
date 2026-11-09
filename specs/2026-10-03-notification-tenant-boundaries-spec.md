---
id: 2026-10-03-notification-tenant-boundaries-spec
title: Bind Pulse ingestion and join notification audiences to canonical tenants
stage: spec
status: approved
pass: 2
created: 2026-10-03
updated: 2026-10-03
repos: [minion_hub, minion]
tags: [security, logic, test]
type: fix
proposal: 2026-10-03-notification-recon
verdict: approved
---

# Notification tenant boundaries

## 0. Product

Close NOTIF-002 and the audience-isolation portion of NOTIF-014 independently of the larger notification-platform feature. The user authorized security/data implementation in this readiness program. Human merge and production release remain later gates. No real notifications are sent during qualification.

## Out of scope

The user-only existing-pending join lookup is a separate discovered behavior and remains explicitly tracked; this slice changes notification audience, not that lookup. This slice does not claim durable delivery, universal events, a new inbox, scheduling or a complete notification platform. Those remain in the reviewed program ledger. It does not alter global administrator permissions elsewhere or rewrite existing requests.

## AS-IS

Hub a65b2840: `src/server/auth/resolve-identity.ts` resolves server-token credentials to `locals.serverId` and `locals.tenantCtx.tenantId`. `src/routes/api/gateway/pulse/proposals/+server.ts` checks only serverId, then constructs a PostgreSQL context from body.orgId. Gateway 3e352a68: `extensions/gmail-calendar/src/pulse-tools.ts` lets the model supply that orgId and reports success without checking HTTP status. Hub `src/server/services/join/requests.service.ts:createRequest` persists organization_id but selects every profiles.role=admin for email. The existing in-app pending list is already org-scoped. Exact frozen anchors are in the notification recon evidence.

## TO-BE

1. Pulse ingestion requires a resolved machine credential with both nonempty serverId and canonical tenantCtx. A browser session, serverId-only fabricated context or missing canonical tenant fails before storage. The POST constructs CoreCtx using only that tenant. The optional legacy body.orgId is accepted only when exactly equal to canonical tenant; a supplied mismatch returns403 before proposal validation and zero writes. New callers omit orgId. No organization fallback is permitted.
2. Reject malformed batches atomically instead of filtering invalid cards into an apparent success. The request budget is256KiB (enforce actual bytes, not only Content-Length),1..100 cards, source and kind1..100 characters, title1..500, summary at most4000, dedupKey1..250, JSON-object payload at most16KiB per card. Preserve current card kinds as data; this slice does not approve arbitrary payload actions. String lengths count Unicode scalar values; payload lengths use deterministic canonical JSON encoded as UTF-8. Existing downstream approval/action authorization remains mandatory. Error responses and telemetry contain bounded error classes, no SQL/provider/raw error bodies. Valid existing same-org legacy requests retain201 and inserted/skipped counts.
3. The Gateway pulse tool no longer exposes or accepts an org selector. Its body builder and runtime include only validated proposals and use the currently registered HubRest machine binding. Mismatched/unknown legacy org arguments fail closed if they reach execute directly; they are never forwarded as authority. Enforce the same bounds at tool admission, use `redirect:'error'`, cap response body at16KiB of actual UTF-8 bytes, and cap the full headers/body observation at15seconds even if the adapter ignores cancellation. Check res.ok before claiming success. Non2xx responses and invalid admission produce structured sanitized rejection classes; response loss, malformed acknowledgement and timeout return a structured unknown outcome, never success or proof of no write. Never include Error.message, raw bodies or provider objects. Only a body with ok===true and nonnegative integer inserted/skipped counts whose sum equals submitted count qualifies a success receipt. No blind automatic retry is introduced. Changing this tool does not change other channel tools or HubRest registrations.
4. Join-request notification candidates come only from membership in the exact requested organization. Here current membership means the exact organization_members(organization_id,profile_id) row exists; this table has no active/status column. Require the organization itself to have status='active'. Resolve at most1000 candidate members using limit-plus-one; overflow aborts all notification preparation with a typed operational failure before sending anything. Resolve users:manage with a reusable fresh, noncached authority path: membership first, current profile global-admin semantics only after that membership succeeds, otherwise fresh member_roles and permission_rules with the same canonical legacy fallback. Extract/reuse the existing resolver's computation rather than creating a second policy matrix; the ordinary two-minute/SWR capability cache cannot authorize a dispatch. Verified destination means auth.users.email for the canonical profile/auth user ID, with non-null email_confirmed_at; profiles.email is never a fallback. Case-insensitively deduplicate verified addresses. Finish bounded candidate/destination preparation before any send, then freshly recheck exact membership/capability, organization status and verified destination identity immediately before each provider call. A changed destination is suppressed, not silently substituted. Never fall back to global admins on an error or empty result. Ordinary target-org managers lacking users:manage and foreign/global admins outside the org receive nothing. A global admin who is also an active target-org member follows the documented canonical administrator capability semantics.
5. Include email.service.ts and its caller tests in this slice. sendJoinRequestEmail returns a typed accepted:true result or accepted:false with a bounded error class; missing credentials are unavailable, not success. Existing consumers must handle that contract. Provider acceptance is not human delivery. Logging contains no recipient address, applicant identity or raw provider error. The existing email is an alert to review a request, not the applicant record. Its external preview contains a generic request notice and the authenticated review link; requester name/email/message remain behind the authorized Hub page. Do not change membership approval or role grants. Preserve the already committed join request if notification preparation/delivery fails; return its existing successful creation result and record a sanitized operational failure in a bounded structured log (this slice adds no delivery table). This slice's delivery remains best-effort until the durable-outbox slice replaces it; do not label it delivered or introduce automatic retries.
6. Keep policy in small named modules/functions where it will be reused by the later event projector. Avoid another parallel RBAC matrix or notification registry. Comment the remaining best-effort boundary with TODO(handoff) pointing to the notification-platform proposal so the later outbox transition is explicit.

## DELTA

D1 removes body-owned database authority while supporting exact same-tenant legacy callers. D2 adds bounded atomic shape validation and honest tool HTTP outcomes. D3 replaces the unscoped global-admin fan-out with exact-organization current-capability recipients and safe external content. Existing production records and all other route/tool authority remain unchanged.

## Verification

**Topics:** security, auth, test

- Test actual identity resolution, hook/route and Pulse service under a marked disposable PostgreSQL fixture with two organizations. TokenA plus bodyB returns403 and creates no rows; tokenA without org or with exactA inserts onlyA once; duplicate dedup keys return expected skipped counts. Browser-only and incomplete machine contexts fail. The actual app_ledger role with the organization GUC must enforce the existing RLS policy: foreign-row reads return none and foreign inserts fail. Assert its effective privileges and non-bypass/non-owner role state. The current Pulse table enables but does not force RLS; this no-migration slice does not claim FORCE. Mocks alone do not qualify tenant isolation.
- Malformed JSON, lying Content-Length, chunked oversized input,101 cards, bad fields, oversized payload and mixed valid/invalid batch cause zero writes. Valid maximum-sized bounded input succeeds.
- Gateway execute tests use fake fetch:403/500, malformed JSON, malformed/negative/mismatched counts, ignored abort/deadline and valid receipt. No case reports proposed0 as success after an error. Verify schema/body omit orgId and direct unexpected org argument is refused without network.
- Join fixtures include eligible target-org user, target-org member lacking capability, foreign manager, global admin with no target membership, duplicate destination, revoked membership after candidate resolution, stale cached role, inactive organization,1001-member overflow and missing/unverified canonical auth email despite a profiles.email value. Only eligible current recipients receive one fake send. Inject resolver/provider errors after request commit: committed request remains and creation does not become a500; sanitized logs contain no applicant/recipient PII. Capture fake email content and assert no requester name/email/message.
- Neighboring join/invite/membership and Pulse action tests must pass. No real email/channel call occurs. Run normal type, focused tests and required native lane; reject conditional/skipped tenant assertions. Independently review role semantics, tool consumers, raw error exposure and membership revocation boundary. Revocation after an external provider accepts cannot undo that accepted message; this slice claims only the last pre-dispatch check.

## Release

Deploy Hub validation first so current same-org Gateway callers remain compatible; deploy the tool change next. This slice is independently reviewable before the larger platform contract is approved. Its isolated scope replaces the broader draft's no-slice-start wording only for these two already-confirmed tenant defects after its own Standards and Spec passes. No merge, migration or production sending is part of local qualification.


## Approval checkpoint

Independent Standards PASS by Sol `hub_test_fixes` and final Spec PASS by the root on source SHA-256 `c4463c732db1c03ad1d3d171870e4bf8059728a3dae2d2e5e1f22e94e12a040f`. The canonical copy changes approval metadata and appends this checkpoint only. Source implementation and disposable qualification are authorized; human merge and production release remain separate.
