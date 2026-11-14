# Tasks: Gateway chat events respect agent assignment

Spec: [spec.md](./spec.md) · Plan: [plan.md](./plan.md). One draft PR against gateway `DEV`.

- [ ] T000 BLOCKED: do not start T002–T004 until the hub token carries the user's real agent list and request methods check the session key (see spec.md "Review outcome")
- [ ] T001 List the session key shapes non-admin hub users chat on; confirm each parses to an agent (stop and report if not)
- [ ] T002 Failing tests D1–D4 in `server-broadcast.test.ts`
- [ ] T003 Session-key fallback, `AGENT_BOUND_EVENTS`, normalised comparison, agent id derived once per broadcast
- [ ] T004 `pnpm vitest run` on the test file and `test/ci/`, `pnpm check`, `pnpm tsgo`; draft PR
- [ ] T005 [OWNER] Approve the spec; check SC-003 on the dev gateway; merge
