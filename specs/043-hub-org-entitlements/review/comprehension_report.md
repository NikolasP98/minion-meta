# Comprehension Goldfish review: 043 org entitlements design

Target: `specs/043-hub-org-entitlements/design.md`. Feature range: lines 1–391. Detailed range: lines 392–586.
Also read: `concepts_brief.md` (linked as the predecessor).

## What this proposes

Every org gets a plan, either Premium or Base. A missing plan row counts as Base. A list of gated features
lives in hub server code, with dotted keys (`ai`, `ai.chat`, `ai.proactive`, `marketplace`). An optional DB table
can override which plans unlock which features. One pure hub function decides whether a feature is allowed and
returns a reason.

The hub enforces this in four places:
- one wrapper around every model call;
- each background AI tick, which skips Base orgs;
- the assistant route and the marketplace APIs, which return 403 `premium_required`;
- the page layout, which hides AI pages and controls from Base orgs instead of showing a lock.

The gateway enforces it in two ways. First, the hub's gateway JWT carries `plan` and `features`, and a Base-org
connection may call only an allowlist of non-AI methods. Second, each channel account the hub serves to the
gateway gets an `aiEnabled` flag, and the gateway uses it to skip agent replies.

Platform admins change plans on a new `/admin/plans` page, and every change is audited. Rollout has four steps:
ship inert code, run an owner-run backfill (all orgs Premium except Bernibites), then turn on the
`ENTITLEMENTS_ENFORCED` env flag. Rollback is unsetting the flag.

## How the existing system works, per this document

Nothing in the hub or the shared DB says which orgs pay. Every org can use every AI feature. The only org-level
gates are module on/off rows (`app_modules`, missing row = on) and the business/personal kind policy.

AI runs on three paths:
1. hub server model calls through `getOpenRouterModel()`, which already knows the org;
2. hub cron ticks that loop over orgs;
3. browser-to-gateway WebSocket chat, which the hub never sees.

The gateway has no Postgres. It learns a connection's org only from a hub-signed JWT that lasts one hour. It
pulls channel-account config from the hub every 5 minutes. It also carries a dormant tier system and a separate
free-tier user system with its own `planTier` claim.

---

## Findings

### 🔴 Blocker

**B1. The design does not say whether hiding AI in the UI is behind `ENTITLEMENTS_ENFORCED`. As written, deploying S1–S3 hides AI from every org, FACES included.**
Lines 76, 270, 305–313, 327–329, 419–420, 446–447, 485–496, 572.

The design states the flag-off behaviour for several surfaces:
- `requireFeature` throws only when enforced (419–420);
- the model-call wrapper refuses only when enforced (446–447);
- `aiEnabled` is always `true` while the flag is off (270);
- JWT claims are emitted only when enforced (291–293).

The UI path is the exception. The layout returns `features` from `resolveEntitlements` (305, 485), and the route
guard and `hasFeature` hide anything missing from that list (309–313, 492–496). None of these mention the flag.

The launch order deploys S1–S3 *before* the backfill (572 → 575). At that point `org_plans` is empty, so by G1
("missing row = Base") every org resolves to Base. That would hide AI pages, the assistant orb and the email
summary for FACES and every Premium-to-be org. Line 572 says "no behaviour changes", and G8 (line 76) says
"FACES sees no change". I cannot reconcile those claims with the mechanism.

Related: line 329 says that with the flag off "isEntitled still computes and logs". Combined with line 223
("every denial … captured as PostHog `entitlement_denied`"), every pre-backfill AI call might emit a denial
event. The design does not say whether would-deny events are logged differently from real denials.

The design needs to say what `features` the layout returns while the flag is off. All features? The resolved
set? It also needs to say whether S3 must ship after the backfill.

### 🟡 Major

**M1. The rule for missing tables (migration lag) cannot be parsed, and it reverses the linked brief without saying so.** Lines 221–222.

