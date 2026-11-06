# Independent specification review — pass 2

Reviewed spec.md, plan.md, tasks.md, data-model.md and contracts/ui.md for feature012 against clean Hub HEAD7d917ed. Verdict: **BLOCK pending four bounded contract clarifications**. No product changes.

The design is implementable and correctly favors existing outcome runtime, timestamp CAS, wrappers and confirmation components. It preserves safety scope and defines real deployment receipts. These blockers prevent plausible implementations that pass the current broad task wording while leaving the audited defect live.

## B1 — FormField ownership leaves the live Hub defect unfixed

T017 names only meta FormField; plan assigns meta FormField/ErrorSummary to outcome worker. Hub renders its own `src/lib/components/ui/foundations/FormField.svelte` in16+ consumers; its snippet contract (`FormControlProps` id/aria-describedby) differs from shared meta `FormFieldControl` (id/describedBy/invalid). Editing shared alone does not repair Hub. Specify either compatible Hub adapter onto shared primitive OR both implementations until migration, with installed-package fixture AND mounted actual Hub FormField assertion. Explicitly assign Hub foundations file/export ownership; avoid blindly replacing incompatible APIs.

## B2 — Autosave caller inventory and callback boundaries are missing

T012 mentions records internals, but a generic outcome classifier cannot recover information already erased by callers:
- BookingDetailDrawer.svelte:236+ changes current record/version on409 and throws generic Error; retry currently means implicit overwrite.
- AvailabilityEditor.svelte:58+ jsonMutation combines write with invalidate; success then failed invalidate is indistinguishable from failed mutation. It also converts409 to generic Error.
- PeopleView.svelte:389+ patchField reads live selected.id/version and converts boolean failure to Error.
- Actual createAutosave callers also include routes scheduling/reminders, pos/settings, home/settings; reminders mixes write and invalidate and throws raw Error(status).
- Direct SaveStatus.run callers include SellableWizard, tags, EditableName, backups and channels; changing generic Error retry semantics affects them too.

Require a generated caller ledger and classify every caller as migrated/adapted/already-safe with evidence; name the six current autosave host files. Scope must be captured at scheduling and rechecked before callback dispatch AND before host side effects (not only primitive base assignment). Separate write acknowledgement from refresh at adapters. Define generic post-dispatch Error as unknown unless positively known rejected/unsent. Test at least actual BookingDetailDrawer or PeopleView host scope-switch plus AvailabilityEditor committed-refresh failure; primitive-only tests cannot prove closure safety. Define explicit conflict reconcile/overwrite action instead of old generic Retry laundering409.

## B3 — Version admission compatibility and atomic returned token need exact contract

T013 says update every caller and monotonically advancing version, good; contracts/ui.md does not say whether omitted expectedVersion is allowed. Specify browser PATCH requires expectedUpdatedAt (400/428 for missing,400 malformed,409 mismatch,404 absent) OR deliberately retain optional compatibility with a documented inventory and no completion claim for callers lacking tokens. Preferred scope: require browser PATCH token while internal authoritative service writes retain explicit no-CAS mode, e.g. pos.service.ts:2768 creates stock/product linkage through updateItem. No accidental internal caller break.

For event types, require CAS and resource-link replacement in one transaction, no secondary writes on409, and return the token from the actual committed UPDATE (not a later independent GET that could adopt another writer's version). Preserve catalog-owned title/active protection. Existing shared staleGuard compares milliseconds, so returned token must monotonically advance relative to stored row even same-ms write; mention token invalidation by alternate writers (stock archive, scheduling-catalog-sync) in test/inventory scope. Current contracts can be satisfied superficially with non-atomic SELECT + UPDATE.

## B4 — Dirty controls and executable pilot acceptance are underspecified

T014 says audited custom-control dialogs but no named consumer/test path. Existing latent gap is Dialog's native-event inference; there may be no currently-broken audited host because prior changes supplied explicit dirty. Identify at least one real custom-control-only dialog recipe/host and contract: explicit dirty prop is canonical, programmatic initialization is clean, user edits dirty, successful rebaseline clean, search ignored; mount actual Toggle/Select/Picker. Do not add a generic click heuristic or assume callback events bubble. Define how future authors discover/enforce this requirement so finding closure is not merely a synthetic button test.

## Nonblocking accuracy notes

- data-model.md says runtime is authoritative for idle/saving/saved/stale, but CommandOutcome only has succeeded/failed/conflict/unknown/committed-refreshing/partial; distinguish presentation phases from runtime outcomes in mapping table.
- T018 should name SecretsSection, DynamicSecretGroup, ChannelsTab as audited destructive pilots, not imply all native confirm instances removed.
- Real Postgres concurrency/rollback test should be explicit T013 proof; mocked service invocation only proves plumbing.
- README/recipe placement and conditional wrapper extraction are appropriately bounded. No extra SDK or dependency is needed.

## Acceptance to clear review

Add these contracts and exact callers to feature docs/tasks; preserve no-code-before-review gate. Pass2 can clear once revisions inspected. Full implementation tests, independent code review and deploy evidence remain later gates.
