# Final consumer review

Verdict: PASS for the reviewed source delta, with the runtime qualification limits below.

Setup baseline: `a3b9388915351179c27bab04005fb89f16303c2a`.
Initial reviewed candidate: `47add0ce9b9709db01efe52880dbba23c49c09e8`.
Current reviewed candidate: `56bd42aa3f37e2d4fe8ac0e3200366cfb3c9782a`. The separate parent-owned contact-action accessibility commit `cf2269acb` is outside the original consumer review scope.
Scope: remaining consumer delta, shared wordmark palette seam, collapsed rail identity and existing translated callers. No remaining unresolved source finding was identified within the reviewed consumer scope after the authorized corrections. Final parent runtime/CI acceptance remains separate.

## Standards

- The collapsed Sidebar adds current `getBranding().fullName` as sr-only text only when collapsed. It does not change visual layout, focus order, roles, permissions or navigation destinations. The existing expanded brand link retains its full accessible name. Actual accessibility-tree inclusion remains a browser check.
- `HubWordmark` retains its name/suffix/class props and adds optional `inheritStyles=false`. Only MinionLogo opts in. Prefix color and weight inherit from MinionLogo's current personal preset; ordinary shell wordmarks keep their existing default palette. Explicit `text-transform:none` remains on prefix and suffix. Suffix color/weight/string are not changed by this new option.
- MinionLogo's showText default, size, compact, class and preset handling remain intact. Its SVG geometry and preset definitions are unchanged. The text wrapper restores the existing preset print color and font-black weight; it does not save branding or alter personal logo preferences.
- All new identity values render through Svelte text/attributes. The two marketplace watermarks use `data-brand-watermark` plus CSS `content:attr(...)`; user text is not inserted as HTML or CSS. The Markdown story renders identity as plain Svelte text outside the Markdown parser.
- Test-only `$app/forms` alias fails accidental submits explicitly; it cannot affect production routing or qualify actual form submission. Added mounted tests exercise real components; palette tests consume actual compiler/Tailwind output and clearly account for happy-dom inheritance limits.

## Specification

- Audited all 34 classified Svelte Hub-identity inventory paths. Each has a current direct getter binding or the intentional MinionLogo → HubWordmark shared binding. This is source closure, not a substitute for rendered coverage.
- Existing prefix-only titles remain prefix-only. Existing lower-case `hub` titles retain that casing; existing `Hub` titles use fullName. Public, error and recovery consumers read only the request/page-owned projection. No new identity lookup from URL, invite code, raw cookie or host is introduced.
- Verified all five existing localized callers: welcome, wizard sync, plugins, OAuth and onboarding. OAuth retains `{app}` plus `{hubFullName}`; onboarding retains prefix-only `{hubName}`. The three new public descriptions preserve channel/app context and have EN/ES messages.
- No authored agent text, organization full name/ID/slug, theme/preset name, package/path/environment key, protocol value, distinct-service identity, native updater, provider provenance, email or historical release content is rewritten by this delta. The remaining standalone native updater literal is an explicit inventory exclusion.
- Request-owned getter/runtime fallback and root/app delivery remain the setup baseline. This review makes no first-document HTML SSR claim; the existing SPA architecture exception is unchanged.

## Finding detected and corrected

P2: marketplace list and detail company wordmarks inherited `--color-surface-2` as foreground on fixed near-white card artwork. Under the installed canonical github-light palette that token is `#ffffff`. The color choice predated the consumer delta, but converted identity text inherited the readability defect.

Exact sites: `src/routes/(app)/marketplace/agents/+page.svelte` `.list-brand`; `src/routes/(app)/marketplace/agents/[slug]/_components/IdBadgeCard.svelte` `.company-brand`.

After notifying both check drivers, the parent explicitly assigned this reviewer the minimal two-file correction. Commit `be9d209fc9994f48178b2925cbfb12ddcdb9e0e5` reuses the existing `#18181b` identity-card illustration print ink from IdFooter, keeping card artwork and all other text unchanged. Both files already have exact illustration-palette exceptions (allowances 21 and 38); none were raised. There is no theme-stable fixed ink token in the installed semantic contract, and another theme-varying surface/text token would reproduce the defect.

Checks for that correction: both actual Svelte components compile with zero warnings; design lint passes without increased governed debt; token integrity reports zero violations; git diff --check passes. Logs: `/tmp/white145-marketplace-ink-design.log`, `/tmp/white145-marketplace-ink-tokens.log`. Working tree was clean after the scoped commit. No push/pipeline/server/browser/QA mutation was performed.


## Additional actual-component CRT findings and authorized corrections

The parent subsequently reproduced `effect_update_depth_exceeded` by opening the actual CRT modal. The reset effect tracked a derived snapshot of crtConfig while the live effect replaced/applied that same store. This was a baseline bug, but it blocked the newly branded preview.

Commit `56bd42aa3f37e2d4fe8ac0e3200366cfb3c9782a` changes only CRTConfigModal.svelte and its actual mounted test. The open reset reads stored configuration through untrack; the live effect first reads a tracked local snapshot, then performs set/apply through untrack. Labels, controls and persistence semantics remain unchanged.

The actual component regression failed with the original source's maximum-depth error (`/tmp/white145-crt-loop-red.log`) and passes with the correction (`/tmp/white145-crt-loop-fixed.log`). It mounts the real Dialog and real reactive CRT store: closed makes zero writes; opening applies once; one Deep click adds one real write/apply; closing completes at Dialog's actual content animation event; reopening reads newer stored halation/off preferences and applies once. A guard throws after five real writes to bound any future feedback regression. Only external preference synchronization is mocked; this does not qualify authenticated preference transport.

The parent also measured the accepted 15-grapheme/249-byte label at320px: its24px wrapped text extended beyond the fixed18px preview topbar (`/tmp/white145-final-crt-max.json`). The same commit changes only that illustration row's `height:18px` to `min-height:18px`, allowing wrapped content to grow while retaining the existing minimum and every other print style. Parent actual320px remeasurement is required.

Both source effects and the height adjustment compile without warnings. Design/token/format/diff checks pass, with no new allowance. Logs: `/tmp/white145-crt-loop-{design,tokens,prettier}.log`. No push, server/browser action or new pipeline was performed by this reviewer. Check drivers were notified before source edits and received the exact committed head.

## Limits and release gates

The original source review was independent; the parent then authorized this reviewer to implement the two-selector and CRT corrections. Parent independent acceptance and actual browser proof of the correction are still required. Do not present this report as independent runtime approval of that newly authored fix.

The initial independent source review did not execute tests. The subsequent authorized CRT fix phase executed the actual mounted lifecycle test and source compile/lint checks described above. No full check, build, browser, accessibility sweep or hosted CI was executed by this reviewer. Parent must qualify the exact final head, including light/dark marketplace wordmark contrast, actual CSS watermarks, all boundary widths/zoom, palette preservation and collapsed-rail accessibility names. The in-flight build identified by the driver was the older `47add0ce9` baseline; it cannot qualify the ink correction. No deployment, merge, full-feature completion or live claim is made here.
