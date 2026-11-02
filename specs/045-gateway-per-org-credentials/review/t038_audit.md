# T038 audit: hub PR #624 `feat/045-hide-admin-surfaces` @ `34e4b3ff`

Auditor: independent, adversarial, executing mode. Base `feat/045-gateway-jwt-client`. The worktree was left clean (`git status` empty at the end). Mutations ran in a throwaway copy under the scratchpad, which has been deleted.

**Verdict: FIX-FIRST.** Two member-visible admin surfaces are still shown (H1, H2). Two pages that work for members are hidden, and a test locks one of them in (M1, M2). The layout gate can be bypassed through a custom-nav alias (M5). One of the three new tests does not detect removal of the change it was written for (M6).

## Gates run

| Gate | Result |
|---|---|
| `node node_modules/vitest/vitest.mjs run src/lib/services/gateway/ AgentSkillsPanel.admin-gate.mounted.test.ts ChatHistoryPopover.title-drone.mounted.test.ts` | 11 files, **97/97 passed** |
| `PUBLIC_POSTHOG_KEY=x PUBLIC_POSTHOG_HOST=http://localhost bun run check` | exit 0, `12371 FILES 0 ERRORS 0 WARNINGS` |

### Mutation results

Each mutation was applied in a copy and the new tests were rerun.

| Mutation | Tests | Detected? |
|---|---|---|
| M1 `adminOnlyPageHidden` returns `false` | admin-surfaces | yes (15 fail) |
| M2 drop the first `adminOnlyPageHidden` line in `canViewPath` | admin-surfaces | yes (4 fail) |
| M3 `AgentSkillsPanel` `editable = true` | skills mounted | yes (1 fail) |
| **M4 drop the `drones.session-title` gate in ChatHistoryPopover** | title-drone mounted | **NO (3/3 pass)** |
| M4b: M4 plus dropping the `sendRequest` gate in `gateway-rpc.ts:74` | title-drone mounted | yes (1 fail) |
| M5 `gatewayMethodAllowed` ignores the flag (inertness) | all 3 | yes (17 fail) |

Untested surfaces include:
- the `(app)` layout gate
- the AgentDetail Files/Prompt tabs and the settings panel
- AgentToolsPanel drag
- PiAgentTab dream
- the DetailHeader gear
- SecretsSection
- WorkshopNav, the Leaderboard back-link, BuilderHub and the tool/skill grids
- the `loadConfig` schema skip
- the session-bootstrap flow-trigger skip (`session-bootstrap.test.ts` covers only the unset path)

## 1. Inert while unset: PASS

- `gatewayMethodAllowed` (`platform-admin-methods.ts:128-130`) short-circuits on `!browserSharedTokenOff()` before it reads `page`. When the flag is unset, every new call site returns its old value:
  - `adminOnlyPageHidden` is `false`.
  - `canViewPath` falls through to the old logic.
  - The layout `{#if}` is always true.
  - `loadConfig` still sends `config.schema`.
  - Bootstrap still re-registers triggers.
  - The `svelte:element` swaps still render `<a href>`.
- Mutation M5 proves the unset path is asserted for pages and both mounted surfaces.
- Flag parsing, probed: `'false'`, `' FALSE\n'` and `'False'` switch. `'0'`, `'no'`, `'true'` and `''` do not.
- No new SSR hazard:
  - `canViewPath` already read `page.data`. Only components call it; the assistant server route imports `turn-router` only, which does not import `can.svelte`.
  - No route is prerendered (`src/routes/+layout.ts:18`), so reading `$env/dynamic/public` during render is safe.
- Module scope: there are no new module-scope reads. `WorkshopNav.items` is now `$derived`.

## 2. Coverage (71 entries = 70 methods + `PLUGIN_RPC`)

I grepped every method under all three quote styles and followed each wrapper module (`prompt-sections-rpc`, `prose`, `debug-rpc`, `shells-rpc`, `types/secrets`, `whatsapp`, `channel-sources`, `dream-data`, `reliability*`, `experiments`, `agent-tools`, `agent-skills`, `flow-editor`) to the components that mount it.

