# Quickstart — validating the Generic Agent Action Dispatcher

Prerequisites, in order. Steps 1–2 are owner actions and are **blocking**.

1. **Owner approval of the design** (Constitution V; proposal open question 2). Without it this
   feature may be planned but not implemented.
2. **Slice S0 landed** — the bridge returns 403 `ASSISTANT_GATEWAY_ASSIGNMENT_REQUIRED` for every
   gateway→hub call today (11/11 personal agents have `gateway_id NULL`). Until S0, only the
   in-app form half (User Story 4) is observable.
3. A non-production org. Never validate writes against FACES production data: a dry-run-first,
   `try/finally`-undo discipline applies to any script that touches real rows, and the 2026-10-15
   sweep exists because QA rows leaked into a live clinic.

## Local setup

```bash
cd minion_hub
bun install
bunx svelte-kit sync && bun run i18n:compile    # required in a fresh worktree
bun run dev:local                                # QA stack, not prod credentials
```

`unset SUPABASE_DB_URL` before any full test run; `HUB_TEST_DB_URL` only. A full `bun run test`
with `.env` present has reached production through `*.sql.integration.test.ts` before.

## Gates (run in the foreground, capture the exit code — never pipe into `tail`)

```bash
cd minion_hub
bun run check                       # svelte-check
bunx vitest run src/lib/routes src/routes/api/gateway src/lib/assistant src/server/services/rbac
bun run lint:design && bun run lint:tokens        # only if any .svelte changed
bun run format:check                              # CI's prettier gate covers every changed file
```

```bash
cd minion        # gateway
pnpm vitest run test/ci/     # NEVER `pnpm test` — the full suite crashes the box
```

## Scenario 1 — a write with no endpoint and no tool (proves the whole point)

`POST /api/pos/shifts/open` has no `actions/*` file and no gateway tool.

1. As a principal with `pos:edit` and no open shift, dispatch `{route:'/api/pos/shifts/open', method:'POST', body:{}, confirm:false}`.
   **Expect** `status: "preview"`, nothing created.
2. Repeat with `confirm:true`. **Expect** `status: "applied"` and a shift row.
3. Check the audit trail. **Expect** the human's name with the agent marker.
4. Repeat as a principal without any POS capability. **Expect** `403 refused_permission` naming
   the module and action, and no shift.
5. Disable the POS module for the org, repeat as the capable principal. **Expect** the same
   refusal the hub UI gives (module availability guard), not a success.

## Scenario 2 — fail closed on the unmapped families

1. Dispatch `POST /api/users/<id>/member-role`. **Expect** `422 refused_not_dispatchable`, no
   mutation, and a message that does **not** blame the user's role.
2. Repeat for `/api/servers/...`, `/api/roles/...`, `/api/tags` (the four largest unmapped
   families, 61 pairs between them).
3. Dispatch `GET /api/pos/sellables`. **Expect** refusal (writes only).
4. Dispatch `/api/pos/../../api/users/x`, `//api/pos/shifts/open`, and a percent-encoded
   separator. **Expect** refusal before any dispatch.
5. Dispatch `/api/gateway/actions/dispatch` itself. **Expect** refusal (no recursion).

## Scenario 3 — parity matrix (the acceptance evidence for SC-004)

For every manifest row × 4 personas (owner, module-editor, view-only, module-disabled), assert
the dispatch decision equals the human decision for the same route and method. Run as a test, not
by hand; the matrix is the deliverable.

Include at least one record-level ("own records only") persona on CRM and one masked-field
persona, because those are the two checks the current bridge omits entirely.

## Scenario 4 — money correction

1. Create a ticket in the QA org, pay it, close the shift, open a new one.
2. Dispatch the void with `confirm:true`. **Expect** the refund row in the **refunding** shift,
   not the selling one.
3. Lock the period, repeat. **Expect** the period-lock refusal (HTTP 423 behavior of the human
   route), relayed as `refused_validation`, not as a permission problem.

## Scenario 5 — in-app form submit (independent of S0)

1. Open `/crm`, ask the assistant to register a new customer.
2. **Expect** the form to mount, fill, and submit on instruction; the record exists.
3. Repeat as a user with view-only CRM. **Expect** neither a fill nor a submit tool offered, and
   the assistant to say so rather than navigating into a dead end.
4. Reload the transcript. **Expect** no re-submit (the `final`-events-only rule).

## What this quickstart does not prove

- Anything about the 171 unmapped write pairs (out of scope by design).
- The MCP surface (slice S5) or typed reads (S4).
- That the existing 19 hand-written bridge endpoints gained module-enabled, owner scope or
  masking — they did not; that is slice S2.
