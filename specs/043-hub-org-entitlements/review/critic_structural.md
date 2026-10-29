# Structural review — 043 Org entitlements, design.md lines 1–391

Reviewer: Structural Goldfish (EGM), mode REVIEW.
Standard: `feature-spec-standard.md` (requires Problem Statement, Goals & Non-Goals, Proposed Architecture, Alternatives Considered, Risks & Mitigations).
Linked file read: `concepts_brief.md` (the only link in range).

Heading map of the range: H1 title → H2 Overview, The Problem, Goals, Non-Goals, Open Questions, Critical User Journeys (6 × H3), Technical Plan (Architecture) (12 × H3), Alternatives Considered (6 × H3). No skipped heading levels. Lists, tables and the code fence are well-formed. The one link (line 6) resolves.

Counts: 🔴 1 Blocker · 🟡 8 Major · 🟢 10 Nit

---

## 🔴 Blockers

### B1 — There is no Risks & Mitigations section (whole range)
The standard makes this section mandatory: the spec must name its failure modes, security implications and scale limits, and say how each is handled. The design has no such heading. The risks are real but scattered across five sections, so a fresh reader cannot list them:
- the shared-token connection that skips enforcement, which a determined user can reach (Open Questions Q2, lines 99–102);
- model calls with no org in scope are not enforced (table, line 231);
- a channel account missing from the mirror is not enforced (line 274);
- `config.*` writes can change agents and are left open (lines 260–262);
- the Gmail auto-labeler is AI and is not gated (lines 285–287);
- the behaviour of the migration lag window is unclear (lines 221–222; see M2);
- staleness bounds (1 h JWT, 5 min mirror; lines 77–80, 275, 298).

The predecessor's "Design risks" list (concepts_brief §6–16) is not carried forward or closed out item by item. One brief consequence disappears completely: under decision E, Base orgs stop getting new embeddings, so brain search and CRM similarity only cover data indexed before the downgrade. The fix is to add `## Risks & Mitigations` (after Technical Plan or after Alternatives). It needs one row per risk, giving the risk, its severity, its mitigation or accepted status, and its `TODO(handoff)` or proposal pointer. That row should also list every path that is not enforced in one place, since G1 (lines 46–47) promises fail-closed behaviour.

---

## 🟡 Majors

### M1 — The Shape diagram is stale against the 2026-10-29 steers (lines 157–174, also line 328)
- The diagram labels the layout load "(UI tag only)" (line 168), and Rollout line 328 says "the UI tag ship". G7 (lines 70–74) and the UI section (303–315) say there is no tag at all; the UI hides controls and 404s pages.
- The diagram does not show the two enforcement points the Technical Plan calls the chokepoints: `usageMiddleware`, which handles every hub model call (line 231), and the channel `aiEnabled` path through `/api/internal/channels/resolved` → gateway mirror → `dispatchReplyFromConfig` (lines 233, 264–275).
- The gateway box shows a plain FORBIDDEN and does not show the `BASE_GATEWAY_METHODS` allowlist (lines 252–257).

The summary picture therefore describes the earlier design. Redraw it so that each row of the Enforcement table appears once.

### M2 — Dangling cross-reference and unclear policy for the migration lag (lines 221–222)
The line reads "resolve to 'no row' = Base **only after** enforcement is deployed — see Rollout". Rollout (325–337) never mentions `42P01` or tables being missing, so the reference points nowhere. The sentence also never says what happens *before* enforcement. The predecessor (brief, settled point 2) said that missing tables mean no plan, which means all features. The design changes that silently. State both states explicitly and either fix the reference or remove it.

### M3 — The design departs from its predecessor without saying so (lines 6, 52, 194)
Line 6 says decisions A–F are resolved in the brief, but the design contradicts the brief in three places without marking any of them:
- **The set of reasons got smaller.** G3 (line 52) allows `granted | not_in_plan | rule_false | lookup_error`. The brief (§14, settled point 2) required a separate `no_plan_default` (plus `org_unknown`). Without it, the admin's effective-features panel can no longer show "no row, so Base" as distinct from "the plan excludes this".
- **Org creation.** Brief decision C says "org creation writes a Base row". Line 194 says there is "no creation hook".
- **Decision E is never cited.** Decisions A, B, C, D and F are each cited by letter (lines 89, 289, 354, 367, 375, 387), but E is not. Its stated consequence (lost embeddings) is missing; see B1.

Add a short "Changes since concepts brief" note, or cite each change where it occurs.

### M4 — Open Questions mixes settled and unsettled items under a "Final draft" status (lines 4, 94–104)
Q1 and Q3 are marked RESOLVED. Q2 is unresolved: the text calls it the "Default in this draft", and it is a security bypass. Meanwhile the status line (line 4) says "Final draft". Either resolve Q2 (owner decision plus date, like Q1 and Q3) or keep the status at Draft. Resolved questions belong under Goals/decisions, and the Q2 bypass belongs in the Risks section (B1).

