# Root integration and Stage 9 follow-ups

Scratch only. Gateway/Hub source pins remain those in scratch.json. Node v26.13.0 and reused installed dependencies; full Node22 target/frozen-lockfile builds not qualified.

ZI-1/DC-2: sessions.ts imports clearSessionCursor; successful shared ensureSessionRuntimeCleanup clears after embedded run settles and before reset/delete change store. Failed cleanup preserves budget. Five actual source-bound lifecycle-helper/real-runner cases: baseline2fail/3pass, corrected5pass. Tests transpile the actual function body, inject surrounding runtime dependencies, and verify both RPC handlers await it before store mutation; not full gateway startup. Other automatic rotation paths remain TODO/proposal adoption work.

IR-1/CD-1: classifier selection moved above TTS enabled/disabled branch. Four additional actual TTS→dispatcher composition tests: red1fail/23pass in24-case boundary file; correction passes. The first local edit was incorrectly placed at another autoMode branch and failed the same tests; it was corrected, not treated as passing evidence.

CD-2: finance adapter reads explicit presence of dateFrom/dateTo/range/bucket before optional string handling. Supplied blanks/wrong types reject; absent fields remain absent. Real tool→real route parser tests with synthetic authority/aggregate services: corrected9pass; pre-correction5fail/4controls pass. A fixture import initially failed due generated Paraglide; explicit permissions-constant stub repaired test setup before obtaining the real red baseline. No fixture import failure is counted as a behavioral reproduction.

CD-3: five extra real PGlite native preview negative cases added by Hub executor, all with whole-table snapshots, SELECT-only statement log and no effects. These cover inactive event/resource, same-org unassigned resource, deleted contact and occupied slot before preview. No source defect was exposed.

Exact-site TODO(handoff) and proposal ledger cover filesystem/plugin memory writes, acknowledged/idempotent sink delivery, provider abort/timeout, non-RPC rotation, actual native-role RLS qualification, direct speech/telephony and bypass delivery/export paths. No provider, production DB or outgoing user-message tests; no commits/releases.

RR-1 (Major, re-audit) accepted: added8finance cases beyond the9-case correction suite. Four wrong-type fields reject before HTTP and every aggregate; non-leap Feb29 rejects; valid leap day and both one-sided periods assert exact UTC/null bounds. Frozen default now asserts complete Lima business-day UTC window and disclosed rolling mode. Expanded chain17/17passes. No source change was needed; no further Goldfish round beyond the one re-audit. This is root-verified test closure, not independently re-reviewed.
