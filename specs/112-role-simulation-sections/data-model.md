# Data model

Session mode: app_role_simulations keyed by verified session_id; actual profile_id/org_id, nullable role_key, UUID generation, started_at/expires_at/updated_at and validated original return_to. Null role = off. Initial absent row is off/zero UUID; active TTL two hours. Transitions serialize by session key and compare generation. Expired mode or revoked role/membership authority has no effective business authority until authenticated Finish; organization switch resets mode. A revoked/expired GoTrue session rejects admission with 401, including after its simulation row cascades away. No profile/member_roles edits.

Request authority: server-only actual actor and selected-role capabilities/rank/generation, matched to exact profile/org. Effective user retains IDs with platform role user. Other-member/background audience authority remains actual.

Audit: nullable simulation role/generation on doc_audit_log, defaulted from matching transaction-local settings. During simulation a database trigger forces the verified actual actor ID/name, even for legacy direct audit inserts that omit or attempt to override attribution. Mode/access transition audit and persistence share a transaction.

Access target: registered module/subresource, stable custom section/page ID or native page pattern. Existing permission_rules persist overrides. Inherit is absence, deny is explicit false. Deterministic revision covers target/stored override. Owner is protected; visibility edits never silently change unrelated module fields/scopes.


Ordinary verified browser requests also carry a fresh actual-capability snapshot bound to the admitted profile/organization. The same record-scope helpers enforce own-record mutations in ordinary and simulated browser sessions. Actual platform administrators preserve their ordinary bypass; selected authority always takes priority. Independent jobs without that browser scope use the existing authority path.

Session rows are server-only: RLS is forced and browser/service database roles have no grants. The auth-session foreign key cascades revocation; organization ID deliberately has no cascading foreign key, so organization deletion cannot silently restore actual admin mode before the actor can finish or reauthenticate.
