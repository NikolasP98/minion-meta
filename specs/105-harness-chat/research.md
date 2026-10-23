# Chat batch source decisions

Source: Hub `ef62e8ac2dd8d83d7f38dae8ec04f59c50cf4283`; meta `220a9b9a0a96e950a5c2d986c6c218cd54ab307e`. These are source inspection results, not new test/runtime claims.

| Decision | Source/rationale | Alternative rejected |
|---|---|---|
| Extend wave-1 preparation lifetime with a bounded accepted store | `pending-submission.ts:17–100` already implements preparation; `gateway.svelte.ts:1330–1349` loses originating run before dispatch. | Rewriting preparation or storing permanent task state expands scope and risks shipped behavior. |
| Pair scope epoch with opaque surface owner | Both Home and Floating create independent preparation controllers. Equal epoch numbers across controllers are not ownership. | Global numeric epoch alone could alias separate surfaces. |
| Gate actual `runner.ts` await boundaries | `runner.ts:66–67` waits for a tool then executes it; `model-context.ts:109–121` already accepts signal. | Testing a separate pure ownership helper without exercising these awaits would miss the defect. |
| Keep explicit navigation proposal terminal | `runner.ts:51–61` marks navigation requiresUserAction; `dispatch.navigation.test.ts` protects existing behavior. | Interpreting “context changes” as permission for automatic navigation weakens current rules. |
| Preserve explicit choice/artifact origin | Home `1124–1125,1227–1228` and Floating `1153–1154` currently use one text callback shape. | Guessing origin/parent from uppercase text or preceding transcript is not reliable identity. |
| Extend real capture allowlists | `observability-context.ts:286–305,367–378` omits `p_sandbox`; PostHog applies the sanitizer. | A parallel analytics client bypasses privacy enforcement. |
| Charge event count with existing limiter | `rate-limit.ts:1–32` is per-process and counts one request; parent mandates event count. | New distributed limiter is unnecessary infrastructure; claiming process limiter is fleet-global would be false. |
| Self-only API route classification, explicit JSON Origin check | Current route documents personal observation; `requireCoreCtx` establishes current tenant; local dev switch guard shows exact-origin check. | Invented admin permission would exclude normal assistant users; framework form CSRF alone does not establish JSON protection. |
| Versioned test adapter imports actual chat paths | Critical-journeys already mounts Home with installed gateway transport and fails unknown operations. | A copied implementation or patch artifact in meta would not test delivered Hub behavior. |

Installed dependency check: Hub's `@minion-stack/shared/dist/gateway/client.js:106` exposes `beginRequest`; `dist/gateway/types.d.ts:147` owns ChatMessage. This design does not add protocol fields; callback aliases remain client-local. Hub Bun lock SHA-256: `c5e63e6b708c7abc562da19c95d7c317f2fd329fc558b43267e3853d15e454f0`. The parent orchestrator reports frozen installation complete; implementation must record its own exact candidate gates.

All implementation choices are bounded by the parent. Two independent review passes remain pending. The fixed test adapter process protocol and self-only route classification are explicit review points, not unresolved product questions. Parent source already authorizes the required behavior; no user clarification is needed.
