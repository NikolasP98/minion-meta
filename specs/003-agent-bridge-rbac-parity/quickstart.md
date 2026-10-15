# Quickstart — proving agent bridge RBAC parity

Validation guide. No implementation code here.

## Prerequisites

- Read-only checkouts used for the spec: hub `~/.cache/claude-tmp/hub-ro` (`origin/master` `7d917ed0`),
  gateway `~/.cache/claude-tmp/gw-ro` (`origin/DEV` `f2de5e00534`). Implementation happens in a fresh
  worktree per repo, on a slice branch off each repo's registered PR base (hub → `master`,
  gateway → `DEV`; re-read `repo-policy.yaml` at the time).
- Hub: `bun install`; in a fresh worktree also `bunx svelte-kit sync` and the i18n compile step
  before type-checking, or `check` fails for unrelated reasons.
- A test org with: one role holding `pos:create` and not `pos:edit`; one role with CRM view/edit
  restricted to owned records and its CRM field level below the sensitive tier; one module toggled off.

## ⚠ Gate commands — the registered one is unsafe

| Repo | Registry says | **Run this instead** | Why |
|---|---|---|---|
| `minion_hub` | `bun run test` | `bunx vitest run src/routes/api/gateway src/server/services/rbac src/server/auth` + `bun run check` | the full suite's `*.sql.integration.test.ts` have reached **production** (10-minute hub-wide 500s, 2026-09-03). Never run it with a populated `.env`. |
| `minion` | `pnpm test` | `pnpm vitest run test/ci/` + `pnpm check` | the full suite crashes the box. |

The audit's own baseline for the same hub paths was **35 files / 409 tests passing** — use it as the
before-figure.

## Proving each story

### US1 — disabled module stops the agent (FR-002, FR-004, FR-027)

1. Disable a module (e.g. `stock`) for the test org.
2. Call one bridge read and one bridge write for that module with a principal that holds the
   capability. Expect the human API's refusal (404 `module_disabled`), and no row read or written.
3. Re-enable; expect the pre-change behaviour.
4. For an org with **no** `app_modules` rows at all, expect every call to still be served.
5. Unit: force the module-state read to fail; expect a refusal, not a pass.

**Automated**: one negative-control pair per module family (11 × 2 = 22 cases, SC-011).

### US2 — no un-gated side doors (FR-008, FR-009, FR-010, FR-011)

1. With a browser session for a zero-capability member: the custom-tool catalogue returns no
   `scriptCode` and no `envVars`; agent-memory recall, agent-memory delete and message ingest all
   refuse.
2. With the gateway server token and an `agentId` owned by another member: agent-memory recall and
   delete refuse.
3. A `crm:view`-only role requesting the insight gets no revenue figure; a role holding both
   capabilities with a lowered finance field level gets revenue masked the way `/finances` masks it.

### US3 — owner scope and masking on CRM (FR-005 … FR-007, FR-029)

1. As the owner-scoped role, list/search CRM through the agent: only own records.
2. Update and tag a contact owned by someone else: refused as the human PATCH refuses it, nothing
   written. Check the row afterwards, not just the status code.
3. Search CRM conversations: phone numbers and emails in the returned text are masked. Assert on the
   **endpoint response**, not on a rendered view.
4. As an un-restricted, full-field-level role: results identical to before the change.

### US4 — capability parity (FR-012 … FR-015)

1. Run the parity test. It must fail when a row is removed from
   `contracts/actions-human-path-map.md`'s mirrored constant, and fail when a new `actions/*`
   directory has no row — check both by temporarily breaking it.
2. End to end: the `pos:create`-only cashier rings a POS sale through the agent (today: 403).
3. Confirm the four newly-stricter writes refuse for a `create`-only role and succeed for an
   `edit` role, and that both outcomes are in the release note.

### US5 — fail closed and no credential in scripts (FR-016 … FR-019)

1. Stub `query/tool-permissions` to 404: every permission-carrying tool is dropped, one log line per
   TTL window. Repeat for a network error, a non-JSON body and a 500 — 4 of 4 deny.
2. Run a published custom tool and dump the child process environment: no hub credential present.
3. The same script's hub call still succeeds through the mediated path.

### US6 — actor and workflow (FR-020, FR-021)

1. Perform each of the six previously-unstamped writes through the agent; the recorded actor reads
   "<person> (via agent)".
2. Configure a blocking status workflow; the agent's order and ticket status changes are refused the
   way the human handlers refuse them.

## Final check before each PR

- `bun run check` (hub) / `pnpm check` (gateway) clean — capture the exit code directly, never
  through a pipe; a piped gate returns the pipe's status and has hidden a real type error before.
- The targeted vitest paths above pass, and the count is ≥ the 409-test baseline for the hub paths.
- The PR body names: the slice, the deviation from the registry's `test` command and why, every
  access-narrowing change, and the spec path.
- Owner merges (Constitution V). Do not self-merge, including with `--admin`.
