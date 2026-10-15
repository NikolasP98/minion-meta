# Contract — in-app assistant form submit

## `FormBinding` (hub `src/lib/assistant/forms.ts`)

```ts
submit?: () => Promise<{ ok: boolean; message?: string; recordId?: string }>;
```

Optional. A page that provides it opts into an agent-completable form; the 8 existing
`registerForm` call sites keep compiling untouched until each is edited.

## `FormDef`

```ts
write: { module: Module; action: PermAction };   // new, required
```

## Registration rule

`registerForm` registers:
- `fill_<id>` — unchanged, **but** only when `canAct(def.write.module, def.write.action)`;
- `submit_<id>` — only when the binding provides `submit` **and** the same capability holds.

The assistant's form catalog filter changes from `FORM_CATALOG.filter(f => canViewPath(f.route))`
(`src/lib/state/features/assistant-context.ts:133`) to the same predicate ANDed with
`canAct(f.write.module, f.write.action)` (`src/lib/access/can.svelte.ts:43`).

## Invariants

1. A submit calls the page's own handler in the user's own session — the ordinary human API and
   the central write guard still run. No privileged channel is created.
2. A user with view-only access to a form's page is offered neither tool.
3. A refused submit reports the server's reason; it never reports success.
4. `runner.ts`'s existing rule (execute `minion-ui` blocks only for live `final` events, never
   on history reload) must keep holding, or a replayed transcript could re-submit.
