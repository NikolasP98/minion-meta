---
phase: 13-ui-qualification
plan: "10"
requirements: ["UI-03", "UI-04", "UI-07"]
requirements-completed: []
status: locally-qualified
---

# Calendar toolbar touch and keyboard parity — September11

The three-file repair lives in the ordinary combined Hub snapshot. Agent evidence: `/tmp/minion-13-10-calendar-bjggirqy/HANDOFF.md`; root final test/doc hashes: `/home/nikolas/.cache/minion-qc/ui-integration-u8r6xtfh/calendar-toolbar-manifest-root.json`. Product SHA256 `75dec88f9a44d1526d96102a05597b2fa24efa39d084808fd1f66300d706a581`.

Narrow/coarse controls now meet44px geometry, date text wraps, Event type has its existing translated accessible label, and fine-pointer desktop retains28px/26px compact controls. Hidden native date input leaves keyboard traversal only when the visible showPicker trigger is supported; the visible fallback remains focusable.

Main42-case matrix passed across Chromium151.0.7922.34, Firefox151 and Linux WebKit26.5; after the final tabindex fix, six affected cases passed. Root additionally removed showPicker before mounting in three native engine cases: the real visible fallback remains44px, focuses through the date button, emits the expected date intent and fits320px. All3 passed without product changes. This is separate supplementary proof, not a fresh51-case full matrix or real legacy-device certification.

Root's combined full Svelte check passes0errors/0warnings. Exact before/after governed-debt comparison and native token integrity pass; an ordinary snapshot has no git ratchet baseline, so none was claimed. All seven prior Calendar/timezone files remain unchanged. Actual08:00 slot placement and route-intent controls are preserved. Browser fixtures record URL intents; authenticated route navigation, mutations and native mobile hardware remain separate13-03 gates.
