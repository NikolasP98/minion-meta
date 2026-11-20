# Independent implementation review

Reviewed candidate tree `e0795114885d45d577cd5ccfdbcc680e22d64072` based on
Hub `206d9ae218efd4bf682d6c4063797c7441f4d52a`. Five scoped source/test files.
Both native reviewers used fresh conversations and read-only source access;
these verdicts do not claim executed checks, deployed behavior or runtime proof.

## Standards

Reviewer `/root/crm_auth_standards_review`: PASS, no material findings.
Read all five candidate files, Hub AGENTS and minion-engineering skill/references,
actual principal, RBAC, hooks and tenant-scoped services. Confirmed narrow exact
path admission, unchanged token/server/cache/browser behavior, retained trusted
principal and search entitlement, canonical-threshold privacy guards before
data/input/embedding, behavioral synthetic tests, and both handoff ledger links.

## Spec

Reviewer `/root/crm_auth_spec_review`: PASS, no material findings.
Read approved spec, all candidate files and relevant principal/capability/hook/
service boundaries. Confirmed exact response body and placement, current gateway/
organization/agent/membership checks retained, trusted context instead of body
organization, all source-test acceptance rows, filter/result-bound compatibility,
and explicit restricted-role limitation. Existing principal tests cover foreign
assignments, org mismatch and membership removal. No missing/extra runtime
behavior identified. The deployed acceptance row remains unproven until release.

## Executed focused evidence (parent)

Identity regression: 4 intended failures and 15 passes before the route change;
19/19 afterward. Restriction regression: 6 intended failures and 16 passes before
the scope guards. Final combined focused lane: 7 files,171 tests,zero failures,
including actual anonymous principal composition, PGlite principal policy and
hook regressions. Raw synthetic receipts accompany this record.

Fresh-checkout setup required SvelteKit sync and generated Paraglide messages
before Vitest could collect tests; those setup failures are not red-regression
evidence. A first type check found missing static analytics environment exports
in the fresh clone. Blank local PUBLIC_POSTHOG_KEY/HOST values were supplied;
no source fix, production credential or production service target was used.
Full final check/test/build receipts are recorded separately after completion.

The initial broad local test run was interrupted after repeated frontend suite
collection failures; it is not a completed test result. A narrowed reproduction
identified `Denied ID .../hub-role-simulation-20261108/node_modules/carta-md/dist/default.css?inline`:
Vite rejected CSS outside the new checkout because dependencies were linked from
the earlier checkout. Removed only the new checkout's dependency symlink,
preserved the original directory, and installed 851 packages with the committed
lock using `bun install --frozen-lockfile`. No tracked dependency/source change.
Subsequent qualification uses the private install. No application workaround,
test skip, source-lint exception or authorization relaxation was introduced.

Metadata-only final edits renamed three existing headings to satisfy the actual
spec-index consumer's Product/out-of-scope/verification contract, and updated
lifecycle/PR evidence. They do not change the reviewed requirements or plan;
the EGM reports retain the original review target hashes and line ranges.
