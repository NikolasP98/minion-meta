# Implementation and release evidence

Owner approval received 2026-11-22: “approved. lmk when its all live”.

Implementation base: Hub master `5347ff0148a3600fd3963d94db57e95c8e5a2779`. Compared with reviewed source `3d39cbb640da894c9d78bc840af6153b5d896724`, six changed files contain accessibility fixes to DataTable, public wordmark contrast and the accessibility ledger. No creation/authority/layout architecture drift was found. The public contrast fix and its regression test must be preserved.

Separate private clones own data/server, shared shell/setup/editor and remaining identity consumers. The shared checkout and the frozen EGM source remain untouched. Dependencies installed with the frozen Bun lockfile; application implementation and qualification are in progress. No deployment or runtime completion is claimed.

## Release ledger

| Slice | Implementation | Qualification | PR / merge | Deployment / runtime |
|---|---|---|---|---|
| Data and guarded service | In progress | Pending | Pending | Pending |
| Shared delivery, shell, creation and editor | In progress | Pending | Pending | Pending |
| Remaining identity consumers and final qualification | In progress | Pending | Pending | Pending |

## First-document architecture amendment

Runtime inspection on the clean implementation base found `src/routes/+layout.ts:17` exports `ssr = false`. An unauthenticated initial document is a 1,994-byte empty application shell; loaders run through route-data requests. Root telemetry imports also rely on client-only execution. The reviewed spec overlooked this existing architecture.

Do not enable global SSR, inject an artificial no-JavaScript wordmark, or add a second branding query in hooks as part of this naming feature. Preserve the existing client-only application. Qualify the first authenticated route-data response, visible first mount and hydration, request isolation, and layout read budget. No JavaScript-disabled full-HTML branding claim is made. Whole-application SSR needs its own compatibility audit and migration, tracked in proposal `2026-11-22-hub-first-document-ssr`. This is a documented exception to T008's JavaScript-disabled assertion, not a passing SSR test. All owner naming/authority/layout requirements remain in scope.
