# CRT modal independent Standards / Spec review

Verdict: PASS. No blocking finding in the two-file CRT correction or the two localized label props in `cf2269acbe4845507a83924ab969b6dfc1c6bae9`.

Reviewed read-only in `/tmp/minion-white-label-145-final` on parent HEAD `cf2269acbe4845507a83924ab969b6dfc1c6bae9`, with the CRT source/test still uncommitted. This is not a final candidate hash or pipeline result. No Hub files, baselines, servers or inventories were changed during review.

Reviewed working-file SHA-256:

- `src/lib/components/settings/CRTConfigModal.svelte`: `4152b7f755610ee6db6e24b5689b012477dc6b96edfe7559e32f1906d00bb4a6`
- `src/lib/components/settings/CRTConfigModal.mounted.test.ts`: `0f2c40530b3d5fefbcc268c18f7c285cacc25ceb0ded5e64f6826c3ba144ec9c`

## Standards

PASS. The open/reset effect at CRTConfigModal.svelte:39-43 tracks `open` and reads the stored/derived configuration inside `untrack`; stored changes therefore do not subscribe this reset to its own subsequent writes. Each later false-to-true opening still reads the current stored values.

The live effect at lines49-56 checks `open`, snapshots local state outside `untrack`, and wraps only the real `crtConfig.set(snapshot)` / `crtConfig.apply()` side effects. Local user edits remain tracked. All bloom/scan/toggle controls replace the local object, and the installed Svelte snapshot implementation also reads its properties. Config getters, serialization and preference synchronization read by the real setter cannot accidentally become dependencies of the live effect. No setter, persistence behavior, markup, branding binding or Apply-button policy was replaced.

The new test mounts the actual modal and actual Dialog, retains the real CRT state/store and real apply method, and mocks only the external preference-sync boundary. Its setter spy delegates to the saved real setter. It observes dialog visibility, current `[Clínica Faces]` text, stored bloom/scan state, actual document CRT attributes, and bounded write/apply counts. The close assertion completes the real Dialog content animation handler rather than substituting a fake modal.

The greater-than-five-write guard is a failure guard, not a behavior substitute: it throws on repeated real writes while the exact assertions separately require one opening write, one user-change write, no idle/closed writes, and one reopen write. The regression is observable and does not grep implementation source.

## Spec

PASS for the reviewed correction. Existing personal CRT settings still apply live, without a new Save/Apply interaction. Closed stored updates do not publish the old local draft; reopening seeds the newer `halation` / `off` values, which the test checks through controls, store values and document attributes. The resolved organization prefix remains in the preview. No organization branding mutation or permission behavior changed.

The label-only commit adds `label={m.tags_add()}` to the existing Popover and `aria-label={m.crm_add_note()}` to the existing Add-note Button. Both message keys already have EN/ES values. The props name the same existing actions without changing handlers, visibility, disabled state, layout or a baseline.

## Evidence and limits

- Parent browser log `/tmp/white145-final-dev3.log` records the original `effect_update_depth_exceeded` from the actual route at12:55:54AM.
- `/tmp/white145-crt-loop-red.log` records one failing actual-modal mounted regression against the old implementation with `effect_update_depth_exceeded` during opening.
- `/tmp/white145-crt-loop-fixed.log` records one passing mounted regression after the fix, test body106ms; its total run20.07s includes compilation/import work.
- `/tmp/white145-crt-loop-format.log` reports the test formatting unchanged; independent scoped `git diff --check` returned clean.

I inspected the executable test and both supplied red/green logs; I did not rerun tests or the browser. The mounted check does not independently prove native CSS animation timing, cross-session persistence, the final full test/build/a11y suite, hosted CI or deployment. Parent qualification remains responsible for those states. Keep the inventory's final hash pending until the pipeline candidate is settled.
