---
phase: 13-ui-qualification
plan: "05"
requirements: ["UI-03", "UI-04", "UI-06"]
requirements-completed: []
status: locally-qualified
---

# Home and call-control qualification — September 11

The bounded candidate is locally qualified. No commit, merge or deployment was performed in this continuation. Full UI parity and authenticated application acceptance remain open.

Source: `/home/nikolas/.cache/claude-tmp/hub-13-02`; nine owned files and exact hashes are recorded in `/tmp/minion-13-05-repair-opc7sp2c/final-inputs.json`. Behavioral receipt: `RECEIPT.md` in the same directory. Original staged bytes were preserved.

Home/call controls now provide semantic 44px touch targets on narrow/coarse-pointer layouts, an accessible language control, wrapping live controls and reduced-motion behavior. Fine-pointer desktop retains its compact sizing. Actual local fonts are included in fixture geometry.

Baseline: ten failing assertions and three passing controls. Final:39/39 coarse-input browser cases across Chromium, Firefox and WebKit; separately3/3 fine-pointer desktop cases. Scoped Svelte check, design baseline ratchet and token gate pass. Root visually inspected compact active-call and wide Home screenshots and included these exact product files in the combined Hub Svelte check (zero errors/warnings). These runs demonstrate synthetic UI behavior; no microphone, provider or authenticated server session was exercised.

The older temporary browser runner omitted explicit PWTEST_CACHE_DIR/TMPDIR. Preserve its behavior results with that cache-isolation exception. Later navigation and critical-journey runners use explicit private transform/temp directories. This is not a claim that the older invocation had fully private browser caches.

Product hashes:

- CallControls.svelte: `ec615f5026f7256470a95c00051a5a91a9286405621f9eddf29316daa00ca26d`
- Home route: `3a62356c4663a7b3f44bac575cec4b119cd6e55adffe20427c35dfbe73d37716`

Remaining authenticated/hardware/route gates are tracked in13-03 and `proposals/2026-09-08-platform-qc-remediation.md`; no global requirement is closed.
