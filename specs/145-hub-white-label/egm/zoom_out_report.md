# Stage 5 — Initial zoom out

Reviewer: native fresh-context `/root/egm_s5_zoom`, persona zoom_out.md, standard zoom-out-standard.md. Completed. Target SHA-256: bfc5e090007f3b0975fdc2688fb33867600125fa059a3fb0a78f5091c3509c72. No implementation tests performed.

## Findings

- **S5-1 Major** — review-target.md lines 48,101,179–181 promise refresh on ordinary navigation but `(app)/+layout.server.ts:72–89` deliberately avoids reruns. Preserve that lifecycle; limit propagation to full reload/org reselection or provide a separately specified small refresh mechanism. **PROPOSE FIX applied**: narrowed the cross-session contract to full reload/org selection; no implicit page-wide load on ordinary navigation.
- **S5-2 Major** — line 187 proposes the action runtime for a mutation, but `src/lib/services/actions/definition.ts:3–13` and `runtime.svelte.ts:92–94` accept only ReadAction. **PROPOSE FIX applied**: use the existing `src/lib/api/json-mutation.ts` with local pending/error state, org generation guards, and committed-versus-refresh-pending distinction; runtime expansion excluded.

## Read receipts

Reviewer read all of persona (74 lines), standard (60), target (211), meta AGENTS.md (464), Hub CLAUDE.md (275), tenant service (29), organization provision service (367), Sidebar (889), Topbar (554), MinionLogo (373). Additional code searches/read checks covered organization service, root/app layouts, user-derived state, action definitions, mutation helper and settings mutation usage. No existing Hub-name resolver/grapheme helper/wordmark equivalent found. No source edits, compilation, browser use, external memory or conversation history consulted.

Context/root-focus/altitude passed. Simplicity and reuse required the two revisions above. Original target revision was reviewed; fixes must be checked by later fresh reviewers before final readiness is claimed.
