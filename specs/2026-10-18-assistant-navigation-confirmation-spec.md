---
id: 2026-10-18-assistant-navigation-confirmation-spec
title: User-confirmed assistant navigation
stage: spec
pass: 1
status: implementing
verdict: approved
created: 2026-10-18
updated: 2026-10-18
repos: [minion_hub]
proposal: 2026-10-18-assistant-navigation-confirmation
---

# User-confirmed assistant navigation

## 0. Product

The user's catalog-price question must not move them away from the conversation. A model can propose a destination, but the user chooses whether to open it. Explicit open requests show one actionable link. This narrows the previously documented navigation gap; it does not change data-query authority or promise production adoption before release.

## AS-IS

Hub global-tools.ts registers hub.navigate with an automatic goto effect. Legacy fence execution reaches model-context.executeTool, while native document.modelContext registration directly invokes the tool implementation. Guarding only the legacy dispatcher leaves the native path open. MarkdownMessage.svelte synthesizes Opened text independently of execution results. runner.ts can execute further fill/guide commands after navigation. Production49d5426 and reviewed81388bd5 have identical affected implementations; implementation must use and recheck current master.

## TO-BE and invariants

1. hub.navigate validates a visible, permitted internal destination and returns a proposal with navigated:false and requiresUserAction:true. It never invokes goto, including through native registration.
2. The UI displays a localized Open link for the validated proposal, including when ordinary prose accompanies the fence. The existing internal-nav link-click handler performs navigation only after the user clicks. Preserve query parameter encoding, locale routing, RBAC visibility and invalid-path rejection. Raw model hrefs are not trusted.
3. No historical, duplicate, delayed or silent follow-up message causes automatic navigation. No success text or history implies a page opened before its click.
4. A legacy command batch containing navigation is detected before execution and stops all dependent fill/guide commands, including commands ordered before navigation. It is a terminal proposal, not a retryable tool failure, and cannot trigger silent follow-up loops. Do not apply a target-page operation to the current page.
5. Existing non-navigation read tools and source links keep working. Information requests can still be answered by catalog_query after the gateway release. This guard does not manufacture unavailable data or restore SQL.
6. No intent regex, model-issued grant, dependency, database change or new cross-repository protocol. Navigation authority is the actual user's existing link click.

## DELTA and verification

| Boundary | Change | Evidence |
| --- | --- | --- |
| Shared tool implementation | Replace goto with validated proposal | Legacy and native execution never invoke navigation; invalid/off-origin/denied paths rejected |
| Message rendering | Open link instead of fabricated Opened | Render with and without prose; preserve locale/query; valid user click navigates |
| Batch execution | Stop dependent actions on pending navigation | Navigation plus fill/guide leaves current page untouched; no silent retry |
| Prompts and translations | Describe click-to-open and answer-first | English/Spanish and prompt contract tests |
| Replay | Proposal remains inert | History, duplicate final replies and silent follow-up do not navigate |

## Review

Two independent passes must approve behavior and boundary coverage before implementation. Record their findings in the review sidecar. Preserve any discovered limitation in the proposal and a source TODO at its exact site.

## Out of scope

Automatic navigation on natural-language intent, request-wide effect grants, changes to business writes beyond dependent legacy navigation batches, native independent fill-call authorization (native calls have no shared batch/run context), gateway deployment, gateway CI tuning and model replacement.

## Verification

Run focused tool/runner/rendering tests and existing related suites, bun run check, bun run test, bun run build, bun run lint:design and bun run lint:tokens. Use loopback QA only for browser proof of no automatic page change and explicit link click. Record exact CI/source/deployment states; no production database or model test is authorized by this spec.

## Reviewed boundary requirements

Use one pure destination resolver in tool execution and historical/live rendering; rendering never executes a tool. Validate canonical visible routes and plain string query parameters, encoded through URLSearchParams. Reject off-origin, protocol-relative, backslash, scheme and encoded traversal inputs; test delimiter and quote injection. Revalidate current canViewPath at render and click, retaining server route enforcement after org/permission changes.

Pre-scan navigation batches even if the destination is invalid; suppress dependent fills/guides before and after navigation. Pending user action takes precedence over every automatic follow-up trigger, including earlier reads and errors. Suppressed effects cannot produce Filled, Walkthrough or Opened labels. Update every Call AFTER hub.navigate instruction to require a real user click and current-page confirmation.

Test the actual native registration callback. Independent native fill/guide calls and general-purpose browser automation clicking links remain outside this specific tool/fence guard; this is not request-wide effect authorization.
