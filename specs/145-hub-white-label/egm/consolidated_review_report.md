# EGM consolidated review: Hub organization naming

**Result: PASS for specification and implementation-plan readiness. Owner approval remains pending.**

The feature replaces the MINION prefix with an organization-owned name, keeps existing Hub suffixes fixed, uses the organization name by default when it fits, and bounds custom names to15 visible characters plus256 UTF-8 bytes. Existing short-name orgs such as Faces inherit their name; owners can set another prefix or explicitly retain MINION. Long full org names remain unchanged and require a separate short prefix during creation.

## Stage evidence

| Stage | Review completed | Result | Evidence |
|---|---|---|---|
|5 Initial zoom out | Fresh-context zoom-out persona | Two Majors resolved; current-source runtime differences reconciled | zoom_out_report.md |
|6 Comprehension | Fresh-context naive-reader persona | No blocking comprehension gaps; two Nits resolved | comprehension_report.md |
|7 Feature critics | Independent design/structural/style personas | Converged: rounds4 and5 clean | critic_report.md and critic_round2–5_report.md |
|8 Intermediate zoom out | Fresh-context zoom-out persona on canonical source | No blocking findings; existing mutation adapters adopted | intermediate_zoom_out_report.md |
|9 Implementation readiness | Independent readiness/codebase/style personas | Converged: rounds4 and5 clean; final round has no findings | implementation_readiness_round1–5_report.md |

Round3 source review was interrupted by the Orca restart. Its two completed persona reports and its source reviewer's interim inventory findings were recovered; it is explicitly NOT counted as a completed clean round. Round2 context drift was also recorded rather than relabelled as a clean pre-fix result. Subsequent complete rounds used immutable whole-package snapshots.

## Material repairs

- Shared name is independent of the80-character organization name and per-user visual preferences. Fixed suffix presence/casing is preserved; prefix-only copy stays prefix-only.
- The existing full-org-name PATCH is protected with the same owner boundary as the new prefix writer, closing the automatic-name alternate path. Both role models, fresh canonical profiles/memberships, settings permission, simulation denial and locked transaction admission are specified.
- Both legacy and role-template organization creation paths preserve branding on retries.
- Exact Unicode/space/emoji/suffix/byte rules and23 fixture vectors replace vague character-limit instructions.
- Layout/dependency delivery precedes editor refresh. Save recovery reuses existing adapters, settles the acknowledged original action after verified refresh, and preserves genuinely uncertain history.
- The conversion inventory includes five translated message callers, including onboarding and OAuth; source-fed technical service labels and external provenance have explicit exclusions.
- Standalone native updater identity is excluded; the hosted desktop title bar is included. Every planned application file has an explicit action, with named route/access/a11y/native-test gates.

## Exact reviewed scope

Final target SHA-256: `0b9955d023f7fbd00e6596fe6303e718926e50dc6a8838d5fea030d1066f5c8c`. All13 final context hashes match the sealed package. All177 source-file receipts match clean Hub source `3d39cbb640da894c9d78bc840af6153b5d896724`. Inventory:275 raw candidates,51 classified Hub identity candidates, five localized consumers,76 planned application file actions and24 unchecked implementation tasks. Counts describe the proposal/source scan, not implemented screens.

[Final reviewed package](final-review-package.zip) and [context hashes](final-review-context-hashes.json) preserve the exact reviewed bytes. [Historical snapshots](SNAPSHOTS.md) preserve earlier targets and original findings. [Disposition ledger](goldfish_review_report.md) maps the repairs.

## Approval and proof boundaries

This is a completed Speckit/EGM document run. The plan is ready for owner review; security/data-tagged application implementation still requires explicit owner spec approval, and human merge remains required. No application implementation, migration, production mutation, application test/build/a11y run, deployed layout qualification or release is claimed. The local HTML preview is illustrative and uses the project's design tokens; it is not runtime proof for Hub.
