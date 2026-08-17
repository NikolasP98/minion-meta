---
id: 2026-08-17-gw-whatsapp-cloud-template-fallback-spec
title: "WhatsApp Cloud — catch the 24h window-closed error and fall back to an approved template (opt-in, at-most-once)"
stage: spec
status: draft
pass: 1
created: 2026-08-17
updated: 2026-08-17
proposal: 2026-08-17-gw-whatsapp-cloud-template-fallback
verdict: pending
repos: [minion]
tags: [logic, test]
type: feature
---

# WhatsApp Cloud — auto-fallback to an approved template when the 24h window is closed

**Owner surface:** `minion` (gateway, branch `DEV`) — `extensions/meta-graph/src/channels/whatsapp-cloud/`
(the send path, the per-account config, the tests) plus the extension's own docs.

**Shared-substrate surface (⚠️ alert, additive only):** `extensions/meta-graph/src/graph-client.ts` and
`src/types.ts` — `graphSend` is the **single send primitive shared by all three channels in the plugin**
(whatsapp-cloud, messenger, instagram). Per operator memory `meta-graph-channels`, the plugin is
deliberately ONE bundle: *"messenger+instagram SHARE one `messaging-platform.ts` factory … whatsapp-cloud
differs (changes[] + messaging_product + 24h/templates)"*. So the **window/template logic must NOT go into
`graphSend`** — only the error *typing* may, and only additively. §4 treats that as an alert, not a footnote.

**Consumer surface (read-only, production code never edited here):** `minion/src/channels/`. Per AGENTS.md
"Cross-Project Impact Zones", a channel-extension change touches `minion/extensions/<channel>/` +
`minion/src/channels/`; this spec asserts the second half is **read-only** — meta-graph channels are
registered imperatively by the plugin (`api.registerChannel()`), and operator memory records *"Zero core
gateway changes"* for the original build. Any need to edit `src/channels/` is a finding (§4).

**Gate conventions:** [`2026-08-17-sdlc-phase-gates-scoring-spec`](2026-08-17-sdlc-phase-gates-scoring-spec.md)
§4b — slices are tagged `logic` / `test`. Red-state TDD (G3) is mandatory: the mocked-131047 test is written
and shown failing against today's code before the fallback lands. **No UI governance applies** — zero
`.svelte` files, zero `lint:design`, zero `lint:tokens`, in any slice (template management UI is the
proposal's own exclusion, §5).

**Prior art consulted.** `rg -li 'meta-graph|whatsapp-cloud' specs/ proposals/` → seven specs mention the
extension, none specifies this behavior: `2026-07-04-meta-business-integration` (§38, §172) treats meta-graph
messaging as built-but-parked behind app review and pins **Graph v23.0**; `2026-06-13-plugin-sdk-recon-and-improvement-report`
describes how extensions register channels; `2026-07-17-ig-ad-attribution-spec` and
`2026-07-05-meta-post-thumbnail-mirroring` touch the same Meta app from other angles;
`2026-05-27-whatsapp-qr-pairing` and `2026-07-20-whatsapp-sync-status-spec` are about the **Baileys**
`whatsapp` channel, which is a *different channel* — memory `meta-graph-channels`: *"WABA is its own channel,
NOT a mode inside Baileys."* Nothing to supersede. The authoritative description of the current code is
operator memory `meta-graph-channels`, whose `known-limits` line states the gap this spec closes:
*"24h-window auto-template-fallback NOT wired (sendWhatsAppTemplate exists; free-form works inside window)"*,
and whose gotcha list names the trap this spec must respect: *"WhatsApp 24h customer-service window → must
fall back to approved template messages after 24h."*

---

## 0. Product

From the approved proposal `2026-08-17-gw-whatsapp-cloud-template-fallback`, verbatim:

> ## Problem
>
> extensions/meta-graph/src/channels/whatsapp-cloud/api.ts:5 — sendWhatsAppTemplate exists as a manual
> escape hatch; no automatic catch of the window-closed error code with template retry (the Phase 3 TODO).
>
> ## Definition of done
>
> Wrapper catches the window-closed error from graphSend and retries via sendWhatsAppTemplate; unit test
> mocks the error and asserts the fallback fires.
>
> ## Out of scope
>
> Template management UI.

**What the user experiences today.** A customer messages the business on WhatsApp, the agent answers, the
conversation goes quiet. More than 24 hours later something needs to reach that customer — a booking
confirmation, an alert, a human operator's reply typed into the hub. The gateway calls `graphSend` with a
free-form text message, Meta rejects it (the customer-service window is closed), and the send fails. The
message is simply **not delivered**. The escape hatch to do this correctly — `sendWhatsAppTemplate` — is
already in the file, but nothing calls it automatically, so the correct behavior requires a human who
happens to know it exists.

**The honest scope of the fix, stated up front, because a naive reading of the proposal produces a broken
feature.** A WhatsApp template is **not a transport for arbitrary text**. It is a message body Meta approved
in advance, in a named, versioned, language-tagged form, whose only mutable parts are declared parameters.
You cannot take an agent's free-form reply and "send it as a template". So this feature cannot mean *"deliver
the same message by another route"*. It means:

> When the window is closed, send the account's configured, pre-approved **re-engagement notification** so the
> customer knows to reply — which reopens the window — and make the undelivered original **loud and
> attributable** instead of silent.

Everything in §2 follows from that sentence. An implementation that pretends the original text got delivered
would be a worse defect than the one being fixed. A spec that let the implementer discover this in hour six
would have failed.

**Three properties this feature must have, because they cost real money and real deliverability if it does
not.** Template messages outside the window are **billed**, they are governed by per-user marketing limits,
and abusing them degrades the WABA's quality rating (which throttles the business's own messaging tier):

1. **Opt-in, default off.** Upgrading the extension must never start sending billed messages that nobody
   configured. There is also nothing sane to send by default: no template name exists until a human creates
   and Meta approves one.
2. **At-most-once, bounded.** One re-engagement notification per recipient per configured interval — never
   one per reply block, never a retry of a retry, never a loop.
