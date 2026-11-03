# Style Goldfish report: 043 hub org entitlements, design.md

Mode: REVIEW. Persona: egm-style (technical copy editor). Read-only on the design.
Severity key: 🔴 Blocker · 🟡 Major · 🟢 Nit.

Totals: 🔴 0 · 🟡 11 · 🟢 18 (FeatureRange 🟡 6 / 🟢 12; DetailedRange 🟡 5 / 🟢 6).

The prose is mostly dry and direct. The main problems are terms that contradict the document's own rules ("UI tag" against G7, "refusals say premium" against G5/G7), a lifecycle sentence that cannot be parsed, names a new reader cannot resolve, and an allowlist and audit-actor field that are described differently in different places.

---

## FeatureRange (lines 1–391)

### 🟡 F1: The TO-BE implies user-visible refusals, which G5 and G7 forbid (L42)
"Refusals say 'premium' and name the feature." A reader takes this as user-facing copy. G5 (L64-65) limits the refusal to logs, debugging and direct API callers, and G7 (L70-74) says the UI shows nothing. Fix: "Server refusals carry `premium_required` and the feature key; the UI renders nothing (G7)."

### 🟡 F2: "Tag" has two meanings, and one contradicts G7 (L164, L168, L214-217, L328)
"Tag" means a cache-invalidation tag (L164, L214-217). It also appears as "layout load (UI tag only)" (L168) and "the UI tag ship[s]" (L328). G7 (L70) bans any "Premium" tag, and S3 renders no tag, so a reader can implement exactly what G7 forbids. Fix: write "UI feature list" (layout `entitlements.features`) at L168 and L328, and keep "tag" for cache tags only.

### 🟡 F3: Proper nouns a new reader cannot resolve, inside goals and acceptance criteria (L75-80, L129, L149, L234)
"FACES", "Bernibites" and "Pulse" are never defined. G8 and the Acceptance criterion depend on "FACES is unaffected", which a new reader cannot test. Fix: on first use, give a one-clause gloss with the org id ("FACES, org `<uuid>`, the production clinic tenant"; "Pulse, the hub's proactive-agent tick").

### 🟡 F4: The migration-lag rule does not parse (L221-222)
"resolve to 'no row' = Base **only after** enforcement is deployed — see Rollout; the enforcement release ships after the migration and backfill." The sentence says nothing about the behaviour before enforcement, and the "=" chain is hard to read. Fix: give one sentence per state: "Before enforcement: a missing table resolves to Base, and gates allow because the flag is off. After enforcement: a missing table is a lookup error (request fails; tick skips)." Use whichever states are actually intended.

### 🟡 F5: The gateway allowlist is described three ways (L252-255, L261-262, L526-528)
L252-255 lists handshake, health and status, `auth.refresh`, `channels.*`, WhatsApp QR login and two `myAgent` reads, with no `config.*`. L261-262 then adds `config.get` / `config.schema` in passing. L526-528 lists them together. Fix: define `BASE_GATEWAY_METHODS` once, as a list or table, and refer to it from the other places.

### 🟡 F6: The causal claim in Rollout step 3 is imprecise (L335-336)
"the hub emits them only after the backfill." By L291-292 and L571-574, the hub emits claims only when `ENTITLEMENTS_ENFORCED` is on. The backfill comes first by procedure, not by mechanism. Fix: "the hub emits claims only while `ENTITLEMENTS_ENFORCED` is on, and the flag is set only after the backfill."

### 🟢 F7: The header metadata does not match the body (L3-5)
"Final draft, pending egm-review" is contradictory, and Q2 (L99-102) is still open. "Date: 2026-10-28", but six decisions in the body are dated 2026-10-29. Fix: "Status: Draft for review"; set Date to the last revision.

### 🟢 F8: Filler "simply" (L57, L73, L385)
"simply switched off", "simply absent", "simply not rendered". The word adds nothing; delete it. The quoted owner phrase at L266 and L361-362 can stay.

### 🟢 F9: "within a stated time" with no time (L41-42)
The bounds appear only at L77-79. Fix: state them here, or write "within the bounds in Acceptance."

### 🟢 F10: "never resolves to an allowing answer" (L46)
The phrasing is awkward. Fix: "a failed lookup never grants."

### 🟢 F11: Vague rule statement (L53-54)
"AI is closed for Base orgs everywhere, unless a non-AI feature needs the path." Neither "closed" nor "the path" is defined. Fix: "Base orgs cannot reach any AI code path; a shared path stays open only where a non-AI feature depends on it (listed below)."

