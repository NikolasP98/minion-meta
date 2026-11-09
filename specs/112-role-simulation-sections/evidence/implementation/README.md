# Implementation qualification

The guarded QA runtime uses loopback Supabase Auth and PostgreSQL. These receipts prove local behavior; they do not prove a merged or production deployment. [qualification.json](qualification.json) records the candidate, current gates and delivery boundary. Earlier receipts remain historical when a later source change supersedes them.

| Behavior | Runtime evidence |
| --- | --- |
| One avatar item, single-screen searchable role tray, brief real-data warning | [Picker](role-picker.png), [search](role-search.png) |
| Full viewport frame, avatar-only Finish | [Desktop](viewer-frame-desktop.png), [avatar](avatar-finish.png), [mobile zero-page shell](zero-mobile.png), [mobile avatar](zero-mobile-avatar.png) |
| Permitted real edit, foreign-record denial, masked PII, actual actor audit | [API receipt](live-write-api.json), [audit receipt](live-write-audit.json) |
| Contextual access without Settings permission | [Real access-manager API receipt](actual-manager-api.json), [side-menu action](actual-access-more.png), [editor](actual-access-editor.png) |
| Personal sidebar and home-card access controls | [Home](personal-home-actions.png), [keyboard-opened card menu](keyboard-card-menu.png), [card editor](personal-card-editor.png) |
| Draft/review/Apply, current-page revocation and fallback | [Draft](access-deny-draft.png), [review](access-review.png), [fallback](policy-fallback-shell.png), [committed policy](policy-applied.json) |
| Policy restored; actual memberships unchanged; task contacts removed | [Read-only database verification](policy-audit-cleanup.json), [restored revision](policy-restored.json) |
| Two tabs reload under the same selected authority, then return together on avatar Finish | [Before](cross-tab-before.json), [active](cross-tab-active.json), [finished](cross-tab-finished.json) |

[Final-source zero-page HTTP receipt](zero-route-proof-08ef.json) distinguishes shell200 from CRM API403 and the route-data200 redirect; a successful document status is not treated as forbidden-page data access.

Final local gates: [1,040 files and 9,273 tests and 3 architecture checks](full-suite-final.txt), [type check with 0 errors and 0 warnings](typecheck-08ef-final.txt), [full production build](production-build-08ef-final.txt) and [build receipt](production-build-08ef-receipt.json). These use frozen source tree `08ef834a`.

Native tests independently exercise real verified sessions across two organizations, session-lock ordering, revocation, expiry, selected-role deletion, private-table RLS and a genuinely warm permission cache. The attachment fixture has its own native receipt; it is not counted as part of the 11 session/RLS cases. Seed verification includes idempotent replay.

Final visual review reproduced an off-mode assistant overlapping the new tray primary action: [before hit-test](assistant-overlap-before.json). The repaired enabled controls now receive their clicks: [Apply role](assistant-cta-after.json), [Review changes](assistant-access-cta-after.json). With the assistant initially open, [suspension preserves its unsent QA draft](assistant-suspended.json); native Escape then [restores the panel and draft](assistant-restored.json). No message was sent or policy applied in this regression. Earlier overlap screenshots remain historical evidence.

No merge or production release has occurred. The configured signer recovered. Final signed Hub source `2f1fa81b` is published; fresh CI is running. Final meta evidence publication and human merge remain separate.