### M5 — The CUJs do not cover two of the gates that Acceptance requires (lines 106–149 against 77–80)
The Acceptance bullet requires two things that no CUJ walks through:
- a Base org's WhatsApp message is stored but gets no agent reply;
- the gateway refuses a dashboard method after the JWT refreshes (the G5 FORBIDDEN frame).

No CUJ covers a direct hub AI API call returning 403 `premium_required` through `usageMiddleware` either. CUJ 4 only covers marketplace. Add a CUJ for the channel reply, one for the gateway dashboard, and one for the hub AI API, so that every G4 bullet traces to a journey.

### M6 — `plan_features` has no write path (lines 182–184, 188–189, 216, 317–323)
The data model defines `plan_features` with `updated_by` / `updated_at`. Caching adds "one global tag for `plan_features` edits", and the security rule routes all writes through `requireAdmin`. Yet neither the Admin page section nor G6 offers any way to edit overrides, and Non-Goals (line 86) says rules change by PR. A reader cannot tell whether overrides are edited by hand in SQL, through a future admin page, or never. Name the intended writer, or mark the table as reserved and drop the invalidation tag.

### M7 — Code paths do not say which repository they are in (lines 28–36, 230–235, 279–287, 291–296)
Hub paths (`src/server/llm.ts`) and gateway paths (`src/gateway/server-core/server-methods.ts`, `src/auto-reply/...`, `src/infra/message-ledger.ts`) all start with `src/`. The rule for repo roots only appears at line 394, after the review range. Line 34 lists `gateway-jwt.service.ts` (a hub file) inside a bullet about the gateway. Prefix the paths with `hub:` or `gateway:`, or move the repo-root sentence into the Technical Plan intro.

### M8 — Audit column names and types conflict (lines 180, 185; collides with line 553)
- `org_plans.set_by` is a `uuid` (profile) (line 180).
- `org_plan_events` has `actor_profile_id` and no `set_by` (line 185).
- The backfill (line 553, just outside the range but defined by this data model) writes `org_plan_events` with `set_by = 'launch-backfill'`. That column does not exist on the table, and the value is a string being written to what the data model types as a profile uuid.

Fix the data model to show how a non-human actor is recorded: a nullable actor plus a `source` text, or a system profile id.

---

## 🟢 Nits

- **N1 (line 5).** The date says 2026-10-28, but the body cites owner steers dated 2026-10-29 (lines 53, 70, 96, 103, 241, 264, 277, 382). Bump the date or add a revision line.
- **N2 (lines 77–80).** The Acceptance criterion is an unnumbered bullet inside Goals. Give it its own H3/H2 or a G-number. It is also repeated, with different wording, in the Launch order (line 577).
- **N3 (lines 241, 264, 277, 341–387).** H3 heading styles are mixed. Some are noun phrases ("Shape", "Data model"); others are full sentences with an attribution in brackets ("Channel AI is configuration, not a live check (owner, 2026-10-29)"). The Alternatives H3s mix "(decision B)" with "(owner, 2026-10-29)". Pick one convention.
- **N4 (lines 343–390).** The Alternatives labels are inconsistent: Rejected, Deferred, Replaced, "Rejected for now", "Rejected after the owner asked for it". Normalize them or define each label.
- **N5 (lines 350–365).** The subsection "How the gateway learns an org's plan" also holds items that answer a different question: block the whole gateway, block only `chat.send`, and tie the ledger to the plan. Those are about the scope of gateway enforcement. Split them into their own H3.
- **N6 (lines 228–235).** The Enforcement table rows are not grouped by feature (`ai`, `ai`, `ai.chat`, `ai`, `ai.proactive`, `marketplace`). Row 1 also uses `BASE_GATEWAY_METHODS` before line 252 defines it.
- **N7 (lines 180–185).** Data model notation is inconsistent. Some columns have types (`org_id uuid`, `plan_key text`); others have none (`updated_by`, `updated_at`, `id`, `at`, `note`).
- **N8 (lines 52, 63–64, 300).** The words "reason" and "code" carry three meanings. G3 `reason` is an evaluator enum. The hub body uses `code: 'premium_required'`. The gateway uses `details.reason: 'premium_required'`. G5 says the gateway frame has "the same `reason`" as the hub, but the hub has no `reason` key. Align the vocabulary or add a one-line mapping.
- **N9 (line 112).** CUJ 1 lists the features switched off as `ai.chat`, `ai.proactive`, `marketplace` and leaves out the `ai` group key. The gateway and `usageMiddleware` actually check `ai` (lines 230–233).
- **N10 (lines 325–337).** "Rollout" names only a "Release 1". It overlaps the later "Launch order" (570–586) and diverges from it: Rollout step 3 says the gateway can ship "any time before or after", while the Launch order fixes it at step 2. The SDLC contract also asks for a labelled DELTA (transitions plus proving tests); the range labels AS-IS and TO-BE (lines 22, 41) but has no DELTA marker or pointer to Detailed Implementation.