Covered:
- agents.files.\*, prompt.\* and sessions.usage (AgentDetail tabs, AgentDashboard)
- agents.skills.set (toggle)
- tools.update (drag)
- dream.history
- secrets.\* (the `/settings` page also redirects non-admins)
- debug.\*, killswitch.\*, reliability.\*, shells.\*, flows.\*, drones.list, playground/models (hidden pages)
- drones.session-title
- flows.trigger.register (bootstrap)
- config.schema (`loadConfig`)
- channels.\* (T037)
- `skills.update`: no UI caller, confirmed

**Gaps: members still see these controls, and using them fails with "your role can't":**

### H1 (HIGH): `/channels/[pluginId]` is the same plugin control center as the hidden `/plugins/[id]`

- `routes/(app)/channels/[id]/+page.server.ts` and `routes/(app)/plugins/[id]/+page.server.ts` are byte-identical (`diff` shows no difference). Both render `PluginControlCenter` → `PluginIframe`, which sends every RPC through `PLUGIN_RPC` (`PluginIframe.svelte:78`).
- `ChannelsNav.svelte:16` lists them in the Channels module.
- Probe: `adminOnlyPageHidden('/channels/whatsapp-crm') === false` and `canViewPath(...) === true` for a member after the switch.
- **Scenario:** a member opens Channels → a plugin entry. The plugin UI loads, and every save or list call it makes is refused.
- **Fix:**
  1. Add `[/^\/channels\/(?!gmail(\/|$))[^/]/, PLUGIN_RPC]` to `ADMIN_ONLY_PAGES`.
  2. Filter `ChannelsNav` items with `adminOnlyPageHidden(href)` (the nav is not built from `canViewPath`).

### H2 (HIGH, launch blocker): `/home/settings` personal-agent editor writes `config.patch`

- `routes/(app)/home/settings/+page.svelte:193-240`: display name, conversation name and personality preset autosave through `saveConfig()`, which sends `config.patch` (`config.svelte.ts:307/332`).
- The route is authenticated-only (`+page.server.ts`) and universal (`modules-rbac.test.ts:19`).
- `a3_audit.md:316` relies on "the user can rename the agent in `/home/settings`".
- **Scenario:** after the switch, every non-platform-admin who edits their own agent's name or personality, including the onboarding flow (`showOnboarding`), gets "your role can't".
- Hiding is the wrong fix: it would remove the member's core agent settings.
- **Fix:** proxy these fields through a hub server route that builds the patch server-side. The pieces already exist: `personal-agent-provisioner.ts` `activatePersonalAgent` already sends `config.patch` for identity and personality, and `reaudit.md:60` documents the pattern. At minimum, list this in the `TODO(handoff)` and in the proposal before T051. The PR's handoff comment presents the list as complete and leaves this out.

### M3 (MEDIUM): `/users` → Bindings tab

- `BindingsTab.svelte:46,69,235` change bindings with `setField('bindings')` and save them with `save()` → `config.patch`.
- `/users` has no registry rule, so any authenticated user can open it. It is also offered by the assistant site-map (`site-map.ts:46`).
- **Fix:** omit the `bindings` tab when `!gatewayMethodAllowed('config.patch')`.

### M4 (MEDIUM): `/settings/plugins` plugin settings iframes

- The page is gated `org-capability:settings:manage`, which org owners hold; they are not platform admins.
- It renders `PluginIframe` (`settings/plugins/+page.svelte:460`), so the plugin's settings save goes through `PLUGIN_RPC` and is refused.
- **Fix:** keep the hub-API enable toggle (`/api/plugins/:id/toggle`). Render the iframe and save bar only when `gatewayMethodAllowed(PLUGIN_RPC)`.

### L1 (LOW): background `channels.plugins.list` from the member chat input fails instead of being skipped

- `ChatInput.svelte:124` → `ensureChannelPlugins()` (`channel-sources.svelte.ts:57-75`).
- The call is refused and the error is swallowed. `pluginsLoaded` stays false, and the `$effect` retries whenever `conn.connected` flips. T038 says background calls are "skipped, not failed".
- **Fix:** `if (!gatewayMethodAllowed('channels.plugins.list')) return;` at the top of `ensureChannelPlugins`.

## 3. Over-hiding

### M1 (MEDIUM): `/^\/flow-editor(\/|$)/` hides the builder skill editor

- `/flow-editor/skills/[id]` uses only `tools.status` (read, `skill-editor.core.svelte.ts:170`) and hub APIs.
- Also hidden:
  - `SkillsGrid` cards are turned into non-links.
  - `BuilderHub` hides "New skill" for the skills tab (`BuilderHub.svelte:188-192`).
  - `/flow-editor/master/[id]`, a static viewer with no RPC.