The line reads: "resolve to 'no row' = Base **only after** enforcement is deployed". It never says what a
missing-table error (`42P01`) yields *before* enforcement. Two other rules apply in the same window:
- request-path loader errors propagate (line 219), which would fail the admin page and the `(app)` layout;
- the layout catches errors and returns Base-shaped features (line 486), which hides AI for everyone.

The linked brief (decision 2, brief line 135) says the opposite: "tables missing = no plan = all features".
Decision C later changed that, but this design does not say it supersedes the brief. A reader holding both
documents gets two answers.

**M2. The design is unclear whether `features` is the expanded key list, and checking only the `ai` parent ignores child overrides that the evaluator supports.**
Lines 61, 91–92, 230–231, 292, 412–414, 495.

The JWT `features` claim is "the resolved allowed keys" (292). The design never says whether a Premium org gets
`['ai','marketplace']` or the expanded `['ai','ai.chat','ai.proactive','marketplace']`. `hasFeature` on the
client does its own walk up the dotted parents (495), which suggests the list is not expanded. The gateway
allowlist and the hub model-call wrapper both test only `ai` (230–231).

The evaluator tests pin "an override disables a child" (414). But if an override sets `ai.chat = false` while
`ai` stays granted, the gateway still allows `chat.send`. Line 61 claims "the gateway allowlist already covers
`chat.send`" for the `ai.chat` gate, which is only true at the `ai` level. The Non-Goal at 91–92 hints at this
limit. The design should state plainly that child overrides are honoured on the hub only, and name which
surfaces respect them.

**M3. The design never says how `plan_features` gets written.** Lines 182–184, 214–216, 86, 187–189.

`plan_features` is "optional overrides … Empty at launch". There is a global cache tag "for `plan_features`
edits". Yet the admin page only changes an org's plan (G6, 319–321), and a rule editor is a Non-Goal (86).
Several questions are left open:
- Who writes these rows?
- Do they arrive by SQL, by script, or by a future UI?
- Which code path invalidates the global tag when they change?
- Is a direct SQL edit audited?

**M4. The column types contradict each other: `set_by` is a uuid, but the backfill writes a string into it.** Lines 180, 185, 553.

`org_plans.set_by` is `uuid` (profile). `org_plan_events` uses `actor_profile_id`. The backfill writes
`set_by = 'launch-backfill'`. Either the column is text, or the backfill needs a real profile id or NULL. The
design also does not say which actor column the backfill's audit rows fill.

**M5. The design contradicts itself on whether sessions, and other non-transport methods, stay available to Base orgs.**
Lines 56–57, 252–257, 261–262, 309, 352–353, 490, 527–528.

The rejected alternative at 352–353 says the gateway JWT "powers non-AI gateway admin (channels, **sessions**)",
"things Base orgs keep". But the allowlist (252–257, 527–528) does not include session methods, and S3 hides
`/sessions` as an AI area (309, 490).

G4 also says Base connections may call "only the channel-transport methods" (56). The allowlist then adds
non-transport reads (`myAgent.feedToday`, `myAgent.emailBody`) and `config.get` / `config.schema` (261, 528).

A reader cannot tell which list is authoritative, or whether sessions count as AI.

**M6. The model-call wrapper's coverage depends on `currentAiUsageScope()`, which the design never explains.** Lines 231, 446–449.

The single wrapper is presented as covering "every hub model call … without listing routes" (448–449). But it
enforces only when `currentAiUsageScope().orgId` is present. With no org in scope, the call is "not enforced,
logged" (231).

The design does not explain:
- what sets that scope;
- whether every request handler and tick sets it today;
- which callers run without it.

If some AI routes never set the scope, the "one wrapper covers everything" claim fails silently. A reader cannot
judge coverage without this.

**M7. The route-contract step assumes the reader already knows the six count sites.** Lines 438–440.

