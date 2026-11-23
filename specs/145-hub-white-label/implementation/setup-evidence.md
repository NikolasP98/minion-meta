# Setup slice qualification

Base: 5347ff0148a3600fd3963d94db57e95c8e5a2779. All work local; no production environment/database, pushes, PRs, merges, or deployment performed.

Parent owns integrated full check/test/build/a11y, browser geometry, release and runtime qualification. Root remains SPA (`ssr=false`) per parent approved implementation amendment: loader proof is request-owned route-data evidence, not JS-disabled rendered HTML proof.

## Executed evidence

- `bun run i18n:compile`: passed.
- `bunx vitest run src/routes/layout.server.test.ts 'src/routes/(app)/layout.server.test.ts' src/lib/components/layout/HubWordmark.mounted.test.ts src/lib/components/ui/foundations/PublicTaskShell.contrast.test.ts`: original run43/44, fixed isolated mock-count test. Updated layout/root/wordmark/join batch22/22 passed excluding stale pre-fix creation selector snapshot; `/tmp/white-label-final-focused.log`.
- `bunx vitest run src/lib/components/settings/OrganizationBranding.mounted.test.ts src/lib/routes/route-access-authority.test.ts src/lib/routes/route-design-contracts.test.ts`: 30/30 passed. Later editor expanded12/12 passed in `/tmp/white-label-editor-final.log`; final runtime-scope regression batch13/13 passed in `/tmp/white-label-editor-scope.log`.
- `bunx vitest run 'src/routes/(app)/settings/appearance/page.server.test.ts'`: 4/4 passed, `/tmp/white-label-appearance-tests.log`.
- `bunx vitest run 'src/routes/(app)/settings/organizations/page.mounted.test.ts'`: 2/2 passed, `/tmp/white-label-create-fixed.log`. Creation suggestion/manual override/retry unchanged payload and invalid prefix no dispatch.
- `bunx vitest run src/lib/components/ui/foundations/PublicTaskShell.mounted.test.ts src/lib/components/ui/foundations/PublicTaskShell.contrast.test.ts`: 24/24 passed, `/tmp/white-label-public-final.log`. Existing master contrast threshold and test retained; actual public component follows current safe request projection and escapes identity text.
- Direct Svelte compiler: HubWordmark and OrganizationBranding have no compiler warnings.
- `node scripts/design-lint.mjs --base-ref 5347ff0148a3600fd3963d94db57e95c8e5a2779`: passes with no changed-file debt increases (`origin/master` absent in isolated clone, so unqualified default lint cannot resolve base); `/tmp/white-label-design-final.log`.
- `bun run lint:tokens`: 0 violations; `/tmp/white-label-tokens-final.log`.
- `bun run check`: standalone run12 errors/0 warnings, `/tmp/white-label-setup-check.log`. Five missing m.* parameters belong to consumer slice and are addressed there; two missing PUBLIC_POSTHOG env keys need parent's QA environment; missing service import is data slice (copied locally after check started); required fixture branding payloads and optional standalone Appearance preview props fixed in setup after this check. No broad repeat per parent; integrated check is authoritative.

## Review axes

Standards: page-owned getter, semantic-token-only new UI, shared Input/Button/Card, Svelte5 runes, no mutable branding singleton/browser preference, no new API or page-authority bypass. Existing PublicTaskShell contrast preserved. Independent full checks remain parent qualification.

Spec: combined identity/kind one-query app load, root app-read suppression, scoped unavailable defaults, app:branding dependency, owner editor distinct from personal preference access, exact null/MINION choices, tracked known rejection/unknown/acknowledged refresh outcomes, original action reconciliation, checked ready same-org refresh, actor/org/editor/runtime-generation fences, create suggestion/manual draft/retry persistence, five existing interpolations plus localized controls. Browser geometry and actual integrated route-data propagation remain parent qualification.

Borrowed untracked dependencies `src/lib/branding.ts` and `src/server/services/organization-branding.service.ts` are data-owned and excluded from this slice commit. node_modules symlinks data clone; no concurrent installs performed.

Final setup commit:183df27efba2db2f6c2fc0c1b8389106e61ba152.
Final post-review loader batch (`bunx vitest run --maxWorkers=1 src/routes/layout.server.test.ts 'src/routes/(app)/layout.server.test.ts' 'src/routes/(app)/settings/appearance/page.server.test.ts'`)20/20 passed; `/tmp/white-label-loaders-final.log`. Final editor batch13/13 passed; `/tmp/white-label-editor-scope.log`. No setup test/check processes remain.

