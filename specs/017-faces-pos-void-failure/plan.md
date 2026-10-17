# Implementation Plan: POS void refusal names its reason

**Spec**: `specs/017-faces-pos-void-failure/spec.md` | **Repo**: minion_hub (`fix/pos-void-role-reason` → `master`, draft PR; owner merges)

## Technical context
- Page: `src/routes/(app)/pos/appointments/+page.svelte` (`voidTickets`, `cancelPaid`, `ctxEntries`, `openTrayMenu`, the `cancel-paid` ConfirmDialog).
- Pure menu rules: `src/lib/components/scheduling/calendar-context-menu.ts` (+ `.test.ts`).
- Capability read: `canAct('pos','manage')` (`$lib/access/can.svelte`), the same legacy string the server's `requireOrgCapability(locals,'pos','manage')` enforces.
- i18n: `messages/es.json`, `messages/en.json` (paraglide; `bun run i18n:compile`).

## Approach (smallest complete change)
1. Add `canVoid` to `calendarMenuEntries`; paid event + no `canVoid` ⇒ no destructive entry (offering `delete` would strand the ticket's money). Tray menu: no-op without `canVoid`.
2. Add `voidRefusalKey(status, body)` next to the menu rules (pure, tested) and map it on the page to two new keys + the server text; keep the dialog's failure line reactive via a `voidFailure` state.
3. No server changes. No RBAC changes.

## Gates (foreground, exit codes captured)
`bunx prettier --check <changed>`, `bun run vitest run src/lib/components/scheduling`, `NODE_OPTIONS=--max-old-space-size=6144 timeout 900 bun run check`, `bun run lint:design && bun run lint:tokens`.
