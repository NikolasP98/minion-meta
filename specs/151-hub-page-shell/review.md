# Spec 151 review — two passes, 2026-11-26

Reviewer: the implementing agent, against hub master `c51c5b62`.

## Pass 1 — is the AS-IS true, and does the mechanism hold?

| # | Finding | Evidence | Outcome |
|---|---|---|---|
| 1 | The brief puts the fallback `<title>` in `app.html`. A literal there sits beside the `<title>` SvelteKit emits from `<svelte:head>` (two titles) and cannot carry the white-label name. | `src/app.html`; `getBranding()` is per request | Fallback lives in the root layout's `<svelte:head>`. |
| 2 | The first draft said "a page's own title still wins" over a title set by `PageHeader`. It does not: the deepest component's `<title>` wins, on the server and on the client, whatever the order in the markup. | measured: parent with `<title>Own</title>` + child with `<title>Child</title>` → "Child" in a server render and in a client mount, with the head before or after the child | `PageHeader` gets `documentTitle` (default `true`); the 67 files with both pass `false`; a source test enforces it. No existing title changes. |
| 3 | A header inside a record peek would rename the browser tab to the peeked record. | `RecordPeek` renders page bodies with their headers | `PageHeader` does not set a title when `inPeek()`. |
| 4 | `BookingsView` (shared) renders a header and is used by two routes that both set their own title. | `scheduling/bookings/PageBody.svelte`, `crm/[contactId]/PageBody.svelte` | Its header is opted out. |
| 5 | The default hub name is "MINION Hub", not "Minion Hub". | `resolveBranding(null).fullName`; test output | Examples and the demo corrected. |
| 6 | A navigation label string already exists and is unused. | `messages/*.json` `nav_primaryAria` | Reused; one new string only ("Skip to content"). |
| 7 | Nothing in app CSS or tests selects the `main` element that `PageShell` rendered. | `grep` for `main {`, `main[`, `closest('main')`, `getByRole('main')` (only public pages and standalone fixtures match) | Safe to render a `div` inside the shell. |

## Pass 2 — complete, consistent, testable?

| # | Finding | Outcome |
|---|---|---|
| 8 | "landmark-* rules pass on all swept routes" cannot be shown by the gate: those rules are best-practice tagged and the gate runs WCAG A/AA tags only. | Stated in AS-IS and SC-002; the shell's landmarks are proven by tests (one main, no nesting, named nav). A browser run of the best-practice rules is listed as not covered. |
| 9 | The skip link must not move the layout and must not be a hash navigation. | Fixed position over the shell; activation focuses `#main-content` directly. |
| 10 | Pages without a header (canvases, flow editor) get the hub name alone. | Accepted: `document-title` passes; a page-specific title for them is a follow-up. |
| 11 | Constitution IV: one new string in both locales; no route, API or permission. | Confirmed. |
