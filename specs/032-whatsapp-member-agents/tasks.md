# Tasks: WhatsApp member agents and channel linking

**Plan**: [plan.md](plan.md). Gate T000 blocks everything.

- [ ] **T000** Owner approves spec.md (security-tagged, constitution V).

## S1 — hub (minion_hub → master)
- [ ] **T101** Test: an active personal agent with NULL gateway that is missing from the roster gets created, verified and bound; an active bound agent → no `agents.create`.
- [ ] **T102** `activatePersonalAgent`: create when the row is active but unbound and the agent is missing (`personal-agent-provisioner.ts:100`).
- [ ] **T103** Tests for `POST /api/gateway/whatsapp/member`:
  - verified member → `member:true`;
  - unverified / non-member / foreign-org account / account row on another gateway → `member:false` with a reason;
  - multi-gateway org with an unbound agent → `agent_not_ready`;
  - single-gateway org with an unbound agent → activated and `member:true`;
  - rate limit.
- [ ] **T104** Endpoint plus server-token allowlist entry (`resolve-identity.ts`).
- [ ] **T105** ChannelCard toggle `settings.memberAgents` (WhatsApp only) with hint text; Paraglide plus `i18n:compile`; `lint:design` and `lint:tokens`.
- [ ] **T106** Gates in the foreground (`bun run check`, focused vitest, design/token lint), then the PR. Owner merges.

## S2 — gateway (minion-ai → DEV)
- [ ] **T201** Research: list every org ledger / CRM / history write on the inbound WhatsApp DM path (FR-007 sites).
- [ ] **T202** Tests:
  - member DM → personal route with `ResolvedHubUserId` and no ledger/CRM writes;
  - non-member unchanged;
  - `replies:none` dropped;
  - group unchanged;
  - hub error → non-member;
  - TTLs yes 5 min / no 1 min;
  - agent missing from `agents.list` → a single "not ready" reply.
- [ ] **T203** `src/web/inbound/whatsapp-member.ts` (hub call plus TTL cache).
- [ ] **T204** Member-mode branch in the inbound access path; route override and `ResolvedHubUserId` in `on-message.ts`; skip the T201 writes.
- [ ] **T205** Decision logs with number fingerprints only.
- [ ] **T206** Gates (`pnpm vitest run` on touched tests plus `test/ci/`, `pnpm check`), then the PR. Owner merges.

## Rollout (after S1 deployed + S2 on prd)
- [ ] **T301** Turn on member mode for one FACES account. Run SC-001 (3 members), SC-002 (5 requests, 2 roles), SC-003 (customer replay) and SC-004 (removal ≤5 min) with the owner present. Record the evidence under `specs/032-whatsapp-member-agents/evidence/`.

## S3 / S4 / S5 — linking (after P1 is live)
- [ ] **T401** S3 hub: `link-session.svelte.ts` state machine plus callbacks; server-side pair start/poll on the card's gateway; foreign-org guard; dashboard status fix; remove `void serverId`.
- [ ] **T402** S4 gateway: refuse unregistered account ids; discard credentials on expected-number mismatch before any config or backfill write.
- [ ] **T403** S5: logout → hub notification to channel admins plus a "Needs re-link" state.

## P3 — open separate specs
- [ ] **T501** Account panel (who can speak / reply mode / reply-as).
- [ ] **T502** `channel_bindings` hub-mirror cutover.
- [ ] **T503** Resume `specs/2026-07-19-channel-scoping-fix-plan.md` P1–P4.
- [ ] **T504** Decide the fate of drafts gw #330 / hub #544 / meta #810.
