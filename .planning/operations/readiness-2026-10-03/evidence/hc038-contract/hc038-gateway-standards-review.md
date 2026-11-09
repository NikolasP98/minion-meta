# HC038 shared Button semantics independent review

- Verdict: **PASS**
- Spec SHA-256: `4b918f83c34e0f006e5912fb01cae224535afe4ddc6990fa4851eda11db19468`
- Scope: contract review only; no UI or package source edits

The AS-IS matches the canonical component: rest attributes are spread first, then unconditional
`role` and `tabindex` expressions erase an enabled consumer's supplied values. FlowExports supplies
`role="switch"`, so the mounted failure exercises the shared primitive defect rather than a caller
role omission.

The precedence table is internally consistent. Destructuring typed `role` and `tabindex` removes
them from `rest`; the final explicit attributes can preserve consumer semantics for enabled/native
controls while a disabled/loading link alone forces `tabindex=-1` and uses `link` only as the
fallback role after `href` removal. Native disabled buttons remain nonfocusable through the actual
`disabled` property even when the supplied tabindex attribute is retained. Existing click, form,
loading, aria and native anchor-key behavior remain explicit.

The proof matrix covers the affected roles, reactive state changes, callback/form suppression,
native keyboard behavior, the actual FlowExports request, and exact per-consumer artifact overlays.
The artifact rule correctly permits only Button runtime/declaration and necessary metadata changes
while requiring every other Hub/Site baseline member to remain byte-identical.

No contract blocker remains. Implementation, artifact adoption, and browser qualification are still
required before HC038 can close.
