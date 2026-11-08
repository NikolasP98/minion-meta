# Data model

Session mode: app_role_simulations keyed by verified session_id; actual profile_id/org_id, nullable role_key, UUID generation, started_at/expires_at/updated_at and validated original return_to. Null role = off. Initial absent row is off/zero UUID; active TTL two hours. Transitions serialize by session key and compare generation. Expired/revoked active state has no effective business authority until Finish; organization switch resets mode. No profile/member_roles edits.

Request authority: server-only actual actor and selected-role capabilities/rank/generation, matched to exact profile/org. Effective user retains IDs with platform role user. Other-member/background audience authority remains actual.

Audit: nullable simulation role/generation on doc_audit_log, defaulted from matching transaction-local settings. Existing actual actor fields remain unchanged. Mode/access transition audit and persistence share a transaction.

Access target: registered module/subresource, stable custom section/page ID or native page pattern. Existing permission_rules persist overrides. Inherit is absence, deny is explicit false. Deterministic revision covers target/stored override. Owner is protected; visibility edits never silently change unrelated module fields/scopes.
