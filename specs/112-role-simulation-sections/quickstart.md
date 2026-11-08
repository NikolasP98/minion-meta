# Local qualification

Use the isolated checkout and guarded loopback QA workflow only. Inspect qa:status before modifying a shared stack; never seed production.

1. Frozen Bun install, i18n compile, focused Vitest failures then fixes.
2. Apply migration through guarded QA runner; seed two orgs, owner/admin/custom roles, users:manage without settings:manage, denied pages, own-record and masked-field scenarios.
3. Real QA sign-in → avatar → role → Apply. Verify reload, full perimeter and direct API/record/field restrictions. Finish only through avatar, including no pages. Check org/session change, stale tabs, role removal and expiry.
4. Edit contextual access from main page/header, sidebar More/keyboard and personal-home card. Verify source data floors, inherited/explicit deny and conflict retention. Inspect atomic audit metadata.
5. Prove unsupported new gateway/Workforce/assistant credentials/work are denied; do not claim independent old jobs cancelled.
6. Exact-candidate check/test/build, design/token lints, i18n, route/seed gates and browser shell/data/API evidence. Independent Standards and Spec reviews; draft PR, human merge.