3. **Precise detection.** Only a definitive window-closed error code triggers it. Not a timeout, not a 5xx,
   not an expired token, not "recipient is not a WhatsApp user".

## 1. Assumptions, and the five questions that decide the shape of S2–S3

`minion/` is **not** checked out in this workspace (`ls -d minion` → "No such file or directory"; the
meta-repo `.gitignore` excludes subprojects). Every file path, symbol, and line number below is carried from
the proposal and from operator memory `meta-graph-channels`, **not read from disk** — see ⚠️ A5. S0
re-verifies all of it in under an hour.

Five load-bearing unknowns, all settled by S0:

1. **What does `graphSend` throw?** ⚠️ A1. If it already throws a typed error carrying the numeric Graph
   `code`, S1 collapses into a confirming test (**branch A**). If it throws a bare `Error` whose message is a
   stringified body, or returns a non-throwing result union, the numeric code must be surfaced first
   (**branch B**) — you cannot classify what the call site cannot see, and string-matching a localized,
   Meta-owned message is not classification.
2. **What is the exact window-closed error code, on the pinned Graph version?** ⚠️ A2. I expect
   **`131047`** ("Re-engagement message" — *"more than 24 hours have passed since the customer last replied to
   this number"*). **I am fairly but not fully confident of that number, and the legacy On-Premises code
   `470` is a different, older surface.** This spec therefore does **not** authorize hardcoding a remembered
   constant: S0 verifies against Meta's current Cloud API error reference **and** a captured real error body
   (§6 step 3 produces one), and S2 makes the matched set **config-overridable** so a Meta-side change does
   not require a gateway release. Codes that must **not** match: `131026` (message undeliverable / recipient
   cannot receive), `131051` (unsupported message type), `190` (token expired), `4`/`80007` (rate limits).
3. **Where is the reply actually sent from?** ⚠️ A3. The wrapper must sit on the whatsapp-cloud send path
   (`api.ts` / `adapter.ts`), not in `graph-client.ts` (shared, §4) and not in `channels/shared.ts` (the
   platform-generic inbound processor, also shared with messenger/instagram). S0 names the exact function the
   adapter calls to deliver an agent reply, and every *other* outbound call on that path (reactions, read
   receipts, typing indicators) that must be **excluded** — memory records the reaction sequence 👀→🧠→✅ on
   the sibling WhatsApp channel; sending a billed template because an emoji reaction failed would be absurd.
4. **Does `sendWhatsAppTemplate` already accept a language code and components, and does it use the same
   token/account resolution as the text path?** ⚠️ A4. Per memory, the per-account token is resolved
   vault-first via `resolveAccessToken()` → `secrets.getScoped("meta_access_token", "<channelId>:<accountId>")`
   (e.g. `whatsapp-cloud:default`). The fallback must reuse that resolution verbatim — a second token path is
   a security and support defect.
5. **How many blocks does one agent reply produce on this channel?** ⚠️ A6. If replies are dispatched as
   multiple blocks, N failing blocks must still produce **one** notification (S3's dedupe), or the first
   long reply after a quiet day bills the business N times.

### Slice 0 — recon (≤ 60 min; prepend to S1, not counted as a slice)

Run from a checkout of `minion` on branch `DEV` (AGENTS.md Project Map). Read `minion/.dmux-hooks/CLAUDE.md`
first, as AGENTS.md requires for that subproject.

```bash
cd minion

# a. The reported site and the existing escape hatch (A3, A4)
sed -n '1,80p' extensions/meta-graph/src/channels/whatsapp-cloud/api.ts   # :5 = sendWhatsAppTemplate
rg -n 'sendWhatsAppTemplate|sendWhatsAppText|graphSend' extensions/meta-graph/src
rg -n 'reaction|markAsRead|read_receipt|typing' extensions/meta-graph/src/channels/whatsapp-cloud
rg -n 'resolveAccessToken|getScoped' extensions/meta-graph/src           # the ONE token path (A4)

# b. What graphSend throws (A1) — the branch decision
rg -n 'export .*graphSend' -A 40 extensions/meta-graph/src/graph-client.ts
rg -n 'graphSend' extensions/meta-graph/src/channels/messaging-platform.ts \
      extensions/meta-graph/src/channels/shared.ts                       # the OTHER consumers (§4)
rg -n 'class .*Error|instanceof Error|catch \(' extensions/meta-graph/src

# c. Config shape + the four config/lifecycle gotchas memory warns about
sed -n '1,120p' extensions/meta-graph/src/channels/whatsapp-cloud/config.ts
rg -n 'SECTION|accounts|phoneNumberId|wabaId' extensions/meta-graph/src/channels/whatsapp-cloud/accounts.ts
rg -n 'configSchema|MetaGraphConfigSchema' extensions/meta-graph/manifest.ts
rg -n 'graphVersion|v23' extensions/meta-graph/src                       # the pinned version

# d. Test conventions — memory: run from minion ROOT, not the subdir
ls extensions/meta-graph/src/**/*.test.ts
rg -n 'project|extensions' vitest.config.* vitest.workspace.* 2>/dev/null
cat extensions/meta-graph/package.json
ls extensions/meta-graph/README.md extensions/meta-graph/*.md 2>/dev/null

# e. Reply-block count on this channel (A6)
rg -n 'dispatch|block|chunk|split' extensions/meta-graph/src/channels/shared.ts | head -30

# f. Is this bug class unique to whatsapp-cloud? (sweep → proposal, never a fix here)
rg -n 'TODO|FIXME|Phase 3' extensions/meta-graph/src
```

Then, **outside the repo**, resolve A2: read Meta's current Cloud API error-code reference for the
re-engagement / window-closed error on the pinned Graph version, and record the exact `code`, the
`error_data.details` wording, and whether a distinct `error_subcode` accompanies it.

**Six answers that must be written into the PR description**, one sentence each: (1) branch **A** or **B**
for the error typing; (2) the verified window-closed code(s), with the reference URL and, if available, a
captured real body; (3) the exact function the wrapper wraps, and the outbound calls explicitly excluded;
(4) whether `sendWhatsAppTemplate` needs signature changes and that it reuses `resolveAccessToken`;
(5) how many sends one agent reply can produce; (6) whether the same missing-fallback gap exists in
messenger/instagram (it should **not** — the 24h window is WhatsApp-specific; if S0 finds window logic
leaking into the shared factory, that is a finding, §4).

**Stop condition:** if S0 finds that classifying the error requires editing `graphSend`'s *behavior* (not
just its thrown type) in a way that changes what messenger/instagram see, stop and return the spec — that is
a three-channel blast radius and a human scope decision, not an implementation detail.

## 2. Approach — four vertical slices

```
S0 (recon) ─▶ S1 (typed Graph error: the code becomes visible at the call site)
                 └─▶ S2 (per-account fallback config: opt-in, validated at start, default OFF)
                        └─▶ S3 (the wrapper: classify → at-most-once template send → loud undelivered original)
                               └─▶ S4 (diagnostics, docs, handoff ledger, sweep)
```

**S1 + S2 are prerequisites, not padding.** Without S1 the wrapper cannot tell `131047` from `131026`;
without S2 it has no template to send and would either crash at send time or invent one. **S3 alone is the
proposal's definition of done** — if S0 lands on branch A and the config surface turns out to be trivial,
S1–S3 should ship as one PR; say so in the PR rather than splitting for the sake of the spec.

---

### S1 — Make the Graph error code visible at the call site

**Tags:** `logic`, `test` · **Estimate:** branch A 2–3 h (confirming tests only) · branch B 4–6 h

**Goal:** a failed `graphSend` produces a value from which a caller can read the numeric Graph `code`,
`error_subcode`, `error_data.details`, and `fbtrace_id` — **without changing what any existing consumer
observes**.

**Do:**

- **Branch A (already typed).** Add tests that pin the contract (the code survives to the caller; a non-JSON
  body does not crash the parse) and move on. Do not refactor a working error path to satisfy a spec.
- **Branch B (needs typing).** Introduce one narrow error class in the substrate — e.g.
  `class GraphApiError extends Error` carrying `status`, `code`, `subcode`, `details`, `fbtrace_id`, and the
  raw body string (**truncated**, and never logged wholesale — §S4). Constraints:
  - **`extends Error`, message preserved.** Memory records messenger + instagram going through the same
    `graphSend`; any consumer doing `catch (e) { log(e.message) }` or `instanceof Error` must behave exactly
    as before. This is what makes a shared-substrate change safe (§4).
  - **Additive only.** No signature change to `graphSend`, no new required parameter, no change to the
    success path, no change to *when* it throws — only *what* it throws.
  - **Parse defensively.** Meta can return HTML, an empty body, or a proxy error. A malformed body yields a
    `GraphApiError` with `code: undefined` — never a thrown parse error, and never a **guessed** code.
    "Unparseable" must be distinguishable from "not the window error", because S3 must not fall back on the
    former.
  - **No `any`, no `@ts-nocheck`** (AGENTS.md house rule).

**Files:** `extensions/meta-graph/src/graph-client.ts`, `extensions/meta-graph/src/types.ts` (the error type,
if the repo keeps types there), `extensions/meta-graph/src/graph-client.test.ts` (new or appended). No file
outside `extensions/meta-graph/`.

**Definition of done (machine-checkable):**

```bash
cd minion   # memory meta-graph-channels: run from ROOT — vitest roots on cwd
npx vitest run --project extensions extensions/meta-graph
#   graph-client.test.ts:
#   - a mocked 400 with a well-formed Meta error body → thrown value exposes the numeric code, subcode,
#         details and fbtrace_id
#   - the thrown value is `instanceof Error` and its .message still contains Meta's message text
#         (backward-compat for messenger/instagram consumers)
#   - a mocked non-JSON / empty / HTML body → a GraphApiError with code undefined; NO parse throw,
#         NO guessed code
#   - a mocked 200 → unchanged success return (no behavior change on the happy path)
pnpm tsgo && pnpm check
rg -n ': *any|@ts-nocheck' extensions/meta-graph/src/graph-client.ts     # → ZERO hits
rg -n '131047|template' extensions/meta-graph/src/graph-client.ts       # → ZERO: no window/template
                                                                        #   logic in the shared primitive
git diff --name-only <base>...HEAD | rg -v '^extensions/meta-graph/'    # → EMPTY
```

---

### S2 — Per-account fallback config: opt-in, validated at start, default OFF

**Tags:** `logic`, `test` · **Estimate:** 4–6 h

**Goal:** an operator can declare, per WhatsApp Cloud account, the approved template to send when the window
is closed — and a gateway with no such declaration behaves **exactly as it does today**.

**Do:**

- **Config lives under the channel's own account section**, alongside `phoneNumberId` / `wabaId`:

  ```jsonc
  // ~/.minion/gateway.json
  "channels": {
    "whatsapp-cloud": {                     // ⚠️ hyphen: the key MUST equal the channel id
      "accounts": {
        "default": {
          "phoneNumberId": "…", "wabaId": "…",
          "windowClosedFallback": {
            "enabled": false,               // DEFAULT — nothing is sent until a human opts in
            "template": {
              "name": "reengagement_notice",
              "languageCode": "es",         // Meta requires an exact approved language tag
              "components": []              // optional; shape mirrors sendWhatsAppTemplate's existing param
            },
            "minIntervalMinutes": 1440,     // at-most-once guard (S3); default 24h
            "errorCodes": [131047],         // OPTIONAL override; empty/absent ⇒ the verified default (A2)
            "includeMessageExcerpt": false  // DEFAULT off — see S3's excerpt rules
          }
        }
      }
    }
  }
  ```

- **Respect the four config/lifecycle gotchas that crash-looped prod before** (operator memory
  `meta-graph-channels`, "FOUR CONFIG/LIFECYCLE GOTCHAS"):
  1. **The config key must equal the channel id** — `channels["whatsapp-cloud"]` (hyphen), not
     `channels.whatsappCloud`; `src/config/validation.ts` rejects unknown channel ids. Keep
     `accounts.ts`'s existing `SECTION = "whatsapp-cloud"`.
  2. **Do not move these settings under `channels.meta`** — `"meta"` is not a channel and is rejected.
  3. **Only if you add or change *plugin*-level config** (`plugins.entries["meta-graph"].config`) must the
     manifest `configSchema` be extended **and `minion.plugin.json` regenerated** — otherwise the validator
     rejects the config with *"must NOT have additional properties"*. This spec's preferred shape is
     **per-account channel config**, which avoids that entirely; if S0 shows per-account channel config is
     not readable at the send site, extending the plugin schema is the fallback and the regeneration step is
     mandatory.
  4. **Do not touch account lifecycle.** `gateway.startAccount` must keep awaiting abort; returning a
     cleanup function makes `server-channels.ts` treat the account as exited and restart-loop. This slice adds
     config reading only — a diff that touches the start/abort shape is a finding.
- **Follow the extension's existing config idiom: read raw `cfg.channels.*` like WATI — no Zod** in channel
  config (memory: *"config.ts (types, read raw cfg.channels.* like WATI — no Zod)"*). Match the file, don't
  introduce a second validation style.
- **Validate at channel start, not at send time.** `enabled: true` with a missing/blank `template.name` or
  `template.languageCode` must log **one** `error` at startup naming the account and the missing field, and
  leave the fallback **disabled** for that account (fail-safe: never guess a template name, never send). A
  config typo must not surface for the first time 26 hours later inside a catch block.
- **No new secret.** A template name is not a credential. Do not add a vault `secrets:` declaration (memory
  documents the three existing ones: `meta_app_secret`, `meta_verify_token`, `meta_access_token`) — that
  would change the settings/security surface for a non-secret and is out of scope (§5).

**Files:** `extensions/meta-graph/src/channels/whatsapp-cloud/config.ts` (types + raw read),
`extensions/meta-graph/src/channels/whatsapp-cloud/accounts.ts` (per-account resolution + startup
validation), `extensions/meta-graph/src/channels/whatsapp-cloud/config.test.ts` (new), and — **only under
gotcha 3's fallback path** — `extensions/meta-graph/manifest.ts` + the regenerated
`extensions/meta-graph/minion.plugin.json`.

**Definition of done (machine-checkable):**

```bash
cd minion
npx vitest run --project extensions extensions/meta-graph
#   config.test.ts:
#   - absent `windowClosedFallback`            → resolved config disabled; ZERO behavior change
#   - `enabled: true` + full template          → resolved, with defaults applied
#         (minIntervalMinutes 1440, includeMessageExcerpt false, errorCodes = the verified default)
#   - `enabled: true` + missing template.name  → exactly one startup `error` naming account+field,
#                                                and the account resolves to DISABLED (never sends)
#   - `enabled: true` + missing languageCode   → same
#   - per-account isolation: account A enabled, account B absent → B unaffected
#   - `errorCodes: []` or absent               → the verified default set, not an empty set
pnpm tsgo && pnpm check
rg -n 'whatsappCloud' extensions/meta-graph/src            # → ZERO (gotcha 1: hyphenated id only)
rg -n 'channels\.meta\b' extensions/meta-graph/src         # → ZERO (gotcha 2)
rg -n 'zod|z\.object' extensions/meta-graph/src/channels/whatsapp-cloud/config.ts   # → ZERO (house idiom)
git diff --name-only <base>...HEAD -- extensions/meta-graph/manifest.ts | \
  xargs -r -I{} rg -q 'configSchema' {} && \
  git diff --name-only <base>...HEAD | rg -q 'minion\.plugin\.json'   # schema change ⇒ regenerated JSON
```

---

### S3 — The wrapper: classify → at-most-once template send → loud undelivered original

**Tags:** `logic`, `test` · **Estimate:** 6–8 h

**Goal:** the proposal's definition of done. A free-form send that fails with a verified window-closed code
triggers exactly one `sendWhatsAppTemplate` call using the account's configured template; everything else
about the send path is unchanged; and the original message's non-delivery is visible.

**Do:**

- **Red-state first (G3).** Before touching the send path, write the test the proposal asks for: mock
  `graphSend` to reject with the window-closed body, assert `sendWhatsAppTemplate` was called. Run it against
  today's code, watch it fail, and **paste the failure into the PR**. That is the proposal's claim
  (*"no automatic catch"*) demonstrated rather than asserted.
- **Wrap the free-form reply send only.** One function in
  `whatsapp-cloud/api.ts` — e.g. `sendWhatsAppMessageWithWindowFallback` — wrapping the existing text/media
  send. **Explicitly excluded** (S0 (a) enumerates them): reactions, read receipts / mark-as-read, typing
  indicators, and template sends themselves. Encode the exclusion structurally (the wrapper is applied at the
  reply call site, not inside a shared low-level helper), so a future outbound call type does not inherit
  billed-template behavior by accident.
- **Classify narrowly.** Fall back **only** when the thrown value is a `GraphApiError` whose numeric `code` is
  in the resolved `errorCodes` set. Never on: a network error or timeout, a 5xx, an unparseable body
  (`code: undefined`), `131026`, `131051`, `190`, or a rate-limit code. **Never string-match** Meta's message
  text — it is localized and Meta-owned. A near-miss must be logged at `warn` with the observed code so an
  unexpected-but-related code is discoverable from logs instead of guessed at in code.
- **Never fall back on an ambiguous outcome.** If the send may have *succeeded* (timeout after the request
  was accepted, parse failure on a 200), the correct action is to do nothing extra. A duplicate delivery to a
  customer is a worse outcome than a missing re-engagement nudge.
- **At most once, and never a retry of a retry.** (a) The template send is attempted **once**; if it fails,
  log at `error` and stop — no second classification pass, no recursion. (b) A process-local guard keyed by
  `(accountId, recipient)` with `minIntervalMinutes` TTL suppresses repeats — so an N-block reply after a
  quiet day yields **one** notification, not N (⚠️ A6). Bound the guard (TTL + max entries) so it cannot grow
  without limit. **State honesty:** this guard is in-memory and resets on gateway restart; a persistent
  dedupe store is out of scope (§5) and needs a `TODO(handoff):` + a `proposals/` entry (S4).
- **Do not pretend the original was delivered.** The wrapper's return value must tell the caller the free-form
  send **failed** and a notification was sent instead — a distinct outcome from success. Do not swallow the
  original error into a success value; whatever the send path returns today for a failure must still be
  returned or rethrown after the fallback. If S0 shows the caller has no way to express "not delivered", that
  is a `TODO(handoff):` plus a `proposals/` entry (S4), **not** a silent success.
- **The excerpt rule (default: no excerpt).** Only if `includeMessageExcerpt: true` **and** the configured
  template declares a body parameter may an excerpt of the original be passed as a template parameter, and
  then it must be sanitized for Meta's documented template-parameter restrictions — **no newlines, no tabs, no
  more than four consecutive spaces**, plus a hard length cap (S0 verifies the exact current restrictions
  alongside A2). Unsanitized parameters are rejected by Meta, which would turn the fallback into a *second*
  failure. Default off means the shipped default cannot leak conversation content into a differently-billed,
  differently-audited message type.
- **Reuse the one token path.** The template send resolves its access token through the same
  `resolveAccessToken()` → `secrets.getScoped("meta_access_token", "whatsapp-cloud:<accountId>")` chain as the
  text send (⚠️ A4). No second credential path, no env-var shortcut.
- **Preserve the pinned Graph version.** The template call uses the account's configured `graphVersion`
  (default **v23.0** per memory and `2026-07-04-meta-business-integration` §63) — not a literal.

**Files:** `extensions/meta-graph/src/channels/whatsapp-cloud/api.ts` (the wrapper + the classifier +
the guard, or a sibling `window-fallback.ts` if it earns its own file),
`extensions/meta-graph/src/channels/whatsapp-cloud/adapter.ts` (call the wrapper at the reply site),
`extensions/meta-graph/src/channels/whatsapp-cloud/api.test.ts` (new/appended). **Not**
`src/graph-client.ts` (S1 finished there), **not** `channels/shared.ts` or `channels/messaging-platform.ts`
(shared with messenger/instagram — §4).

**Definition of done (machine-checkable):**

```bash
cd minion
npx vitest run --project extensions extensions/meta-graph
#   api.test.ts — the proposal's DoD plus its guard rails:
#   - graphSend rejects with the window-closed code + fallback ENABLED
#         → sendWhatsAppTemplate called EXACTLY ONCE, with the configured name + languageCode
#           + the configured components, and the same resolved access token as the text send
#   - same, but fallback DISABLED/unconfigured
#         → sendWhatsAppTemplate NOT called; exactly one actionable `warn`/`error`;
#           the original failure still surfaces (no silent success)
#   - graphSend rejects with 131026 / 131051 / 190 / a rate-limit code → NOT called
#   - graphSend rejects with a network error, a timeout, or an unparseable body → NOT called
#   - the template send ITSELF rejects with the window-closed code → logged at error, NOT retried
#         (no recursion, no second fallback)
#   - N sends to the same recipient inside minIntervalMinutes → exactly ONE template send  (⚠️ A6)
#   - a send to a DIFFERENT recipient in the same window → its own single template send
#   - reaction / read-receipt / typing sends failing with the window-closed code → NOT called
#   - includeMessageExcerpt=false (default) → no message text appears in the template payload
#   - includeMessageExcerpt=true → the parameter contains no \n, no \t, no >4 consecutive spaces,
#         and is length-capped
#   - the happy path (graphSend resolves) → sendWhatsAppTemplate NOT called; return value unchanged
pnpm tsgo && pnpm check
rg -n 'sendWhatsAppTemplate' extensions/meta-graph/src/channels/whatsapp-cloud   # → wrapper call site exists
rg -n "message\.(includes|match)\(|'Re-engagement'" \
   extensions/meta-graph/src/channels/whatsapp-cloud                            # → ZERO string-matching
git diff --name-only <base>...HEAD \
  | rg -v '^extensions/meta-graph/src/channels/whatsapp-cloud/'                  # → EMPTY for this slice
git diff <base>...HEAD -- extensions/meta-graph/src/channels/messaging-platform.ts \
                          extensions/meta-graph/src/channels/shared.ts           # → EMPTY (§4)
```

---

### S4 — Diagnostics, docs, handoff ledger, sweep

**Tags:** `logic`, `test`, `docs` · **Estimate:** 4–5 h

**Goal:** an operator can tell from logs that the fallback fired and why, a reader of the extension's docs
knows the feature exists and what it does **not** do, and every open end is written down twice per AGENTS.md.

**Do:**

- **One log line per outcome, at the right level, with no PII bulk.** Fallback fired → `warn` with account
  id, the matched code, the template name. Fallback wanted but unconfigured → `warn`/`error` naming the
  account and the missing config, **once per interval** (not per message — a chatty misconfiguration must not
  flood the journal). Template send failed → `error` with the Graph code. **Never log the message body**, and
  redact/shorten recipient identifiers per the extension's existing convention (memory notes the message
  ledger already stores content, so the log does not need to). Never log an access token or the raw error
  body wholesale.
