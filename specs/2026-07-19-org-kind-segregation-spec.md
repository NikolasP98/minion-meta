# Org Kind Segregation — business vs personal

**Date:** 2026-07-19
**Status:** Spec, ready to implement
**Scope:** `minion_hub`. Establishes one source of truth for "what changes when an org is personal", stylizes the org picker with per-kind icons, and makes **Pulse personal-only**.
**Builds on:** `organizations.kind` (shipped `798f9114`), `activeOrgKind` in the app layout, `PERSONAL_HIDDEN_MODULES` in `sections.ts`.

---

## 1. Intent

Two org kinds, deliberately **lax** for now — there is little real behavioural difference yet, and the spec should not invent one. What it must do is:

1. Make the kind **visible** (you can tell at a glance which org you're in / switching to).
2. Give the hub **one place** to ask "what does this kind change?", so per-kind rules stop accreting as scattered `if (kind === 'personal')` checks.
3. Encode the one rule that exists today: **Pulse is personal-only.**

Everything else stays shared. Adding a rule later should be a one-line edit to the policy module, not a hunt through components.

## 2. Current state

- `organizations.kind text not null default 'business' check (kind in ('business','personal'))` — live in prod. PINONITE = `personal`; MINION + FACES SCULPTORS = `business`.
- `activeOrgKind` reaches `page.data` via `(app)/+layout.server.ts:190`, consumed by `Sidebar.svelte:49` and `Topbar.svelte:29` → `getDynamicPluginsSections(...)`.
- `sections.ts:326` `PERSONAL_HIDDEN_MODULES = {pos, stock, workforce}`; gate at `:351`.

**Two gaps:**
- `loadOrganizationsForUser` selects only `id, name, slug` (`organizations.service.ts:66`) — so the org **list** carries no `kind`, only the active org does. Per-item icons are impossible until this changes.
- There is no personal-**only** mirror of `PERSONAL_HIDDEN_MODULES`, so **Pulse currently renders in business orgs too** (confirmed: it appears under FACES SCULPTORS).

## 3. Data & types

`kind` is already correct in the DB; no migration needed. Thread it outward:

```ts
export type OrgKind = 'business' | 'personal';
export interface OrgSummary { id: string; name: string; slug: string | null; kind: OrgKind; }
```

- Add `kind` to the `.select()` in `loadOrganizationsForUser` (and the admin org list if it feeds any picker), defaulting to `'business'` when absent so older rows/pending migrations degrade safely.
- `page.data.organizations[]` then carries `kind` per org; `page.data.activeOrgKind` stays as-is.

## 4. The policy module (single source of truth)

Create `src/lib/org-kind.ts` — pure, no Svelte, unit-testable:

```ts
export const ORG_KIND_POLICY = {
  business: { hiddenModules: new Set<string>(['pulse']),
              icon: 'Building2', label: 'Business' },
  personal: { hiddenModules: new Set<string>(['pos', 'stock', 'workforce']),
              icon: 'User',      label: 'Personal' },
} as const;

export function isModuleVisibleForKind(moduleId: string, kind: OrgKind): boolean {
  return !ORG_KIND_POLICY[kind].hiddenModules.has(moduleId);
}
```

One symmetric map replaces both the existing "hidden for personal" set and the missing "hidden for business" set — Pulse is simply hidden for `business`. `sections.ts:351` becomes a call to `isModuleVisibleForKind(moduleId, orgKind)`, deleting the local `PERSONAL_HIDDEN_MODULES` constant.

Default when kind is unknown/undefined → treat as `'business'` (matches the DB default and today's behaviour for every existing org).

> Deliberately NOT built: per-kind theming, separate route trees, per-kind dashboards, a `kind`-aware RBAC layer. The difference is genuinely small right now; a lookup table is the whole abstraction it deserves. Add more only when a second real rule appears.

## 5. Org picker

Current: `OrgPicker.svelte` shows a single `Building2` on the trigger (`:104`); the dropdown items (`:120-137`) are **plain text** with a `Check` on the active one.

Target:

- **Trigger** — icon reflects the *active* org's kind (`Building2` for business, `User` for personal), not a hardcoded `Building2`.
- **List items** — each row gets its kind icon, so the three orgs are visually distinguishable at a glance:

```
  ⌂  FACES SCULPTORS   ✓
  ⌂  MINION
  ☺  PINONITE
```

- Keep the existing active-row `Check` and the `Loader2` switching state — no behavioural change to switching.
- Group personal orgs after business ones (stable secondary sort by name) so the two classes read as distinct blocks. With 3 orgs this is cosmetic; it pays off as the list grows.
- Optional, low cost: a small muted `Personal` caption on personal rows. Icon alone is ambiguous to a first-time viewer; the caption removes the guess. Recommended.

**Styling rules (non-negotiable):** invoke the `ui-design-governance` skill before editing. Semantic tokens only — `--color-surface-*`, `--color-text-*`, `--space-*`, `--radius-*`, `--layer-*`. Icons via `lucide-svelte` at the existing `size={12}` for the trigger and the dropdown's established icon size. No raw hex, no numeric z-index. Run `bun run lint:design && bun run lint:tokens` after.

**Accessibility:** the icon is decorative — the row's accessible name must remain the org name (icons get `aria-hidden`), and kind must not be conveyed by icon/colour alone (hence the caption).

## 6. Pulse becomes personal-only

Adding `pulse` to `business.hiddenModules` removes it from business sidebars. Two follow-ons so it's actually gated, not just hidden:

- **Nav** — handled by the policy module (§4).
- **Route guard** — hiding a nav item is not access control. `/pulse` and `/settings/pulse` should refuse under a business org. Simplest correct form: in each `+page.server.ts`, after resolving the tenant, `error(404)` when the active org's kind is `business`. 404 over 403 — a business org shouldn't learn the route exists. This complements, and does not replace, the existing `requireOrgCapability(locals, 'pulse', …)` RBAC gate.

## 7. Verification

- Unit: `isModuleVisibleForKind` — pulse hidden for business / shown for personal; pos+stock+workforce hidden for personal / shown for business; unknown kind behaves as business.
- Unit: `loadOrganizationsForUser` returns `kind` per org and defaults to `'business'`.
- Manual (both orgs): PINONITE sidebar shows Pulse and hides POS/Stock/Workforce; FACES SCULPTORS shows POS/Stock/Workforce and **no Pulse**; picker shows a person icon on PINONITE and a building on the other two; `/pulse` 404s while a business org is active.
- Gates: `bun run check` stays 0 errors, `lint:design` + `lint:tokens` show no new debt.

## 8. Sequencing note

§3 (thread `kind`) must land before §5 (per-item icons) — the picker cannot render what it isn't given. §4 and §6 are independent of the picker and can ship first; they're the behavioural half, and §5 is the visible half.