### 🟢 F12: Metaphor in place of a definition (L153)
"this is RBAC for the server, one level up." RBAC already runs on the server. The next sentence (L153-155) states the real distinction (member scope vs org scope), so delete the metaphor.

### 🟢 F13: "for one thing" introduces five items (L243-244)
The single thing is "channel transport", but the reader then counts five bullets. Fix: "They do: the gateway is the channel transport, used for:"

### 🟢 F14: Informal or jargon terms (L260, L272)
"`config.*` is the open edge" means "`config.*` is the unresolved case". "a blip never changes who gets replies" means "a hub outage does not change which accounts get replies".

### 🟢 F15: Unverifiable reuse claim (L348)
"Its vocabulary and audit-log shape were reused." No later section shows what was reused (the data model at L180-186 does not cite `capability_tiers`). Name the reused field names or delete the sentence.

### 🟢 F16: Hyperbole in rejections (L355, L378)
"every log line ambiguous" means "log lines carrying `planTier` ambiguous". "with nobody noticing" means "with no review step".

### 🟢 F17: Mixed spelling (L12, L141, L193; L534, L572)
"organisations" and "behaviour" sit next to US-spelled identifiers (`organizations`, `/settings/organizations`, `listAllOrganizationsWithMemberCounts`). Pick one variant. US spelling matches the code.

### 🟢 F18: "a determined user" (L101-102)
State the condition: "any user who reads the shared token from the browser."

---

## DetailedRange (lines 392–586)

### 🟡 D1: The route-contract step names two of six required sites (L438-441)
"and the remaining route counts … all six count sites … two of them are outside `src/lib/routes/`" asks the implementer to find four unnamed files. A step that breaks CI unless complete has to be specific. Fix: list all six paths.

### 🟡 D2: Unbounded audit task (L480-481)
"Audit each hub caller that catches model errors generically" has no list, no grep pattern and no done-criterion. S3 (L513-514) gives a re-runnable grep; this step should do the same. Fix: give the grep (for example, catch blocks around `generateText` / `streamText` / services importing `llm.ts`) and the current hit list.

### 🟡 D3: Exact identifiers deferred to "implementation time" (L490-491, L530-531)
The agent-studio prefixes and the gateway method names are both deferred. The allowlist is a security boundary, so "copied … at implementation time" leaves the design's main control undefined in the design. Fix: list the names now, and keep the re-check note as a verification step.

### 🟡 D4: The audit-actor field is described inconsistently (L553 vs L180, L185)
The backfill writes `set_by = 'launch-backfill'`, but L180 defines `set_by uuid` (profile), and `org_plan_events` uses `actor_profile_id`, not `set_by`. A reader cannot tell which column records the backfill actor or what type it has. Fix: name the column and the sentinel value consistently (for example, `actor_profile_id NULL` plus `note = 'launch-backfill'`). Correctness belongs to other reviewers; the wording has to agree with itself.

### 🟡 D5: References that need conversation context (L425, L430, L435, L502)
"the 041 `unnest` bug", "the owner's visual-feedback rule", "the sidebar icon row they pointed at" and "(the screenshot the owner sent)" all assume context a new reader lacks. Fix: replace each with its content (for example, "spec 041: mocked SQL hid a `unnest(${arr})` 22P02 error"), or delete the aside.

### 🟢 D6: "refuses with the premium message" (L455-456)
Under G7 there is no premium message. Fix: "returns 403 `{code:'premium_required', feature}`".

### 🟢 D7: List items without paths, next to a completeness claim (L505, L511, L513)
"the assistant orb / FloatingAssistant", "the doors FAQ-draft action" and "the reminder-personalization and Pulse settings" have no file paths, while every other bullet has one. L513 then calls the list "every client caller". Fix: add the paths.

### 🟢 D8: Rationale repeated from the Technical Plan (L403, L409)
"because hub prod builds run migrations automatically" repeats L379-380. "a new feature or plan is a reviewed PR" repeats L198-199. Cut the repeats or reference the earlier lines.

### 🟢 D9: "Merge S1 to S3" (L572)
This can read as "merge S1 into S3". Fix: "Merge S1, S2 and S3".

### 🟢 D10: Overclaim about TODO(handoff) markers (L568)
"Each open end also gets a matching `TODO(handoff)` in the code." Spend caps, the site "one agent" copy and per-method tiers have no code site. Fix: "Each open end with a code site also gets…"

### 🟢 D11: Launch order repeats Rollout with different granularity (L570-586 vs L325-337)
Two four-step sequences describe the same launch, and they differ in detail (Rollout has no gateway step; Launch order has no rollback). Keep one sequence and point to it from the other.