- **Prefer existing diagnostics over new ones.** If the extension or core already emits a diagnostic /
  reliability event for a failed send (`2026-06-13-gateway-monitoring-events-hooks-recon` describes
  `message.processing_error` as the universal per-channel message-failure event), reuse it and add the
  fallback outcome as context. Do **not** invent a new event type, a new metric backend, or a hub surface —
  out of scope (§5).
- **Docs, in the extension.** Update `extensions/meta-graph/README.md` (or, if none exists — S0 (d) — a
  file-header comment in `whatsapp-cloud/api.ts`; do not create a new docs surface this spec did not scope)
  with one short section: what the 24h customer-service window is; the exact config block; that it is
  **off by default and costs money when on**; that the template is a **re-engagement notification, not
  delivery of the original message**; that the at-most-once guard is in-memory and resets on restart; and
  that the template must already be **approved by Meta** for the account's WABA before `enabled: true` does
  anything but log errors.
- **Ledger sweep before closing (AGENTS.md "Open-items ledger").** Every open end gets both a
  `TODO(handoff): <what, why, pointer>` at the exact site **and** a `proposals/` entry (new file, or an
  append to the matching open one). Expected entries:
  - **persistent at-most-once state** — the in-memory guard resets on restart, so a restart can allow a
    second notification inside the interval;
  - **replaying the undelivered original once the window reopens** — the genuinely useful follow-on, and a
    real design problem (durable queue, expiry, ordering, consent);
  - **proactive window tracking** — knowing the window is closed *before* attempting the send, instead of
    learning it from an error;
  - anything S0 discovers that this spec did not anticipate.
