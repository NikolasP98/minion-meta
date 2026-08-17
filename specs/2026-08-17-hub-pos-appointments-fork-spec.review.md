---
spec: 2026-08-17-hub-pos-appointments-fork-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-17
---

# Pass 2 correctness review

- Set the spec to pass 2 with an approved status/verdict because all correctness issues were resolvable from existing repository contracts.
- Added `minion-meta` to `repos` because the spec conditionally requires changing the meta-repo Figma coverage ledger.
- Expanded the owner surface to include the known navigation, availability, access, assistant-context, route-contract, and conditional ledger impact zones instead of claiming there are only four discoverability surfaces.
- Changed the redirect smoke wording from 302 to 307 to match the redirect implementation and every later verification requirement.
- Replaced the optional skipped availability assertion with a blocking requirement to characterize the actual gate, keeping a core preservation check consistent with the open-items and behavior-preservation rules.
- Made `BookingCapabilities` audit-derived and labeled the listed keys as examples, avoiding a contradiction between “derive from the matrix” and a pre-audit fixed interface.
- Made scheduling preserve the audited current `createSalesOrder` value only when that capability exists, avoiding an unsupported hardcoded behavior assertion.
- Limited loader options to server-side data knobs, removing the ambiguous claim that they mirror client presentation props.
- Removed permission to update characterization assertions for an “intentional normalization,” which contradicted the out-of-scope ban on behavior changes.
- Defined the redirect availability table and test as preservation of the characterized pre-change denial and explicitly required no redirect, resolving the earlier implication that a composite-gated request should reach the target route.
- Corrected the server-convention discovery reference from nonexistent “Slice 0” to §1.
- Clarified that `minion_hub` is the only runtime-code repo while the ledger is a coordinated meta-repo documentation change.
- Qualified the “only meta-repo file” statement so it does not contradict the mandatory `proposals/` entry when an implementation leaves an open end.

No human decisions are required.
