# Research decisions

Current Hub master `5f647e7c`, verified 2026-11-08. Isolated feature checkout recorded in plan.

- Reuse buildCapabilities through matching request scope; client permission replacement alone misses canonical/fresh admin re-reads. Preserve real-member cache entries.
- Use durable verified-session state/generation. Raw preferences or stateless unsigned role cookies cannot coordinate session transitions across tabs/instances.
- Preserve actual profile IDs for attribution and ownership, with effective platform role user; custom organization roles do not belong in the platform-role type.
- Block unsupported new gateway/Workforce/deferred authority during simulation. ALS cannot cross an independent credential/network boundary. Existing independent jobs are outside the new request's admission boundary.
- Contextual policy writes use reviewed Apply, independently of the deliberately single-screen simulator. Stable target IDs and transactional revision checks prevent label-based authority and silent overwrites.

Source map: rbac.service resolveCapabilities/resolveFreshCapabilitiesInTransaction/callerRankCap; fresh-org-authority; reliability-read-authority; gateway-jwt.service; gateway-rpc; assistant-principal; layout coreLoadKey; activity.service; with-org-core; canonical nav and role services. Two UX audits and EGM research reports distinguish source proof from runtime qualification.