- The test fixes the over-hide in place: `admin-surfaces.test.ts` `ADMIN_PAGES` includes `'/flow-editor/skills/s1'`.
- The `/flow-editor` list and editor are also mostly hub-backed: `/api/flows` and `/api/flow-groups`, flow owners can edit (`[id]/+page.svelte:137-142`), and the `flows.templates.list` reconcile swallows its errors. Only run, register and unregister are admin. The whole tree is hidden here; the owner should accept that explicitly.
- **Fix:**
  1. Change the regex to `^\/flow-editor(\/(?!skills\/|master\/)|$)`.
  2. Drop the SkillsGrid gate and the skills arm of `newTargetHidden`.
  3. Fix the test list.

### M2 (MEDIUM): `/^\/tools\/[^/]/` hides a page that already works read-only for members

- The page loads `tools.status` and `tools.inspect` (both read, `GatewayToolView.svelte:59`) and `/api/builder/tools/:id` (`tools:view`; PUT needs `tools:manage`).
- Its only admin RPCs are already behind hub `isAdmin`, which is the same `role === 'admin'` check:
  - Run is `EditorToolbar.svelte:151/171`.
  - Toggle is `GatewayToolView.svelte:217`.
  - Publish → the fire-and-forget `tools.reload` is `:115`.
- **Scenario:** an org member with `tools:view` or `tools:manage` loses the tool detail page and builder-tool editing, and ToolsGrid cards stop being links.
- **Fix:** remove the `/tools/` entry and the ToolsGrid gate.

### LOW and INFO items

- **L2 (LOW):** hiding the skill `ToggleSwitch` also removes the only per-row enabled/disabled indicator in the "All" filter. A non-interactive status dot is not a lock and would keep the information.
- **L3 (LOW):** the non-link `div` in ToolsGrid and SkillsGrid keeps `aria-label` and the `.item-link` hover and cursor styles, so it looks clickable and is not. This becomes moot once M1 and M2 are fixed.
- **INFO:** `/cloud` is an org-capability feature (`workspace:view`, `route-access-registry.ts:122`) and disappears entirely for members. This matches the accepted list, but the owner should know at T049.
- **INFO:** `/reliability` is gated `reliability:view` and is now admin-only in practice.

## 4. SSR and hydration

- SSR and the client compute the gate from the same inputs (`page.data.user` from the root layout load, and dynamic public env), so I found no mismatch and no flash. Hidden pages are not instantiated, so their scripts never run on either side.
- If `page.data` is `undefined` or `user` is `null`, `adminOnlyPageHidden` returns `true` (hidden) and does not crash. A logged-out user never reaches `(app)` anyway (`requireAuth`).

### M5 (MEDIUM): the layout gate is bypassed by spec-037 instance aliases

- `hooks.ts` `reroute` renders `/<section>/<slug>~<id>/…` as the target route, but `page.url.pathname` stays the alias.
- The gate checks `canonicalPath(page.url.pathname)` only (`(app)/+layout.svelte:174`). `canViewPath` does handle `hit.target`, but the layout does not.
- For a `kind: 'main'` move, `replaceWithCanonicalAddress()` (`:72-79`) even rewrites `/reliability` to the alias after hydration, so the gate flips to "show" and the admin page mounts and fires its refused RPCs.
- Probe with an org nav config `ops/rel~abc123 → /reliability`:
  - `adminOnlyPageHidden(canonicalPath('/ops/rel~abc123')) === false`
  - `adminOnlyPageHidden('/reliability') === true`
- **Fix:** in the layout, evaluate the rerouted target: `const hit = resolveNavInstance(navConfig(), c); adminOnlyPageHidden(hit ? hit.target + hit.rest : c)`. Matching `page.route.id` with the groups stripped would also work.
- **INFO:** a hidden page still runs its server load (for example the `/plugins/[id]` loader calls `pluginsUiList`) and hides that page's error page too. Only server work is wasted.

## 5. Correctness

