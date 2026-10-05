# HC038 shared Button semantics independent review

- Verdict: **PASS**
- Spec SHA-256: `4b918f83c34e0f006e5912fb01cae224535afe4ddc6990fa4851eda11db19468`
- Scope: contract review only; no package or consumer source edits

The AS-IS is source-backed. The canonical component spreads caller attributes and then writes
`role` and `tabindex` unconditionally, so its later undefined values erase enabled consumer
attributes. Hub and Site currently install the same built Button bytes
(`c2fa357b1a3e013925e1d5b1b3084b69050121c5ee7f67d3f6eb5bb952a3c9e8`), while actual Hub
consumers supply switch, menuitem, option and radio roles.

The precedence table is complete for the affected boundary. Destructuring typed `role` and
`tabindex` before the rest spread permits one final authoritative attribute per element. Enabled
buttons and links preserve caller values and otherwise retain native defaults. Disabled native
buttons remain excluded by the native `disabled` property. Disabled or loading links preserve a
supplied role, use `link` only as the missing-role fallback, always use `tabindex=-1`, remove href,
and retain the existing click guard. Loading, aria-busy, caller ARIA state, event forwarding, and
native form types remain explicit invariants.

The verification contract exercises every table row through rendered SSR output and reactive
mounted transitions. It covers default and explicit button form types, click and submit
suppression, recovery after re-enable, native keyboard/focus behavior, and the real FlowExports
switch request. Its package gate binds each consumer baseline independently, permits only the
Button runtime/declaration and required metadata delta, rejects empty or altered allowlists, and
requires packed and installed byte checks plus a meaningful original-artifact failure.

No contract blocker remains. Implementation, exact artifact adoption, mounted/native proof, and
browser qualification are still required before HC038 can close.
