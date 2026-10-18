---
id: 2026-10-17-agent-dynamic-tools-spec
title: Current tools and answer-first business queries
stage: spec
pass: 1
status: implementing
verdict: approved
created: 2026-10-17
updated: 2026-10-17
repos: [minion, minion_hub]
proposal: 2026-10-17-agent-dynamic-tools
---

# Current tools and answer-first business queries

## 0. Product

The user approved the audit recommendations on 2026-10-17 and requested dynamic tools and current references using Ponytail. This implementation covers the incident repair and discovery foundation (S1/S2); the broader lifecycle ledger remains explicit in the proposal. Production release and model replacement require separate qualification. No self-updating executable code or dependency upgrades are introduced.

## AS-IS

A reported catalog-price question produced repeated discovery and shell no-ops, then offered navigation instead of an answer. Source baseline: gateway DEV `1e7ec283ebf095eabb54258a85f9bf1866e0d74e`, Hub master `69516f2a0a16b7c0471409e2424f16dcb0bba03a`. Gateway `tool-search/tool-index.ts` stores one global index; `load-tools-tool.ts` validates static registry ids and postpones availability to the next turn. Hub `briefing.ts` encourages navigation for questions. No native catalog-price query binding exists. Shared Hub errors lose status/retryability. Capability endpoint404 enables legacy access. Detailed production evidence stays outside this public change.

## TO-BE and invariants

1. Data questions produce a grounded answer and source links. Navigation instructions apply only to explicit navigation requests. Missing authority/data produces an honest limitation.
2. Each run discovers tools from its own policy-filtered executable instances, including live Hub declarations and custom tools. Another run cannot overwrite its catalog. Removed/denied tools never become callable through discovery.
3. The deployed Hub owns a read-only capability declaration next to its implementation. Gateway fetches declarations each tool build. Compatible additions need no gateway code change. Retirement removes a tool on the next build; an old invocation is rejected by contract revision before data access.
4. Discovery returns current schemas and provenance. Loading may activate tools within the running SDK session; it must never claim a schema is callable before activation. No browser navigation or shell workaround is needed to answer a data query.
5. Hub manifest identity is derived by `resolveAssistantPrincipal`; execution repeats RBAC and tenant checks. Manifest metadata never grants authority. Requests never choose an arbitrary host, method or action route.
6. Tool errors retain status, stable code, retryability and outcome. The transport never automatically replays a write; an ambiguous outcome triggers answer-only recovery within the current embedded run. Higher-level provider fallback still needs a request-wide receipt and budget. Fetches accept cancellation and have finite deadlines.
7. Personal assistant runs have a bounded execution policy. Repeated discovery, permanent errors, identical outcomes and total call exhaustion lead to one answer-only recovery step, then termination. Coding-agent limits remain unchanged.
8. Native SDK/plugin/skill references describe runtime inventory and installed versions. Remote docs remain references, never executable update instructions. There is no guarantee that external vendors will never deprecate an API.

## Cross-repository contract

`GET /api/gateway/query/tool-catalog?agentId=...&orgId=...` returns private/no-store JSON:

```ts
{ schemaVersion: 1, revision: string, generatedAt: string,
  principalId: string, orgId: string,
  tools: [{ name: string, version: number, lifecycle: 'active',
    description: string, method: 'GET', path: string,
    permission: { module: string, action: 'view' },
    inputSchema: { type: 'object', properties: object, additionalProperties: false },
    source: { label: string, path: string }, contractRevision: string }] }
```

Revision is SHA-256 of the stable contract projection, excluding timestamps. Gateway accepts only supported schemaVersion, bounded declarations, unique safe tool names, GET query paths, same-origin relative sources, and non-executable JSON schemas. Names must not collide with native/plugin/custom tools. Unknown versions, malformed feeds or auth failures add no remote tools. Gateway binds the manifest org to invocation; users cannot override agentId/orgId/path/method/revision through tool arguments. The endpoint must recheck authorization; discovery is advisory.