- **Stale agent tab:** `ui.activeAgentTab` is not persisted (`ui.svelte.ts:4`). If it were `files` or `prompt` for a member, it would fall through to `{:else}` (chat) with no tab highlighted. That only happens if the role or flag changes mid-session (INFO).
- **AgentDashboard:** `loadFileCount` reads `filesAllowed` synchronously inside the effect, so it is tracked correctly. The card that ends up stuck on `·` is hidden in that case. "Files" now routes to Memory.
- **Spinners:**
  - The `loadConfig` skip resolves `null` and keeps the inferred-schema fallback, as before.
  - Bootstrap leaves no state behind.
  - The ChatHistoryPopover title loop is fire-and-forget, so no spinner can hang.
- **Chat auto-title:** a member keeps the label or first-prompt title. Before this PR, the refused call ran `.catch(() => titleRequests.delete(key))` and retried on every open, so skipping it is an improvement. No title is left half-set.
- **INFO:** after the switch, flow triggers are re-registered only when a platform admin's dashboard bootstraps. This was already true after the switch (the call was refused); list it in the ledger, since member-created flows depend on an admin session.

## 6. Tests

### M6 (MEDIUM): `ChatHistoryPopover.title-drone.mounted.test.ts` is vacuous for this change

- With the PR's gate removed, it still passes (mutation M4). The `sendRequest` gate (`gateway-rpc.ts:74`) refuses before `client.request`, and the test counts `client.request` calls only.
- **Fix:** spy on `sendRequest` (or on `refuseForRole`) and assert it is never called with `drones.session-title`.

Coverage is also short of T038's "each gated surface is absent" clause:
- Add mounted tests for AgentDetail (tabs and settings), AgentToolsPanel (`draggable`), PiAgentTab and DetailHeader.
- Add a unit test for the `loadConfig` and session-bootstrap skips with the flag `false` and a member.
- Add a layout or alias test covering M5.

## Findings list

| ID | Sev | Finding | Minimal fix |
|---|---|---|---|
| H1 | HIGH | `/channels/[pluginId]` plugin control center (same as the hidden `/plugins/[id]`) stays visible; iframe RPCs refused | add the `/channels/<plugin>` regex (excluding `gmail`) and filter ChannelsNav |
| H2 | HIGH | `/home/settings` name and personality autosave = `config.patch` → "your role can't" for every member | hub server route for personal-agent identity patches; at minimum ledger it as a T051 blocker |
| M1 | MED | `/flow-editor/skills/*` (hub-backed) and `/flow-editor/master/*` hidden; the test locks it in | narrow the regex, drop the skills gates, fix the test |
| M2 | MED | `/tools/[id]` hidden though it is read-only for members and its admin actions are already `isAdmin`-gated | remove the entry and the ToolsGrid gate |
| M3 | MED | `/users` Bindings tab saves `config.patch` | hide the tab when `!gatewayMethodAllowed('config.patch')` |
| M4 | MED | `/settings/plugins` iframes use `PLUGIN_RPC` for org owners | render the iframe only when `gatewayMethodAllowed(PLUGIN_RPC)` |
| M5 | MED | layout gate checks the URL, not the rerouted target; custom-nav alias shows admin pages | resolve the instance target in the layout gate |
| M6 | MED | drone test passes without the change; most gated surfaces untested | spy on `sendRequest`; add mounted and unit tests |
| L1 | LOW | ChatInput `channels.plugins.list` fails silently and retries instead of being skipped | early return in `ensureChannelPlugins` |
| L2 | LOW | skill rows lose their enabled indicator | non-interactive status dot |
| L3 | LOW | non-link cards keep link styling and `aria-label` | moot after M1/M2, or drop the class |
| I1 | INFO | inertness verified; flag parse; no SSR or prerender hazard | none |
| I2 | INFO | `/cloud` (`workspace:view`) disappears for members; flow triggers only re-register from admin sessions | owner acceptance at T049 and a ledger entry |
| I3 | INFO | redundant gates (settings Secrets, autonomous edit-flow, BuilderHub tools) | harmless |

---

## Re-audit (6b8e49ca)

Fix commit `6b8e49ca` sits on top of `34e4b3ff`. Same rules as the first pass. Mutations ran in a throwaway copy, which has been deleted. The worktree is clean (`git status` empty, HEAD `6b8e49ca`).

**Verdict: SHIP.** Every HIGH and MEDIUM finding is fixed, and each fix fails its test when reverted. What remains is LOW plus one behaviour change that the PR body must disclose (R0).

### Gates

