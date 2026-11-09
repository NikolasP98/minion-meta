# QA account switching and role simulation

The owner reported that choosing Viewer from Admin, then Staff from Owner, showed neither the viewport frame nor Finish simulation. The repeat at 06:09 UTC created separate Owner and Staff GoTrue login sessions and no new simulation row. The avatar offered both role simulation and passwordless QA account switching, with similar wording. This was a confusing control placement, not evidence that an active simulation should be painted onto an ordinary Staff session.

## Change

The avatar now offers only Simulate a role / Finish simulation for role changes. Passwordless QA account switching lives under the DEV badge, titled Switch QA account, with an explicit signed-in-account description. The same DEV control is reachable in the desktop sidebar, collapsed rail and mobile topbar. It remains unavailable in production, before sign-in, and during active simulation. Neither authentication endpoint nor simulation admission changed.

## Qualification

Signed UI source: `8cf5dc350ce9036782a3fa0c3d9557f91270eff5`; tree `840663f902ad1008af12adba6f41300ff56695be`. Delivered head `e14e300c947b10577f33d7008ef162d2adcfd9d5` adds only the QA runbook correction; UI code is unchanged.

- Focused actual-component checks: 23 passed across five files; profile-menu negative control captured before the removal. The initial multi-file red run was stopped after recording that failure; it is not a complete-suite receipt.
- Fresh whole-project svelte-check: 0 errors, 0 warnings. Localization, formatting, design-debt ratchet and token lint passed (0 token violations).
- Independent read-only review: Standards PASS; Spec PASS. A new native title attribute was removed on review.
- Real loopback browser: DEV switches the actual test account to Owner; avatar simulation selects Staff, retains actual Owner identity, renders the frame on all four desktop/mobile edges, and exposes highlighted avatar-only Finish. Mobile Finish clears the frame. Each frame capture has independently sampled edge pixels in [browser-proof.json](browser-proof.json).
- The mobile DEV target is 44 by 44 pixels and its account-change menu remains within the 390px viewport.

Fresh [CI](https://github.com/NikolasP98/minion_hub/actions/runs/42572220834) and [desktop qualification](https://github.com/NikolasP98/minion_hub/actions/runs/42572220793) run against this exact source. They are pending at this checkpoint; prior green results remain historical. Local broad tests/build are not claimed rerun for this UI-only follow-up.

The local preview is http://127.0.0.1:5199/en/home. A tester currently signed into Staff uses DEV → Switch QA account → Owner, then avatar → Simulate a role → Staff → Apply role. The preview backend-only timer expires at 2026-11-09T07:51:52Z and excludes the shared gateway. No merge or production deployment is claimed.