- **File the sweep, fix nothing.** If S0 (f) found sibling gaps (other `Phase 3` TODOs — memory names
  *"WhatsApp inbound binary download TODO"* and inbound-media placeholders), write **one** proposal naming
  them with file:line evidence and stop. They are not this diff.

**Files:** `extensions/meta-graph/README.md` (or the `api.ts` header),
`extensions/meta-graph/src/channels/whatsapp-cloud/api.ts` (log lines + any `TODO(handoff):`),
`extensions/meta-graph/src/channels/whatsapp-cloud/api.test.ts` (log-level assertions),
`proposals/*.md` (the handoff + sweep entries).

**Definition of done (machine-checkable):**

```bash
cd minion
npx vitest run --project extensions extensions/meta-graph
#   - the unconfigured-but-wanted warning is emitted at most once per interval, not per message
#   - NO log assertion contains the message body; no token, no raw error body in any log call
pnpm test && pnpm tsgo && pnpm check          # full unit suite + typecheck + lint/format
rg -n 'TODO\(handoff\)' extensions/meta-graph/src   # → each hit has a matching proposals/ entry
rg -n '24 ?h|window|template' extensions/meta-graph/README.md   # → the section exists (or the api.ts header)
cd .. && ls proposals/ | rg 'window|template|replay'            # → the handoff proposal(s) filed
cd minion && git diff --name-only <base>...HEAD | rg '\.svelte$' \
  && echo "FAIL: UI out of scope" && exit 1                     # → no hit; UI is excluded (§5)
```