| Gate | Result |
|---|---|
| `vitest run src/lib/services/gateway/` plus the 8 new or changed test files plus `personal-agent-provisioner.test.ts` | 19 files, **139/139 passed** |
| `PUBLIC_POSTHOG_KEY=x PUBLIC_POSTHOG_HOST=http://localhost bun run check` | exit 0, `12380 FILES 0 ERRORS 0 WARNINGS` |

### Findings H1–L3: fix and mutation evidence

| ID | Fix | Mutation (revert the fix) → test |
|---|---|---|
| H1 | `[/^\/channels\/(?!gmail(\/|$))[^/]/, PLUGIN_RPC]` and a `ChannelsNav` filter | removing the regex → admin-surfaces and ChannelsNav **2 fail**; removing the nav filter → ChannelsNav **1 fail** |
| H2 | `/home/settings` posts to `POST /api/personal-agent/settings`; the browser sends no `config.patch` | page reverted to a no-op save → home-settings mounted test **3 fail**; route 401 removed → **1 fail**; sanitizer passing extra keys → **3 fail** |
| M1 | regex `^\/flow-editor(\/(?!skills\/|master\/)|$)`; skills grid and "New skill" restored | old regex → **1 fail** (the test now asserts skills/master are not hidden) |
| M2 | `/tools/` entry and the ToolsGrid gate removed; `tools.reload` gated | re-adding the entry → **1 fail** |
| M3 | `/users` and `/settings` Bindings tab gated on `config.patch` | **untested** (R4) |
| M4 | `/settings/plugins` iframe gated on `PLUGIN_RPC` | **untested** (R4) |
| M5 | `adminOnlyUrlHidden` resolves the spec-037 instance target; the layout and `canViewPath` use it | resolving the URL only → **1 fail** (alias, locale-prefixed alias, admin, and unset cases) |
| M6 | drone test spies on the component's `sendRequest` | removing the drone gate → **1 fail** (it passed before the fix). Removing the `config.schema` skip, the bootstrap skip, or the AgentDetail files gate → **1 fail** each (new tests) |
| L1 | `ensureChannelPlugins` returns early | **untested** (R4) |
| L2 | read-only `StatusDot` (`data-part="skill-status"`) | removing it → **1 fail** |
| L3 | moot: the cards are `<a>` again | n/a |

### The new `POST /api/personal-agent/settings` route

- **Auth.** No `locals.user` → 401. No core context → 401. Both are tested, and removing the 401 fails a test.
  - `preparePersonalAgentBinding` also requires `ctx.profileId === userId` and org membership (`personal-agent-binding.ts:83-88`). Otherwise it returns 409.
  - CSRF: SvelteKit's default origin check is on (no `csrf` override in `svelte.config.js`). A cross-site JSON POST needs a preflight, so it is blocked.
- **Agent id.** The id comes only from `personal_agents where profile_id = caller` (`readAuthority`, `:67-71`).
  - `sanitizePersonalAgentSettings` reads exactly four top-level keys and requires each to be a string. Nested objects, `agentId`, `identity`, `contextMode` and `__proto__` are dropped (tested).
  - No client-supplied id is used anywhere.
- **Fields.** Only `name`, `conversationName`, `preset` and `text` are accepted. `name` cannot be cleared. Each field has a length cap (80/80/40/5000); an over-length value is dropped. See R2 for the gaps.
- **Patch shape.** It sends `{agents:{list:[{id, identity?, personality?}]}}`. The gateway merges it with `applyMergePatch(..., {mergeObjectArraysById: true})` (`minion src/gateway/server-methods/config.ts:406`).
  - Probe on the gateway's real `merge-patch.ts`: patching one agent's id leaves the other agents untouched, and only that entry's named keys change.
  - Clobbering happens only if some base `agents.list` entry lacks an id; the probe confirms the whole array is then replaced. The gateway schema requires `id: z.string()` on agents, so a valid config can't contain such an entry.
  - The provisioner's `activatePersonalAgent` already uses this exact shape.
- **Credential.** It calls `gatewayCallToInstance(target.url, target.token, …)`, the same way as `activatePersonalAgent`. It runs `config.get`, then `config.patch` with that snapshot's hash as `baseHash`. Gateway errors are not returned to the browser (generic 502).
- **Cross-org.** The target is `resolveOrgChannelTarget(ctx.tenantId, …)`, and `readAuthority` re-checks it:
  - `gateway.org_id = orgId`
  - the URL and a timing-safe token match
  - a single lease for that org pins this gateway
  - `agent.gateway_id`, when set, must equal the target. An agent bound to org A while the user acts in org B → 409.
