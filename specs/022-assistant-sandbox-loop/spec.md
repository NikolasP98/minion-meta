# Feature Specification: Sandbox assistant loop — breaking points after spec 021

**Feature Branch**: `docs/spec-022-assistant-sandbox-loop` | **Repos & PR bases**: minion_hub → `master` (`fix/assistant-sandbox-loop`) · minion-meta → `dev`

**Created**: 2026-10-17 | **Status**: Draft | **Tags**: logic, hotfix (agent loop + context gate; no data, no routes) | **Human gates**: none (hub master needs the owner's review-merge)

**Input**: Owner, 2026-10-17, after spec 021 deployed: "still stalling. Check the agent lifecycle. Does the current setup permit an agentic loop or are there breaking points?"

## Lifecycle (as built)
User turn → hub JEV router (`/api/assistant/route`) picks a mode + manifests → envelope + text to the gateway → pi run with SERVER tools only (bash, module_action, hub data tools…) → final reply → the hub executes the reply's ```` ```minion-ui ```` blocks in the browser (`dispatch.ts`) → when the model needs the results, ONE silent follow-up turn carries them back → repeat, at most `MAX_CHAIN` times. UI tools are therefore a turn-per-step relay, not native in-run tools (native client tools = proposal 2026-09-02-gateway-client-tools-webmcp-bridge).

## Evidence (prod FACES gateway transcript `182cb10a…`, 06:36 UTC, read-only)
- The envelope still carried the pre-021 sentence "Results come back to you only when something failed…": the user's tab ran the bundle loaded BEFORE the 06:33 merge (deploy skew), so spec 021 was not in play.
- Router: mode `navigate`; envelope has no "Tier 2" / "Sandbox element authoring" text — the sandbox manifest scored < 0.5 and only loads on `record_action`, so the model had the tool list but none of the authoring rules.
- Model: first a server `bash` echo ("these are UI tools, not function calls"), then a correct reply with `sandbox.datasets` + `sandbox.list_elements` fences; no follow-up followed (the pre-021 drop).

## Breaking points → DELTA
| # | Breaking point | Fix | Proof |
|---|---|---|---|
| B1 | Read results dropped | spec 021 (deployed `9391b270`) | runner tests |
| B2 | Classifier files a board request under navigate → no sandbox manual | `gateManifests(decision, mode, page)`: on `/sandbox` every non-chat turn loads `sandbox` | `turn-router.test.ts` (navigate on /sandbox → loaded; /stock → not; chat on /sandbox → not, SC-004 intact) |
| B3 | A successful write ends the relay; a multi-visual request that writes one element per reply stops after the first | manifest: reads come back, writes end the turn, put every upsert/arrange in ONE reply | manifest text |
| B4 | `MAX_CHAIN = 3` leaves no slack for datasets → preview → write plus one retry | `MAX_CHAIN = 5` | dispatch constant |
| B5 | Deploy skew: an open tab keeps old agent code | none here; the owner reloads after a deploy | — |

## Open ends (ledger)
- B5: proactive "new version, reload" for long-lived tabs (existing skew reload only fires on a failed chunk load).
- The model still wastes a step trying UI tools as server calls (`bash`, `module_action`); a gateway guard answering "write a minion-ui fence" needs a gateway release (also in spec 021).
- Native client tools would remove the relay entirely (proposal above).
