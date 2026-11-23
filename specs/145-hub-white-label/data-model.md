# Data model

## Organization

Existing authoritative table: `public.organizations` in Supabase PostgreSQL. Add only `hub_name text null default null`; preserve existing `name`, `slug`, ids, status and relationships.

| hub_name | Meaning | Resolution |
|---|---|---|
| null / absent legacy projection | Follow organization name | Normalize name and remove final standalone Hub; use it if valid, otherwise MINION |
| Valid text | Explicit owner/operator choice | Use exactly the normalized stored prefix |
| MINION | Explicit product default | MINION even if organization name differs |
| Invalid legacy/corrupt value | Unusable override | Fall through to valid organization suggestion, otherwise MINION; do not repair data during read |

Validation: NFC, single ordinary spaces, 1–15 graphemes using Intl.Segmenter, maximum 256 UTF-8 bytes, no line breaks/control or disallowed format controls, no final standalone Hub. Server and client use the same module. DB CHECK enforces null or trimmed/nonblank/nonempty text and the byte bound. Grapheme validation remains at the server boundary; authenticated non-admin direct writes remain denied by RLS.

Both the legacy organization creation and ORG_ROLE_TEMPLATES_ENABLED bootstrap transaction persist the chosen Hub name alongside the full organization name. Owner authority comes from organization_members.role, including new-model owners assigned custom-administrator; do not infer ownership from a literal role-key name. Existing-slug adoption and unique-insert recovery read rather than update branding. Changing the org's full name affects automatic mode only. This run adds no production backfill.

## Request projection

`Branding = { orgId: string | null, name: string, fullName: string, source: 'custom' | 'organization' | 'default', readStatus: 'ready' | 'unavailable' }`.

The server derives it from the verified active tenant. Unauthenticated pages receive `{orgId:null,name:'MINION',fullName:'MINION Hub',source:'default',readStatus:'ready'}`. Do not expose an arbitrary tenant record, raw user data, or another org's settings. Owner-only editor data additionally contains current override, full org name, and `canEditBranding` from fresh authorization. A failed required tenant read or unavailable server validator returns MINION with readStatus:unavailable; successful known default/automatic/custom resolution is ready. Recovery requires ready and the expected organization; a valid-looking fallback cannot clear a failed refresh. No capability bit authorizes a later write without rechecking.

## State transitions

- Absent override → automatic short name or MINION fallback.
- Save valid prefix → explicit override and committed projection returned.
- Use organization name → null override and re-resolved projection.
- Use MINION → explicit MINION override.
- Failed validation/auth/database write → no committed change, draft retained for retry.
- Org selection/logout → retire pending editor generation and old committed projection; render only current request/page data.