- **Concurrent field saves.** `createAutosave` serializes saves through one shared `SaveStatus`, so two fields never race on `baseHash`.

### Clearing a field: old path vs new

Executed probes: `setField` and `computePatch` in hub vitest, and the gateway's `PersonalitySchema` and `applyMergePatch` via tsx.

- **Old path, member** (`user.role !== 'admin'`, which is almost every user): `setField` returns early (`config.svelte.ts:271-272`, present on the base branch). `isDirty` stays false, so `prepareConfig` returned with nothing saved while the indicator said "saved". **No member edit, set or clear, ever persisted.**
- **Old path, platform admin, clearing a field:**
  - `deepSet(..., undefined)` deletes the key.
  - `computePatch` sends the whole `agents.list` array with the key absent, not `null` (asserted).
  - Merge-by-id leaves absent keys untouched, so the old value survived (gateway probe: `conversationName: "Bob"` kept). **Clearing was already a silent no-op.**
- **New path:**
  - `conversationName: ''` and `text: ''` validate and are stored as `''`, so the field really clears. An empty `text` means no Personality section (`identity.ts:96`). `conversationName` is read only by a migration, where `''` doesn't fall back to the original name; harmless.
  - **`preset: ''` is invalid**: the gateway enum is `professional|casual|creative|technical`, so the merged config fails validation and the route returns 502. The UI can't send it, because `selectPreset` only sets a real key.
- **Conclusion:** clearing did not regress. It was a no-op before and now works for `conversationName` and `text`. Clearing `preset` can't be done from the UI (R2).

### Flag-unset behaviour (the route runs in both states)

- Every gate still short-circuits when the flag is unset. The unset branch is asserted in each new test.
- **R0 (INFO, must disclose): the route changes behaviour today.**
  - For an ordinary member, the old end state was "nothing written" (the `setField` no-op above). The new end state is "the field is written to their own agent's entry". It is **not** the same end state; it fixes a latent bug that made the UI claim edits had saved.
  - For a platform admin, setting a field ends in the same state as before. Clearing now clears instead of being ignored.
  - Write scope is limited to the caller's own agent and four fields on their org's gateway.
  - **Fix:** say this in the PR body ("members' `/home/settings` edits persist for the first time; clear now clears"), so the owner merges knowing it.

### Remaining findings

| ID | Sev | Finding | Minimal fix |
|---|---|---|---|
| R0 | INFO | Route changes behaviour while the flag is unset: member edits persist for the first time (previously a silent no-op), and clearing now clears | disclose in the PR body |
| R1 | LOW | `updatePersonalAgentSettings` skips the provisioner's roster check. For an `active` row with `gateway_id` null whose agent isn't on the org gateway (the prod "9/10 FACES" state), merge-by-id **appends** a new `agents.list` entry (probe confirmed). Scope is limited to the caller's own agent id on their own org's gateway. The UI can't do this (`agentStructure` must find the agent), but a direct POST can | before the patch, require `snapshot.config.agents.list` to contain `agent.agent_id` (the snapshot is already fetched), or require `agent.gateway_id === target.gatewayId`; otherwise return 409 |
| R2 | LOW | Server validation is looser than the gateway schema. `preset` is any string of 40 chars or fewer (the test uses `'warm'`, which the gateway rejects). `text` is capped at 5000, but the gateway allows 2000. `preset: ''` → 502. None is reachable from the UI (the textarea is capped at 500; presets are fixed keys) | validate `preset` against the four keys (map `''` to `null` to delete), cap `text` at 2000 |
| R3 | LOW | The `/channels` index cards (`channels/+page.svelte:70`) still link every plugin to `/channels/<id>`, which is now blank for members. The skill editor's back-nav goes to `/flow-editor`, also blank | filter `data.channels` with `adminOnlyPageHidden` on the index page; send the skill editor back to `/capabilities?tab=skills` |
| R4 | LOW | No test covers the `/users` and `/settings` Bindings gate, the `/settings/plugins` iframe gate, the `ensureChannelPlugins` skip, or the `tools.reload` gate (I mutated none of them: no test exists) | one mounted or unit test each, same three-case pattern |
| R5 | INFO | The route never returns 403, so the page's 403 branch is dead code | harmless |
