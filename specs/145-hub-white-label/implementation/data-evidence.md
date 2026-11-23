# Data slice checkpoint

Commit: cafed572f2ff9084a1bf1752a0acfe2ba8212105 on feat/hub-white-label-data.
Base: 5347ff0148a3600fd3963d94db57e95c8e5a2779.

Implemented all data-owned approved spec145 surfaces: exact shared Unicode validator/resolver and fixture vectors; nullable hub_name migration; actor114→organization112 locked canonical profile/membership/owner/manage transaction; both exact PATCH schemas; role-simulation read-only; existing tenant writer closed through verified locals; legacy and new-model create-only branding persistence and retry preservation; exact RBAC; additive QA fixtures/native manifest.

Focused final ordinary suite: 9 files,136 tests passed. Command: bunx vitest run src/lib/branding.test.ts src/server/services/organization-branding.service.test.ts src/routes/api/organizations/branding/server.test.ts src/routes/api/tenants/me/server.test.ts src/server/services/organization-provision.service.test.ts src/routes/api/organizations/provision/server.test.ts src/server/services/rbac.service.test.ts scripts/qc/native-postgres-manifest.test.ts scripts/qa/seed/tenancy-branding.test.ts. See unit-data-final.log.

Native final suite:18 tests passed across organization-branding.sql.integration.test.ts and organization-bootstrap.sql.integration.test.ts, through vitest.qa-native-postgres.config.ts with all native markers and parent-qualified loopback QA/QC targets. Includes actual migration over preexisting row, real final-schema authenticated owner/staff/foreign update denial, both role models, fresh rule/owner loss, actual duplicate rollback, and two concurrent revocation orders with real lock-wait evidence. New migration applied exactly once through guarded migration runner to dedicated loopback QA backend.

Additive seed helper executed twice against qualified local GoTrue+PostgreSQL: eight unique registrations and idempotency passed, established personas unchanged. New branding-owner/staff/admin personas and qa-branding-short/long/custom/minion/maximum organizations. Regression verifies existing-email and server-assigned GoTrue UUIDs flow unchanged into every membership/role row.

Independent review findings fixed: unsupported runtime metadata mutation must503 (now both writers503/noSQL regression); use returned GoTrue identity rather than recomputed fixture UUID (two mismatch modes regression). Exact JSON media-type admission also tested against JSONP/+garbage.

Final exact committed-candidate full check completed with0 errors and0 warnings; see check-data-final.log. Parent owns integration-wide tests/build/a11y/browser/CI/deployment and production verification. This checkpoint makes no release/runtime claim.

Standards self-review: scoped ownership, strict input allowlists, parameterized SQL, canonical fresh authority, no mutable branding singleton, no external calls within transaction, no new dependencies. Spec self-review: all data-owned transitions implemented and focused/native behaviors exercised; no known open implementation defect.