The step says "Add `/admin/plans` to `UI-ROUTE-CONTRACT.md`, `route-access-policies.ts` and the remaining route
counts … all six count sites … two of them are outside `src/lib/routes/`". Only two of the six are named. An
implementer cannot follow this step without prior knowledge. List all six paths.

**M8. The design does not say which path the email summary and draft-reply calls take, so the reader cannot tell which gate stops them.**
Lines 254–255, 259, 501–502, 515–517.

`myAgent.emailSummary` and `myAgent.emailDraftReply` are kept off the gateway allowlist (255). Line 515 says
`my-agent-rpc.ts` handles both a 403 and a FORBIDDEN, which implies two possible paths. If any of these calls go
browser → hub → gateway through `gatewayCall` with the shared token, two things follow:
- they carry no `features` claim, so the gateway does not gate them (259);
- no hub gate is listed for that route.

Name the path, and name the gate that stops a Base org on it.

**M9. Several project-specific mechanisms that the safety argument relies on are undefined.** Lines 230, 272, 99–100, 214–215.

- **"admin-scope bypass"** (230, 529): the gate is placed before it, but the design never says what it bypasses
  or who holds admin scope.
- **"its existing never-silently-disable rule"** (272): the whole hub-outage argument for channel replies rests
  on this rule, and it is neither defined nor linked.
- **The "channel mirror"** (233, 267–268): partly explained (pulled on start and every 5 min), but `getMirrorEntry`
  semantics on a miss are only implied.
- **The `cached()`, `keys.hub()` and `tenantDomain()` helpers** (214–215): the invalidation guarantees
  ("immediate") depend on how these work across serverless instances, and no link is given.

### 🟢 Nit

**N1. Several org, product and module names are undefined:** Bernibites, FACES, Pulse, "doors" (door FAQ drafts,
door follow-ups), brains reconcile, `myAgent` and the personal inbox, Jev (in the brief), EGM and `egm-review`
(line 4). One glossary line each would do. Lines 4, 29–30, 75, 126, 248–249, 254, 449.

**N2. Some references point at context the reader does not have:**
- "the 041 `unnest` bug" (425);
- "the sidebar icon row they pointed at" (435);
- "(the screenshot the owner sent)" (502);
- "spec 042 S1" (88, 262), which has no link.

**N3. The reason values do not line up with the pure evaluator.** G3 lists `lookup_error` as an `isEntitled`
reason (51–52), but `isEntitled` is pure with no I/O (209), so it cannot produce a lookup failure. That reason
must come from `resolveEntitlements`. The brief's `no_plan_default` and `org_unknown` reasons were dropped
without comment. The evaluator tests also include "missing row → Base" (413), which is a resolution concern.

**N4. "UI tag" is left over from the earlier design.** It appears in the Shape diagram (167, "layout load (UI tag
only)") and in Rollout (328, "the UI tag ship"). It contradicts G7 (no tag), so a reader expects a Premium tag
that no longer exists.

**N5. Q2 is still open in a document marked "Final draft".** "Default in this draft" (101) leaves it unclear
whether the shared-token bypass is accepted. Mark it RESOLVED or OPEN, the way Q1 and Q3 are marked.

**N6. Some lists are deferred to implementation time.** These include the allowlist's exact method names, "the
WhatsApp login methods", "handshake", and the agent-studio route prefixes (490–491, 527–531). Fine as a plan,
but the reviewed allowlist is not the shipped one.

**N7. S2 omits the feature key for autonomous agents.** S2 says to put `requireFeature` on autonomous-agent
actions (469–470) without naming the key. The enforcement table (234) implies `ai.proactive`.

**N8. The staleness wording glosses over two details.**
- The acceptance criteria say the hub change is "immediate" (78, 114). An already-open tab keeps its layout data
  until it navigates (acknowledged only at 314).
- "the hub already refreshes via `auth.refresh`, which picks up the new plan" (298–299) does not say who mints
  the new JWT or when the refresh is triggered.
