# Contract: `POST /api/assistant/route`

Only external-facing interface this feature touches (it is an existing endpoint — this
documents the DELTA, not a new contract from scratch; see `spec.md` FR-003, FR-006, FR-011).

## Request

```
POST /api/assistant/route
Content-Type: application/json
Cookie: <existing session — requireAuth>

{ "text": string, "locale"?: string, "priorMode"?: RouteMode }
```

- `priorMode` is **new** (D7, FR-003). Optional. One of `"navigate" | "record_action" |
  "data_question" | "knowledge_question" | "chat"`. Sent by the client as the mode of its own
  last routed turn, when there was one in the current composer session. Absent on the first
  turn of a session (unchanged behavior, FR-004).
- `text`, `locale` unchanged from the shipped contract.

## Response

Always HTTP 200 (unchanged invariant, FR-011).

```
{ "decision": RouteDecision | null }
```

- `RouteDecision` shape unchanged (see `data-model.md`).
- **New reason for `null`** (D8, FR-006): the calling user has exceeded the per-user rate limit
  in the current window. This is indistinguishable from any other fail-open reason (missing
  key, timeout, malformed body) by design — a `null` decision has always meant "send the full
  envelope," and the rate limit adds one more cause without adding a new caller-visible branch.
- All existing `null` causes (missing `OPENROUTER_API_KEY`, timeout, non-200 from OpenRouter,
  oversized/malformed response body, zero usable manifest answers) are unchanged.

## Observability (unchanged shape, one new value)

The `assistant_route` PostHog event (`captureServerEvent`, `+server.ts:49-64`) keeps its exact
property set (`assistant_mode`, `assistant_cost_usd`, `duration_ms`, `p_mode`, `p_pages`,
`p_forms`, `p_data`, `p_brain`, `p_changelog`). A rate-limited call still fires this event with
`assistant_mode: 'unavailable'` and all `p_*` at `0` — the existing fallback values for any
`null` decision — so rate-limiting is visible in existing dashboards without a schema change.

## Timeout (D9, FR-007)

- Client round trip (`requestRouteDecision`, `turn-router.ts`): **1500 ms**, unchanged.
- Server → OpenRouter (`classifyAssistantTurn`, `assistant-router.service.ts`): **1200 ms**,
  down from 1500 ms. The server's call now always has budget to fail and return before the
  client's own abort fires.

## Backward compatibility

- A caller that does not send `priorMode` (e.g. an older cached client bundle, or any future
  caller of this endpoint) gets identical behavior to today — `priorMode` is additive and
  optional on both the wire and in `buildState`.
- No caller-visible change to error handling, status codes, or the decision shape.
