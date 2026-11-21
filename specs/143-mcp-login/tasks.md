# Tasks: MCP login (spec 143)

- [ ] T001 Migration `mcp_connections` + Drizzle schema + seed pairing.
- [ ] T002 `mcp-connections.service.ts` + tests; inventory entries.
- [ ] T003 `src/server/mcp/caller.ts` + tests (key path, token path, every refusal).
- [ ] T004 Route: caller, 401 pointer, per-connection rate limit; well-known metadata in hooks + tests.
- [ ] T005 Tools: caller-aware, permission gate for signed-in callers, `whoami`, `sandbox_query`, list filtering, author on writes + tests.
- [ ] T006 Consent route (load, approve, deny) + i18n + tests for the server part.
- [ ] T007 Connected apps list/revoke (API + Settings → Developers) + tests.
- [ ] T008 Gates listed in plan step 9.
- [ ] T009 (orchestrator) check, build, local end-to-end, PR, CI, merge, production rollout and live verification.
