# Quickstart: validating this feature end-to-end

Prerequisites: a hub dev environment with a seeded org, a provisioned personal agent
(`personal-<uuid>`) whose `gateway_id` resolves (this feature does **not** fix that — it depends
on slice S0 of `proposals/2026-10-15-agent-harness-restoration.md` for an end-to-end gateway→hub
call to succeed at all; the hub-only checks below do not need it).

## 1. Prove `crm_query` is gone (User Story 2)

```bash
# gateway repo
grep -n '"crm_query"' minion/src/agents/minion-tools.ts        # expect: no match
find minion/src/agents/tools/knowledge -iname 'crm-query-tool*' # expect: no files

# hub repo
grep -n 'crm_query' minion_hub/src/lib/state/features/assistant-context.ts  # expect: no match
```

Run the gateway's registry test:

```bash
cd minion && pnpm vitest run test/ci/src/agents/tool-search  # TOOL_REGISTRY ⊆ TOOL_ORDER, and crm_query ∉ registry
```

## 2. Prove the typed dataset answers the question `crm_query` used to be asked (User Story 1)

Call the new endpoint directly against a seeded dev org (bypassing the agent loop, as a
smoke test — SC-001's methodology per Clarifications):

```bash
curl -s "http://localhost:5173/api/gateway/query/<domain>?agentId=personal-<seeded-uuid>&mode=<dataset-id>&from=2026-07-01&to=2026-09-30" \
  -H "Authorization: Bearer <dev server token>" | jq .
```

Expected: HTTP 200, `rows` non-empty for a seeded org with data in range, `truncated: false`
unless the seed exceeds `rowLimit`.

## 3. Prove isolation holds (User Story 3 / FR-005, FR-008, FR-014)

Run the persona negative-control suite (new in this feature):

```bash
cd minion_hub && bun run test src/routes/api/gateway/query/<domain>  # includes the 4-persona fixture from data-model.md
```

Manually confirm at least one case per persona:

```bash
# under-capability: a seeded user whose role lacks the dataset's capability → expect 403
curl -s "...&agentId=personal-<under-capability-uuid>&mode=<dataset-id>" | jq .   # { "error": "Your role does not permit ..." }

# cross-org: pass another seeded org's orgId that the agent's principal is NOT a member of
curl -s "...&agentId=personal-<seeded-uuid>&orgId=<other-org-id>&mode=<dataset-id>" | jq .  # org A data or 403 — never org B's rows
```

## 4. Prove the existing 13 endpoints are untouched (FR-013)

```bash
cd minion_hub && bun run test src/routes/api/gateway/query  # full query/* suite, including pos/stock/finance/etc. — all still green
```

## 5. Prove row/byte capping is query-level, not post-fetch (FR-006, FR-007)

Seed more rows than `rowLimit` for the dataset's table(s); confirm the response's `rowCount`
equals `rowLimit` exactly and `truncated: true` — and, if the service layer exposes query logs/
EXPLAIN in dev, confirm the executed SQL carries the `LIMIT` itself (not a `.slice()` in
application code after an unbounded fetch).
