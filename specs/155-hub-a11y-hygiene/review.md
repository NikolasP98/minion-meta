# Spec 155 review — two passes, 2026-11-27

Reviewer: the implementing agent, against hub master `49d4df6c`. The AS-IS counts come from a read-only agent's greps over the 855 production `.svelte` files; the alert classification is from reading five lines of context around each of the 125, not from running the pages.

## Pass 1 — is the AS-IS true, and does the mechanism hold?

| # | Finding | Evidence | Outcome |
|---|---|---|---|
| 1 | The program says "hard-coded `aria-label`". The same defect exists as `ariaLabel` props, `alt`, and English words inside label expressions. | 42 + 8 + 2 + 1 | All four are in the rule and in D1. |
| 2 | `title` and `placeholder` are literal in 95 places, but most are visible copy, and about half of the placeholders are format examples. Migrating them all is copy work with product choices. | recon | Counted by a second rule with a decrease-only baseline; not migrated here. Stated in Out of Scope. |
| 3 | "role=alert only for errors that need interruption" needs a rule someone can apply. | — | The rule: it follows something the user just did (save, submit, delete). Load failures, field messages and on-load text do not. |
| 4 | Field messages that lose `alert` could go unread. | `FormField.svelte:76` | Tied to the field with `aria-describedby` + `aria-invalid`; announced politely when they appear. |
| 5 | Most alerts come from five shared pieces. | `AsyncBoundary`, `DataTable`, `FormField`, `FormFieldset` | Fix there first; then the call-site list. |
| 6 | The toast library sets the roles itself. | `layout/Toaster.svelte:17` (zag props) | Error toasts are also sent through the shared assertive announcer if the library's role cannot be overridden; decided at implementation, stated in the PR. |
| 7 | `announce()` moves its region into the topmost open `<dialog>`. The workshop panels are not dialogs today, so announcements made while one is open go to the page behind. | `src/lib/a11y/announce.ts:21` | PR C fixes that as a side effect; noted for its proof. |
| 8 | Requiring `ariaLabel` on `DataTable` breaks compilation at 56 call sites. | recon | Intended, as for charts in spec 154; all named in the same PR. |
| 9 | The screen-reader library the program names is a new dependency. | `package.json` | Put to the owner; option 1 (no dependency) taken meanwhile. |

## Pass 2 — complete, consistent, testable?

| # | Finding | Outcome |
|---|---|---|
| 10 | A snapshot test that is updated blindly protects nothing. | The suite prints the diff; the PR shows it failing on a deliberate rename. Snapshots are small (one widget state each) so a diff is readable. |
| 11 | Snapshots must not depend on data or dates. | The fixture mounts each widget with fixed synthetic data and a fixed clock. |
| 12 | The panels must keep their look inside `Dialog`. | `presentation="bare"` with today's card markup inside, as `RelationshipPrompt` did in spec 152; demo with PR C. |
| 13 | A lint rule on literals must not flag non-text values. | The rule matches `aria-label="…"` / `ariaLabel="…"` / `alt="…"` with at least one letter; empty `alt=""` is allowed. |
| 14 | Constitution IV: new strings (yes, en + es), routes (none), API (none), permissions (none). | Stated in the plan. |
| 15 | The toast area is deferred on purpose (bundle size). Mounting it eagerly would undo that. | Move the announcement, not the mount: toasts are spoken by the shared announcer, which is already in the main bundle. |
| 16 | Classifying the 119 call-site alerts by reading the code: 24 are load / connection / per-field messages, 8 are on the page when it loads, 9 cannot be decided because one variable carries both a load error and an action error. | 24 → `status`, 8 lose the role, 9 stay alerts and go to the ledger (item 22). |

