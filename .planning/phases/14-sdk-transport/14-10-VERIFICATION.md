---
phase: 14-sdk-transport
plan: "10"
status: isolated_candidate_scoped_pass
requirements_completed: []
---

# Independent Site consumer verification

Root inspected the source diff and meaningful fixtures against the complete14-11 archive. Snapshot service SHA fb7a2a48c0ad68870b50e25db961f9932c73f0bbc0878212cd53015dbe54b823, fixture fa0f2127427509e3e2ea574a0d3b81f97786ff4029e6136b533ce863a4244dff, native config6beefe2ea15ac6981c2f523d2a9b451fb158006992c4931f1043b55c233a363d. Root repeats22/22 cases (2.72s) and strict focused types successfully.

Full native SvelteKit sync plus svelte-check on the private candidate passes0errors/0warnings. Sync still reports existing csrf.checkOrigin deprecation; this is not a zero-maintenance-debt claim. Logs are .qc-checks/root-independent-tests.log, root-independent-types.log, root-full-sync-corrected.log and root-full-check-corrected.log under /tmp/minion-14-consumers-61p26r_z/minion_site.

First fullcheck attempt had13 errors caused by root snapshot setup: src/lib/data was wrongly excluded as runtime data, and static public Supabase names were absent from the empty environment. Root copied only five missing current source files, recorded root-source-copy-correction.json, and supplied synthetic PUBLIC_SUPABASE_URL/ANON_KEY at compilation. No runtime Supabase request or original env file was used. This setup failure is not a product regression. No owned service/config/test was overwritten by the correction.

Accepted scope: initial/internal authentication publishes current state; real browser-mode runes notify subscribers; retired callbacks/hydration/send/history/poll/activity do not mutate the successor; reporting hooks use fixed strings and tolerate throwing sinks. Actual role/scopes and no-replay behavior are preserved. Public candidate declarations resolve to matching package bytes. No blocker was found in this bounded source review.

The active Site checkout still uses old source/installed shared bytes. Adoption requires a paired source/package transaction; no release, real gateway/browser or authorization envelope claim follows. Existing signing/connect/agents diagnostics and general gateway payload validation have exact TODOs/root-proposal follow-ups. SDK-01/02 remain open.