Gateway invokes the declared query with `contractRevision` plus validated tool arguments. Hub rejects mismatch with HTTP409, code `TOOL_CONTRACT_CHANGED`, retryable=false, before business reads. No automatic retry is introduced. Fresh schema discovery happens on the next tool build. Older Hub deployments return no remote tools; there is no legacy permission bypass.

First declaration: `catalog_query`, GET `/api/gateway/query/catalog`, permission `pos.view`, version1, source `/pos/catalog`. Input kind is product|service|bundle|all (default product); limit is integer1..20 (default5). Output includes asOf, currency, currencySource=pos_settings, bounded descending-price items, matchedCount, missingPriceCount, maxPrice, tiedAtMaximum, truncated and source. Active organization sellables only. Null prices are excluded from ranking and counted; no costs or inferred FX comparisons. Ties beyond limit are reported by count. Currency comes from existing POS settings because product rows have no individual currency.

SDK catalog and builder references reuse this declaration instead of duplicating the new query description. Existing undeclared endpoint inventory is informational and does not prove runtime availability.

## DELTA and verification

| Boundary | Change | Required evidence |
| --- | --- | --- |
| Hub instructions | Answer first, explicit navigation only, remove disabled SQL recommendation | Prompt contract tests |
| Hub catalog | Principal-filtered live manifest and bounded price handler | Denied/org isolation, null/empty/ties/kinds/currency tests, route version gate |
| Gateway adapter | Live typed tools with identity-bound dispatch | Added/retired/version mismatch, malformed schema/path, collision, org override, abort/error tests |
| Discovery | Run-local index and same-run activation | Concurrent disjoint runs, custom tools, stale reload, actual SDK activation |
| Transport | Structured failures, cancellation, header parity | 403/404/503 and unknown-write outcome tests |
| Execution | Personal-run progress bound and final recovery | Repeated discovery/no-ops/errors and mixed batches terminate |
| References | Live inventory and schema provenance | Tool schema revision changes; docs do not imply unavailable tools are executable |

Two independent spec passes (behavior and authority) precede edits. Focused tests precede repository gates. Candidate source, tests, CI, local runtime and production deployment are separate evidence levels. Any unavailable runtime proof remains a release limitation in the proposal and code TODO ledger where applicable.

## Review record

Pass1 (dynamic_catalog, behavior): approved; same-run activation must be proven against declared SDK1.1.0 rather than the old local dependency tree. Pass2 (execution_guard, authority): approved; reject prototype keys, encoded traversal, query/fragment injection and malformed schema fields; bind identity after model arguments; reject stale revisions before data reads; recheck endpoint authority. Both passes completed before implementation.

## SDK compatibility correction

The supported SDK1.1 resource-loader systemPrompt option replaces the obsolete private `_rebuildSystemPrompt` override in both ordinary runs and compaction. An actual SDK session test proves the prompt persists after same-run tool activation. SDK registration receives the explicit permitted tool names so defaults cannot reintroduce denied tools.

## Scope integration correction

Live query tools carry an internal required Hub scope; custom scripts require execution scope. The agent-type policy enrolls actual runtime instances without bypassing subsequent profile/agent denies or Hub RBAC. Scope restrictions must survive config validation and resolved-agent projection. Pipeline tests cover default standard agents, restricted agents, removed scopes and explicit denies.

## Out of scope

Automatic dependency upgrades, model changes, deployment, arbitrary endpoint generation, and the separate UI/cancellation/approval lifecycle work remain outside this implementation.

## Verification

Run gateway `pnpm generate:tools`, focused Vitest discovery/transport/progress suites, `pnpm check`, `pnpm build`, and `pnpm test`. Run Hub focused contract/PGlite/prompt suites, `bun run check`, `bun run test`, and `bun run build`. Validate proposal/spec indices. Record exact results and missing runtime qualification before requesting release.