---

## 3. What the fallback is and is not — the table to paste into the PR

| Question | Answer this spec commits to |
|---|---|
| Does the customer receive the original message? | **No.** They receive the configured, pre-approved re-engagement notification. Templates cannot carry arbitrary text |
| Is the original message retried later? | **No.** Out of scope (§5); S4 files the proposal |
| Does anything happen if the operator configures nothing? | **No.** Byte-for-byte today's behavior, plus a clearer failure log |
| How many templates can one agent reply cause? | **One**, per recipient per `minIntervalMinutes` (default 24h) — process-local guard |
| Which errors trigger it? | Only the verified window-closed code(s) (⚠️ A2), config-overridable. Never timeouts, 5xx, unparseable bodies, `131026`, `131051`, `190`, rate limits |
| Does it cost money? | **Yes** — template messages outside the window are billed, and marketing-category templates are subject to per-user limits. Hence opt-in, default off |
| Can a bad config make it send the wrong thing? | It can send the wrong *approved* template (operator's choice). It can never invent one: a missing name/language disables the account's fallback at startup |

## 4. Cross-repo impact

Checked against the AGENTS.md "Cross-Project Impact Zones" table. The relevant row is **"Channel extension
(new/modify) → `minion/extensions/<channel>/` + `minion/src/channels/`"**.

| Surface | Impact | Mitigation / evidence |
|---|---|---|
| `minion/extensions/meta-graph/src/channels/whatsapp-cloud/` | **The fix.** All behavior changes live here | S2–S4 |
| `minion/extensions/meta-graph/src/graph-client.ts` (+ `types.ts`) | **⚠️ ALERT — shared by all three channels in the bundle** (whatsapp-cloud, messenger, instagram). Branch B adds an `Error` **subclass**: existing `instanceof Error` / `.message` consumers behave identically; no signature change, no change to *when* it throws, no window/template logic in the primitive | S1 constraints + DoD (`rg '131047|template' graph-client.ts` → ZERO; back-compat message test). Memory `meta-graph-channels` documents the one-bundle/shared-substrate design |
| `minion/extensions/meta-graph/src/channels/messaging-platform.ts`, `channels/shared.ts` | **None — read-only.** The 24h window is WhatsApp-specific; memory: *"whatsapp-cloud differs (changes[] + messaging_product + 24h/templates)"* | S3 DoD: `git diff` on both files → EMPTY. Window logic appearing in the shared factory is a finding |
| `minion/extensions/meta-graph/manifest.ts` + `minion.plugin.json` | **None in the preferred shape** (per-account channel config). If gotcha 3's fallback path is taken, the `configSchema` change **requires regenerating `minion.plugin.json`** or the validator rejects the whole plugin config | S2 gotcha 3 + DoD's paired-file check; memory records this exact crash-loop |
| `minion/extensions/meta-graph/ui/` (hub settings/plugins panel) | **None.** Template management UI is the proposal's own exclusion. The panel edits `webhookPath`/`graphVersion` and lists secret status; this spec adds neither a secret nor a plugin-level field | §5; memory documents the panel's exact scope. ⚠️ Consequence: the new config is **hand-edited in `gateway.json`** until a future UI proposal — say so in the PR |
| Vault / `settings/security` secret surface | **None.** No new `secrets:` declaration; the three existing ones are untouched | S2's "no new secret" rule |
| `minion/src/channels/`, `minion/src/plugin-sdk/`, `minion/src/config/validation.ts` | **None — read-only.** meta-graph registers channels imperatively; memory records *"Zero core gateway changes"* for the original build. Editing any of them is a **finding and a stop condition** | S1/S3 DoD changed-file checks |
| Account lifecycle (`gateway.startAccount`, `server-channels.ts`) | **None — and must stay none.** Memory gotcha 4: returning a cleanup fn instead of awaiting abort makes the gateway treat the account as exited and **restart-loop in prod** | S2's gotcha-4 rule; any diff to the start/abort shape is a finding |
| `@minion-stack/shared`, `minion_hub`, `minion_site`, `paperclip-minion` | **None.** No WS frame type, event type, or protocol field added or changed ⇒ the AGENTS.md "Gateway protocol" row does not apply | §5 excludes it; if the fix appears to need one, that is a spec bug — raise it |
| `minion_plugins`, `pixel-agents`, `Minion Docs/` | **None.** Docs for this feature live in the extension's own README (S4) | S4's "do not create a new docs surface" rule |
| **Meta / the WABA (external, billed, rate-limited)** | **⚠️ ALERT — the only impact that costs money and can degrade deliverability.** Enabling this sends billed template messages; over-sending degrades the WABA quality rating, which throttles the business's messaging tier | Opt-in + default off (S2); at-most-once per recipient per interval (S3); one attempt, no retry-of-retry (S3); README states the cost plainly (S4). **The template must be Meta-approved before enabling** — an unapproved name fails every send |
| **netcup prod (`bot-prd@152.53.91.108`)** | **⚠️ Deploy-time gotcha, from memory.** The Meta app dashboard showed *"missing a payment method for 8 of your accounts"*; the test number sends free **only to registered test recipients**. Template sends may therefore fail on that box until a payment method and an approved template exist | §6 step 4 verifies the template send in Meta's API Setup console *before* enabling in `gateway.json`. Note also that `whatsapp-cloud` is webhook-based, so a gateway restart does **not** force a re-link — that hazard belongs to the Baileys `whatsapp` channel (memory `netcup-whatsapp-accounts`) |
| CI (`pnpm-lock.yaml` / frozen install) | **Possibly pre-existing, low confidence.** Memory (2026-06-01) records that `@nikolasp98/meta-graph-ui` was missing from the committed lockfile, risking a `--frozen-lockfile` CI failure. It may have been fixed in the ~2.5 months since | If CI fails on a lockfile entry unrelated to this diff, do **not** absorb the fix here — file it and use the documented escape hatch only if the hooks allow it |

### ⚠️ A1 — the thrown shape decides whether S1 exists

If `graphSend` already surfaces the numeric code, S1 is a test. If it does not, a one-channel feature
necessarily touches the substrate all three channels share. Additive-`Error`-subclass-only is what keeps that
safe, and it is why S1 is a separate slice with its own back-compat assertion rather than a line inside S3.

### ⚠️ A2 — the error code is remembered, not verified

I expect **`131047`** ("Re-engagement message"). **I am not fully certain**, and `470` is the older
On-Premises code for the same condition, not the Cloud API one. This spec deliberately (a) requires S0 to
verify against Meta's current error reference **and** a captured body, and (b) makes the matched set
config-overridable. Hardcoding a remembered constant with no override would be the single most likely way for
this feature to ship broken *and* undiagnosable — a fallback that never fires looks exactly like today.

### ⚠️ A3 — the wrapper's placement is load-bearing

Wrapping too low (in `graphSend`) leaks WhatsApp-only 24h/template semantics into messenger and instagram.
Wrapping too broadly (any outbound call) bills a template when an emoji reaction fails. S0 (a) enumerates the
outbound calls; S3 wraps exactly one and asserts the exclusions in tests.

### ⚠️ A4 — one token path only

Memory documents vault-first resolution with a scoped key per account. A fallback that reads the token from
config or env when the primary path reads it from the vault would work on the developer's machine and fail in
prod — the worst kind of divergence, in the error path, where nobody looks.

### ⚠️ A5 — the target repo is not in this workspace

`minion/` is not checked out here, so every path, symbol, and line number is carried from the proposal and
from operator memory rather than read from disk. The proposal's evidence is specific
(`whatsapp-cloud/api.ts:5`, `sendWhatsAppTemplate`, `graphSend`, "the Phase 3 TODO") and S0 re-verifies all of
it. If S0 finds the fallback already landed since the debt sweep, that is a reconciliation finding for the G0
sweep (`2026-08-17-sdlc-phase-gates-scoring-spec` §3) — report it and stop; do not go looking for a different
bug to fill the slice with.

### ⚠️ A6 — N blocks must not become N billed messages

If one agent reply is dispatched as several sends, the first long reply after a quiet day would bill the
business once per block without S3's guard. The guard is process-local and honest about it; persistence is a
filed follow-on, not a silent gap.

## 5. Out of scope (explicit)

- **Template management UI** — the proposal's own exclusion. No hub page, no panel field in
  `extensions/meta-graph/ui/`, no template CRUD, no listing of approved templates from the Graph API, no
  approval-status display. Config is hand-edited in `gateway.json` for now (§4).
- **Delivering the original message by any means, now or later.** No durable queue, no replay when the window
  reopens, no "send on next inbound". S4 files the proposal; this diff does not build it.
- **Persistent at-most-once state.** The guard is in-memory and resets on restart. A store (SQLite, the
  ledger, a KV) is a follow-on with its own schema and migration questions.
- **Proactive window tracking.** No tracking of last-inbound timestamps to predict closure, no pre-emptive
  template selection. This fix is **reactive**: it catches the error Meta returns.
- **Any change to `graphSend`'s behavior**, its signature, its success path, or *when* it throws. S1 changes
  only the type of the thrown value, additively.
- **Anything in `channels/messaging-platform.ts` or `channels/shared.ts`** — messenger and instagram have no
  24h window and must not learn about templates.
- **Anything in `minion/src/`** (core): no `src/channels/`, no `src/plugin-sdk/`, no
  `src/config/validation.ts`, no account-lifecycle change. Needing one is a stop condition (§4).
- **New secrets, new vault probes, or changes to the `settings/security` surface.**
- **New diagnostic event types, metrics backends, dashboards, or alerting.** Reuse what exists; add context,
  not surfaces.
- **Inbound media download** and the other `Phase 3` items memory lists — S4 files one sweep proposal and
  fixes none of them.
- **Baileys `whatsapp` channel**, WATI, and every non-WhatsApp channel. Different channel, different failure
  class.
- **Retry, backoff, or delivery-confirmation policy for normal sends.** Preserve today's semantics exactly.
- **Live-Meta network calls in unit tests.** Mocked `graphSend` only; the one live check is §6 step 3, run by
  a human against a test number.
- **Any UI.** Zero `.svelte` files ⇒ the `ui` tag, the ui-design-governance skill, `lint:design`, and
  `lint:tokens` do **not** apply, per `2026-08-17-sdlc-phase-gates-scoring-spec` §4b.
- **Editing `specs/index.json` or `proposals/index.json`.** Generators own them. Flipping this spec's own
  frontmatter belongs to the gate/reconciler, not the implementer.

## 6. End-to-end verification

Run with S1–S4 merged on `minion`'s `DEV` branch. Steps 1–2 are offline and belong in CI. Step 3 needs the
Meta test number and a registered test recipient; step 4 is the optional prod enablement.

```bash
cd minion

# 1. Gates (logic/test-tagged: no design or token lint — §5)
pnpm install && pnpm build
pnpm test && pnpm tsgo && pnpm check
git diff --name-only <base>...HEAD    # → extensions/meta-graph/** and proposals/*.md ONLY
                                      #   (manifest.ts + minion.plugin.json only under S2 gotcha 3)

# 2. The unit proof (the proposal's DoD)
npx vitest run --project extensions extensions/meta-graph     # memory: from ROOT, not the subdir
#   the mocked window-closed error fires the template exactly once; every negative case in S3's DoD holds;
#   the red-state failure from S3 is pasted in the PR

# 3. Live, against the Meta TEST number — the only step that proves A2
#    Preconditions, in this order (skipping any of them produces a false negative):
#    a) In Meta's WhatsApp Manager, create + get APPROVAL for a simple utility re-engagement template
#         (name + language exactly as configured). Send it once from Meta's own API Setup console first —
#         if it fails there, the gateway will fail too, and for reasons unrelated to this diff.
#    b) Register a test recipient whose LAST INBOUND MESSAGE IS OVER 24 HOURS OLD (or one that has never
#         messaged the number) — this is what makes the window closed.
#    c) Leave `windowClosedFallback.enabled: false`. Trigger an outbound free-form message to that
#         recipient (hub reply, or the agent).
#         → expect: the send fails; the log names the Graph code.
#         ← RECORD THAT CODE. It is the ⚠️ A2 verification. If it is not in the shipped default set,
#           fix the default (or the config) before enabling — a fallback that never fires is invisible.
#    d) Set `enabled: true` + the approved template, restart/hot-reload the channel, repeat (c).
#         → the approved template arrives on the test handset; the log says the fallback fired and names
#           the matched code and template; the original send is still reported as NOT delivered.
#    e) Send 3 more free-form messages to the SAME recipient immediately.
#         → exactly ZERO further templates (the interval guard). Check the handset, not just the logs.
#    f) Reply from the test handset (this reopens the window), then send a free-form message.
#         → it is delivered normally as text; NO template.
#    g) Misconfigure on purpose: `enabled: true`, `template.name` blank. Restart.
#         → exactly one startup error naming the account and the field; sends behave as in (c);
#           NO template send is attempted with a guessed name.
#    h) Confirm messenger and instagram are unaffected: send and receive one message on each.
#         → unchanged behavior; no template logic on their paths.       ← the shared-substrate guard (§4)

# 4. Prod (netcup), only after step 3 is green — optional and gated on the WABA
#    Memory `meta-graph-channels`: build one bundle, ship code + manifest, restart the user service.
#    ⚠️ The dashboard showed "missing a payment method" — verify the template sends from Meta's console
#    for the PROD sender before enabling in gateway.json, or every fallback will fail and log errors.
tsdown --no-config --entry extensions/meta-graph/index.ts --out-dir <build> --no-dts \
       --external minion/plugin-sdk       # emits index.mjs → mv to index.js
#    scp index.js + minion.plugin.json → /home/bot-prd/.local/lib/node_modules/@nikolasp98/minion/extensions/meta-graph/
#    edit /home/bot-prd/.minion/gateway.json → channels["whatsapp-cloud"].accounts.<id>.windowClosedFallback
#    restart: sudo -u bot-prd XDG_RUNTIME_DIR=/run/user/$(id -u bot-prd) \
#             DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/$(id -u bot-prd)/bus \
#             systemctl --user restart minion-gateway.service
#    then: journalctl --user -u minion-gateway.service | rg 'whatsapp-cloud|window|template'
#    (the cosmetic `plugin not found: whatsapp-cloud` doctor line is a known multi-channel-plugin quirk)
```

**Ship gate:** §6 steps 1–3 green; the proposal's DoD checked clause by clause (*"wrapper catches the
window-closed error from graphSend and retries via sendWhatsAppTemplate"* — the wrapper exists at the reply
call site and the live check in step 3(d) delivered a template; *"unit test mocks the error and asserts the
fallback fires"* — S3's red-state test, shown failing first, now passing); S0's six answers recorded in the
PR, **including the live-verified error code from step 3(c)**; §3's table pasted into the PR so no reader
believes the original message was delivered; the shared-substrate guard proven (step 3(h) plus the empty
diffs on `messaging-platform.ts` / `shared.ts`); and every open end carrying both a `TODO(handoff):` and a
`proposals/` entry, or the PR stating "no open items". A core edit, a window/template concept appearing in
`graph-client.ts` or the shared factory, an account-lifecycle change, or a default-on fallback are stop
conditions and cannot pass this ship gate.