Independent read-only consumer review commit7c901bdf: no concrete correctness/security defects found. All29 consumer identity inventory paths bind request getter. Five localized callers complete with app interpolation/prefix/suffix preserved. Watermark text is inert attribute content; Markdown story identity is text outside Markdown parser. Native/updater/packaging and technical/provider/email/topology exclusions unchanged. Browser card geometry/CSS pseudo-content and integrated first route-data evidence remain parent-owned qualification, not claimed from this code review.

## Independent review corrections

- Creation's untouched invalid organization-name suggestion now leaves an empty invalid Hub draft; an80-character full name cannot submit until an explicit shorter name is supplied. Existing edited drafts and successful valid suggestions are preserved.
- Topbar has a separate full-width wrapping visible wordmark row above a separate wrapping controls row for401–767px. At400px and below the existing icon-only link remains. Mutually exclusive display rules prevent duplicate visible/focusable brand links; autoheight uses --page-header-height as minimum. Parent owns actual browser geometry/focus qualification.
- Validator byte-envelope errors now show localized simpler-character guidance in both creation and editor; suffix errors explain automatic Hub suffix. Unsupported browser validation reports its own localized cause, independently of server-ready owner authority, and disables editing.
- PublicTaskShell custom prefix overrides inherited uppercase with text-transform:none. Existing suffix uppercase presentation and master contrast formula remain unchanged. Parent owns actual browser computed-style casing proof.

Final followup qualification (serialized):
- `bun run i18n:compile`: passed.
- `bunx vitest run --maxWorkers=1 src/lib/components/settings/OrganizationBranding.mounted.test.ts 'src/routes/(app)/settings/organizations/page.mounted.test.ts'`:19/19 passed. Includes actual mounted untouched long-name rejection/explicit short selection, complex one-grapheme names and Intl.Segmenter unavailable. `/tmp/white-label-followup-mounted.log`.
- `bunx vitest run --maxWorkers=1 src/lib/components/ui/foundations/PublicTaskShell.mounted.test.ts src/lib/components/ui/foundations/PublicTaskShell.contrast.test.ts`:24/24 passed. `/tmp/white-label-followup-public.log`.
- Pinned-base design lint: no increased governed debt. `/tmp/white-label-followup-design-final.log`.
- Token integrity:0 violations. `/tmp/white-label-followup-tokens-final.log`.
- Direct Svelte compiler: Topbar, OrganizationBranding and PublicTaskShell each0 warnings. `git diff --check` passed.

## Integrated generated-type fixture corrections

The integrated generated route types exposed six fixture-only typing errors. Two app-layout partial event casts now explicitly cross unknown as the existing fixture convention does. Four creation renders use a documented partial PageData fixture (component reads organizations only and authority is mocked); this fixture intentionally does not claim to qualify server authentication/load behavior. No production code changed. Scoped runtime qualification is recorded in `/tmp/white145-test-types.log`; parent reruns the authoritative integrated full check.

## Shared wordmark casing browser regression

Parent browser at430px reported DOM prefix `Clínica Faces` painting uppercase because `.hub-prefix` inherited an uppercase typography role. Evidence artifact `/tmp/white145-mobile430-ready.png`; parent computed style was `textTransform: uppercase`. Parent also measured header97px and document width430px without overflow before this fix. Those are parent browser findings, not measurements made by this worker.

Pinned base5347ff0148 Topbar contains literal lower-case `hub` suffix. HubWordmark now explicitly sets `text-transform:none` on both prefix and suffix, preserving custom name case and the explicit existing suffix string. Focused mounted regression attaches actual compiler-emitted CSS under an uppercase ancestor and asserts prefix/suffix computed styles are `none`; this adds presentation proof beyond textContent. HappyDOM does not fully model inherited computed textTransform (the old version yielded empty string), so parent still owns real browser casing proof.

- New focused test fails with the two overrides removed, then exact restored candidate passes6/6. Red log `/tmp/white145-shared-wordmark-case-red.log`; green log `/tmp/white145-shared-wordmark-case.log`.
- Pinned-base design lint passes, no changed debt increase; token integrity0violations.
- HubWordmark compiler0warnings; git diff --check passes.
