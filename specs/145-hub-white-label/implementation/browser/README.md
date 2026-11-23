# Browser evidence

The [final summary](final-browser-summary.json) records source revisions, fixture boundaries and limits. All screenshots below are from dedicated local QA. They contain synthetic accounts or an authored test agent; they do not show production organization data.

| Capture | Provenance and result |
|---|---|
| [Spanish, dark,401px](matrix-accent-es-dark-401.png) | Earlier integrated144-case shell/editor matrix;15accented characters. Numeric matrix receipts remain authoritative for all measured bounds. |
| [English, light,1280px](matrix-accent-en-light-1280.png) | Same earlier integrated matrix and boundary name. This is not a rerun of the final source head. |
| [Badge, light,320px](badge-max-github-light-320.png) | Actual production badge component in a temporary fixture, final product source56bd42aa3;15emoji graphemes/249UTF8bytes. The dark organization name fits. Agent content deliberately retains authored Minion references. |
| [Organization switch](org-switch-custom.png) | Actual GoTrue owner session and OrgPicker: Faces → Shared Legal Organization, whose override is Clínica Faces. The QA palm-tree tool overlays part of the footer; full identity is separately proved by DOM/AX labels and title. |
| [Browser Back after logout](back-after-logout.png) | Actual account-menu logout followed by browserBack. The app redirects to sign-in, renders MINION, and contains no prior organization name. |

The temporary fixture modules and helper server configuration were never committed to Hub or deployed. The three removed testing-library query options in5de104dd affect tests only; product source remains the reviewed56bd42aa3 behavior. Subsequent final pipeline and hosted CI evidence must be read separately.

The [actual CSS watermark](final-card.json) repeats Faces100times while leaving authored content intact. The [five native logo presets](final-logo-palettes.json) retain their colors and900weight. The [collapsed rail](final-collapsed-at.json) exposes Faces Hub in the accessibility tree at56px width. The [Topbar check](final-topbar-default.json) measures exactly one logo and one gradient at all six widths.

The CRT boundary evidence preserves the [failed18px row](final-crt-max-before.json) and [corrected growing row](final-crt-max-after.json). At320px the25px row contains the24px wrapped name; all six corrected cases fit with no document overflow. These are actual component geometry measurements, not screenshot comparisons or full workstation readiness evidence.

The original200percent-equivalent measurement used640CSSpx/DPR2 on1280physicalpx. It was not native browser-menu zoom. Root `ssr=false` remains in place under the approved architecture exception; no JavaScript-disabled full-HTML branding claim is made.
