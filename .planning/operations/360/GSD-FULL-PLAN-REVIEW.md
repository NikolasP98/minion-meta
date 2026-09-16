# Full 360 GSD plan review

Reviewed 2026-09-09. Reviewer: independent GSD plan checker. Scope: the 41 exact paths in `GSD-REMAINING-PLAN-INDEX.md`, 47 v1.1 requirements, phases 09–20. This is static plan admission, not source verification, runtime acceptance or release authority. No application, model, database mutation or deployment was executed by this reviewer.

## Verdict

**Bounded plan inventory admitted after revision; no remaining unconditional plan blocker.** Individual source slices may execute only after their named dependency, exclusive ownership and evidence gates. Discovery/decision slices are admitted to resolve their stated questions and generate exact repair plans; they do not make the entire milestone implementation-ready or satisfy their requirements by producing a report. Newly generated source plans require independent admission before execution. This inventory is a reviewed operating system for the full operation, not a promise that 41 plans will be the final count.

Immediate admissions:

- **11-06 streaming closure:** admitted, including the requested `drone/src/async-boundary.ts` helper. Two tasks, seven owned files; dependency 11-01. The helper makes the existing shared deadline/cleanup contract concrete. `run.ts` and `define.ts` remain outside this slice. Fake-host mutation, pre-abort, credential, idle iterator, final response, tool, late rejection and early-return cases are required. A timeout bounds caller observation; it does not kill an existing remote effect.
- **10-01 job fencing:** admitted for four-file source implementation with one schema writer. Two tasks cover additive generation, atomic claim, all owner-write predicates, heartbeat while pending and cleanup/cancellation. Real PostgreSQL race evidence in 10-03 is still required before JOB-01 closure; branch/unit tests alone cannot certify database concurrency. No production migration is admitted.

Their exact plan identities appear in the manifest below. A scope amendment requires a new review disposition; an old hash is not approval of changed content.

## Corrections made during this review

The parent explicitly authorized these narrow plan/index edits after the planning lane finished. No source or canonical STATE/ROADMAP/REQUIREMENTS was changed.

1. **Platform dependency coverage:** 12-01 previously inventoried and patched only Hub. It now inventories every supported repository and executable/container surface, while keeping source mutation limited to Hub. Every affected non-Hub family requires an exact reviewed/executed child plan; unknown surfaces prevent DEP-01 closure. This preserves the full user scope without one manifest owner editing every repository concurrently.
2. **UI fixture order:** 13-02 previously required seeded authenticated journeys before 13-03 established deterministic fixtures. 13-02 now owns initial `fixtures.ts` and `personas.ts`, proves actual route mounting before repair assertions, rejects non-disposable targets and records deterministic start/seed commands. 13-03 explicitly expands that passing fixture. If another source seam is needed to mount safely, a bounded prerequisite must be admitted before UI edits. This avoids a production auth bypass or a green test of handmade replacement markup.
3. **Receiver acknowledgment dependency:** 11-03 could discover a missing receiver and route its repair to phase14, whose normal closure prerequisites include phase11. It now requires an early disjoint receiver child slice under D360-06, dependent only on 11-02 plus the recorded journal contract. Receiver behavior must pass before sender delivery acceptance. Whole-phase14 still retains its normal prerequisites. This removes an operational dependency deadlock without waiving either end of the protocol.
4. **Exact phase inventory:** legacy `15-structured-output-notification-intelligence` contains three unrelated plans whose numeric IDs collide with the new data phase. The index now excludes it explicitly and requires exact-path dispatch validation. `gsd-tools init phase-op 15` currently selects `15-data-pipelines`, but numeric glob/order is not a safe contract. The parent owns enforcement of the exact-path guard; no move, delete or renumber of legacy work was performed.

## Verification method and results

Read root instructions, all 12 phase contexts, PROGRAM, REQUIREMENTS, ROADMAP, PROJECT, DECISIONS, the prior four-plan review, project skill indexes and the engineering testing/change-safety references. Parsed all intended plans and their task actions, verification, completion boundaries and must-haves. Re-ran the installed GSD `verify plan-structure` command for every exact path after revisions: **41 valid, zero parser errors, zero parser warnings**. Independent YAML parsing confirmed object-shaped artifacts/key links, all 47 requirement IDs, no extras, no missing IDs, and a valid local dependency DAG. All 37 newly generated plans have two tasks; retained initial plans have 4/3/3/3 tasks.

The installed generic `frontmatter get` parser flattens nested artifact/key-link objects to strings. Therefore this review used the raw YAML and PyYAML 6.0.3 for those relationships; it did not mistake the generic parser output for absent links or mutate the installed GSD tooling. The dedicated GSD must-have block parser supports those nested objects. Structure validation is a prerequisite, not proof that tasks deliver their goal.

| Dimension | Result | Evidence / boundary |
|---|---|---|
| Requirement coverage | Pass for operating plan coverage | All 47 mapped; some are explicit discovery/repair gates and remain unfulfilled until their generated source work passes |
| Task completeness | Pass with verification warnings | Every task has files/action/verify/done; substantive actions name negative behavior, not only task titles |
| Dependency correctness | Pass after revision | 41-node local DAG; waves follow dependencies; fixture and receiver ordering corrected; cross-phase admission still enforced by root |
| Key links | Pass with warning | Wiring actions cover callers, database, receiver and consumer adoption; many frontmatter `via` strings remain generic |
| Scope sanity | Pass with warning | New slices are two tasks and 3–8 file entries; initial 09-01 has four tasks and 12 entries; directory ownership can hide additional files |
| Verification derivation | Pass for bounded slices/gates | Source tests, native browser, actual DB race, real harness and actual runtime receipts are distinguished; metadata-only success cannot close behavior |
| Context compliance | Pass for revised next-wave admission | User's proceed instruction retained; no generic reapproval; exact live changes and missing policy remain their own gates; shared work preserved |
| Scope reduction | No remaining silent reduction found | Reduced implementation breadth is labeled a discovery gate with mandatory follow-up execution, not called a final capability |
| Nyquist compliance | SKIPPED, not passed | No current v1.1 phase RESEARCH.md with Validation Architecture exists at review; legacy phase15 research is excluded |
| Cross-plan data contracts | Pass with integration gates | Stable effect identity survives lease generation, raw provenance survives parsing, SQL remains parameter-bound, stream partial/final data is preserved, acknowledgment gates receiver compatibility |
| AGENTS/engineering | Pass with warnings | Native package managers, strict boundaries, design/token checks, browser-harness, no automatic commit/deploy and two-sided handoffs retained |
| Research resolution | SKIPPED for current inventory | Future ACP/research decisions are explicit admission tasks. Once research is written, unresolved questions block dependent implementation and validation architecture needs its own gate |

## Coverage and integration boundaries

| Phase | Plans | What acceptance must establish |
|---|---|---|
| 09 Security | 09-01, 09-02 | Raw SQL denied, persisted actor binding, sanitized diagnostics, real SQLite read-only and fixed parameter-bound SQL; real-query and cross-project regression evidence required |
| 10 Durable jobs/stock | 10-01–03 | Fenced ownership, long-call heartbeat, canonical cancellation/retry effects, uniqueness and crash-safe submission on disposable PostgreSQL |
| 11 Agents | 11-01–06 | All Drone APIs, Shells admission and durable acknowledged outcomes, quiesced restore, pinned real ACP lifecycle, effect-based governance and every generated repair |
| 12 Dependencies | 12-01–03 | Platform inventory plus all affected family repairs, peer-aware clean removals, immutable archive and license content, real consumer compatibility |
| 13 UI | 13-01–04 | Native overlays, safe formatter, initial fixtures before Home/Calendar repairs, critical cross-browser CI, motion/nonvisual consumer completion |
| 14 SDK/transports | 14-01–03 | Explicit version/authority/error contracts, receiver compatibility, actual installed consumer matrix, server-only privileged SDK and adoption |
| 15 Data | 15-01–04 | Approved typed analytics actually wired via generated plans, bounded provenance/cursors, one applied migration authority and copy/retention ownership |
| 16 Observability | 16-01–03 | Sanitized identity across all producers, source-map/actual-environment receipt, valid incident denominators and authorized alert delivery |
| 17 Containers | 17-01–04 | Exact runtime identity, actual disposable startup/shutdown, external containment drills, rebuild/restore/rollback evidence; no production activation by plan text |
| 18 Docs/history | 18-01–03 | Current instructions, body-reviewed dispositions, exact status corrections, two-sided handoffs; title inventories do not establish full-history review |
| 19 Capacity/recovery | 19-01–03 | Identified bounded workload and measured bottlenecks, executed repair children, tenant fairness, actual store erasure/restore under decided policy |
| 20 Integration/re-audit | 20-01–03 | All requirements on exact candidates, authorized release and smoke, all original questions reassessed with residual/new work retained |

Cross-phase shared-file reservations that need root serialization: Hub `vite.config.ts` in 12-02/16-02; Hub CI in 13-03/16-02; CRM SDK manifest in 12-03/14-03. Within-phase shared files follow the DAG: runner 10-01→10-03, Drone 11-01→11-06, Shells 11-02→11-03/04, Hub lock 12-01→12-02, fixture 13-02→13-03, sentiment consumer 13-01→13-04. Dynamic child plans must be added to this same ownership/dependency review.

## Remaining warnings and mandatory execution gates

- **W1 — Commands versus acceptance:** 11-05, 15-01 and 19-02 include a self-plan structure command for a task whose useful output is an evidence/repair inventory. That command cannot prove the generated child plans, observed effect corpus or after-workload result. The task actions and closure policy correctly require those results. Before finishing such a task, record the actual corpus/discovery command, validate every child path/hash and retain failed/unrun behavior as pending. Similarly, `--validate-only`, `--fixture-only` and browser `--list` invocations are preparatory checks; they do not prove a real remote drill, consumer install, journey or release. Actual executions explicitly required in actions/done remain mandatory.
- **W2 — Frontmatter links:** many new `via` fields say “Read-first contract and behavior verification” instead of the concrete function, persisted key, protocol event or import. Tasks usually explain the real wiring. Refine these fields at execution-plan refresh, especially journal→receiver acknowledgment, SDK validator→pending request map, and producer→telemetry delivery; do not treat a documentation link as proof of wiring.
- **W3 — Context size and directory ownership:** 09-01 is a retained larger initial slice, four tasks/12 declared entries. 13-01 includes a whole fixture directory. Keep source and verification seams independently reviewable, enumerate changed fixture files at dispatch/summary, and avoid expanding these scopes with unrelated fixes. Do not rewrite completed work merely to reduce counts.
- **W4 — Dynamic plan count:** dependency families, governance, canvas consumers, receiver adoption, typed datasets, migration authority, capacity and proposal status corrections may add plans. Their parent reports remain incomplete capability evidence. Root must maintain exact-path inventory and completion checks as children arrive, and run a new plan review on those children. Forty-one summaries cannot close 47 requirements automatically.
- **W5 — Native and real-engine proof:** the parent reports repaired native fixtures and a real PGlite authorization fixture; this checker reviewed the revised plans, not the implementations. Independent source verification still needs the actual fixture commands/results and candidate identity. PGlite does not certify deployed PostgREST/JWT/RLS/pooler behavior. Native component fixtures do not certify all authenticated routes or cross-browser accessibility.

No unconditional unresolved blocker remains in the revised plan text. The root-owned exact-path dispatcher guard is still a **pre-dispatch gate**, and per-plan source/runtime/policy/authority prerequisites remain mandatory. Source work in an independent admitted slice can proceed while those unrelated gates are pending.

## Structured issues

```yaml
issues:
  - id: W1
    plan: "11-05,15-01,19-02,12-03,13-03,17-03,20-01,20-02"
    dimension: task_completeness
    severity: warning
    description: "Preparatory/self-plan commands do not prove the substantive runtime or generated-child acceptance required by actions and done."
    fix_hint: "Record and execute the substantive commands when prerequisites exist; validate every child plan; keep unavailable actual evidence pending."
  - id: W2
    plan: "new inventory"
    dimension: key_links_planned
    severity: warning
    description: "Generic frontmatter via fields weaken machine-readable wiring despite specific task actions."
    fix_hint: "Name concrete function, protocol event, persisted key or import when refreshing each source plan."
  - id: W3
    plan: "09-01,13-01"
    dimension: scope_sanity
    severity: warning
    description: "Larger retained security slice and fixture-directory ownership need bounded context and exact changed-file accounting."
    fix_hint: "Keep source/verification seams separate and enumerate fixture files; preserve prior work."
  - id: W4
    plan: null
    dimension: context_compliance
    severity: warning
    description: "Legacy phase15 collides numerically; dynamic children and SUMMARY counts require exact-path/evidence admission."
    fix_hint: "Use root's exact-path dispatch guard and independent evidence, never numeric glob or summary count as completion authority."
  - id: W5
    plan: "09-01,09-02,13-01"
    dimension: verification_derivation
    severity: warning
    description: "Revised source/fixture evidence is outside static plan certification."
    fix_hint: "Independent verifier runs actual query/engine/native fixtures and preserves live-runtime limits."
resolved_issues:
  - "DEP-01 platform inventory and non-Hub repair coverage added."
  - "Initial UI fixtures moved before Home/Calendar assertions; later plan expands them."
  - "Receiver acknowledgment gap gets explicit early child-plan dependency under D360-06."
  - "Exact-path inventory excludes untouched legacy phase15."
```

**Standards axis:** admitted with the warning-level plan refinements above and mandatory ownership/identity gates. **Spec axis:** all 47 requirements have bounded implementation or explicit evidence-to-implementation paths; none is fulfilled merely by admission. Production remains unchanged by this review.

## Reviewed plan manifest

Hashes pin this review to plan content. The parent may make later amendments; changed scope needs a new disposition.

| Plan | Tasks | File entries | Wave | SHA256 |
|---|---:|---:|---:|---|
| 09-01 | 4 | 12 | 1 | `3752f0f8f89ed1a3aa8cf6aca247411699d6b8ec0caf57d01d703d0a9ecbc555` |
| 09-02 | 3 | 7 | 1 | `7f37afdb540d02b51f0fa25e5250be7cc2f329de8e08e1b6c7c5e0a284bb80ef` |
| 10-01 | 2 | 4 | 1 | `1093feb1c681b5c2cbd696627ab47e10b9c8fc95361a56ad1d613542d20c99fc` |
| 10-02 | 2 | 4 | 1 | `ef4a9d2273b81903c3e1d80c9002603397fca7ec6c414c8bae738912e247de62` |
| 10-03 | 2 | 5 | 2 | `364350816b2dd78381728355726057bf5f330dd1574bdebbc920b25c282a8277` |
| 11-01 | 3 | 8 | 1 | `e2043d0227abbdae6badb903c7c5f0f5c81d9853642ba335ce627ee22d96a80e` |
| 11-02 | 2 | 3 | 1 | `4599cd27f828d9a47ab02724c402e7a73e8cf1d8b026a9a64d83608a58639139` |
| 11-03 | 2 | 5 | 2 | `261df1e27c3b17d907d8504420595d0005f3ea362c45b817a490d6779d4f5b1d` |
| 11-04 | 2 | 6 | 3 | `561fe465cbfabef1d43b4c40e52662f5ce1170a694d28f10b74dd05d7c08cd39` |
| 11-05 | 2 | 4 | 4 | `9efa1f270a59b02084228575c5c5b72401af9c94b0708433dc7daacabd4e420f` |
| 11-06 | 2 | 7 | 2 | `6deb130cc4cd279025f7e305f14057fe258f6935b8162957a111e96010ba5ee2` |
| 12-01 | 2 | 4 | 1 | `844d9db4af196839d4131e2ee0e965392dbb0add514776f60225aa3ccdbf72fc` |
| 12-02 | 2 | 6 | 2 | `399ae99f7b7a5c8258f428ca302bd4e03f8a05b181bfe9126e0bc828a1497032` |
| 12-03 | 2 | 8 | 3 | `c304c39a4b362c73e50958ae9d604171e13f43b89c7086d7d6f610be338e0537` |
| 13-01 | 3 | 9 | 1 | `c266584b7d11062de2455108224133d1b4950f39109cf98dae7a0cfb237a275e` |
| 13-02 | 2 | 7 | 2 | `b973bd3691f59526870c3fd54f3b65143518579eec462e240317d6ce027967c0` |
| 13-03 | 2 | 7 | 3 | `9223acb5c889a52c409b5e3258246163ffc0c47585d5e6a9c41418cf56a658c3` |
| 13-04 | 2 | 5 | 4 | `43c74329eadd4bd0097cf725ca132f8e86c2cb303854a026b8a5686964fa42a7` |
| 14-01 | 2 | 7 | 1 | `69025d3856da32255c0d14977560c5771f0b0b55336fb50e27a2245eaf39b2b5` |
| 14-02 | 2 | 6 | 2 | `662139c19500a43dbc5657a199f3f62a5be7e55e8580368557918d2026a356ce` |
| 14-03 | 2 | 5 | 2 | `e81863f343dfd5689437fec5ad3df53c1c320a4e2f6e7c654ac10f014fe4721d` |
| 15-01 | 2 | 4 | 1 | `9fdadc6d2e1f54dffad3ca36c4f322c3ea4317b1e5228af511a2b6744c8158ab` |
| 15-02 | 2 | 4 | 1 | `11e1b2f14ccfe0d860438005a4590cce4e94c89504f83686872f5978f11714a1` |
| 15-03 | 2 | 6 | 2 | `f299105ae41f3f1042ba7b11932a3f02e9ccf1b50204d3eaa8eee4bd93ccea68` |
| 15-04 | 2 | 6 | 1 | `41fbd883f68eee99044c836622b35d4c430fcf49fb5c4f3bb241471598323516` |
| 16-01 | 2 | 5 | 1 | `cf0cc2026d1f4108883fdb3ab4248f6289cbfd533743fc25dcc0fdd80fb71c0a` |
| 16-02 | 2 | 7 | 2 | `58a9d91501f0cc4d930e3bd9f3a561b429a94cbee544cb7383b6d4f4baf6df2e` |
| 16-03 | 2 | 5 | 3 | `bd9e651cae70029aa4913c411783ef86ef04afccdc7d2b9de23e8878e2e22770` |
| 17-01 | 2 | 5 | 1 | `d25debc123b94c427de6cb4a111c3fb586d2f6612354c2e206cae54d61b4c678` |
| 17-02 | 2 | 6 | 2 | `5bff2307b541eb9896835a7c3f0a88ad6142815a71bbd70821ab2c5f5fe0aa7b` |
| 17-03 | 2 | 6 | 3 | `7efe435cb128db0f601e029c81ffdfbc1a97396a13496bdd327315152ddc15db` |
| 17-04 | 2 | 6 | 3 | `b87c68b41e278119ed3752e76c8ae392838839a4ce8194d81e8ff566637323b0` |
| 18-01 | 2 | 7 | 1 | `242325ffe017bc1e2ed8d07151804113da4da1e2bef19444609566a36a82c265` |
| 18-02 | 2 | 6 | 2 | `e1da6c04a808bc853f3e11303779ef91b31afb7286a00bfec77c0d5e6a5d9709` |
| 18-03 | 2 | 4 | 3 | `663bdffaf5a16e0f839eb7c62b2eeefd43a09409245152aa24c3cb3605aa6fe9` |
| 19-01 | 2 | 6 | 1 | `f3109622880296f48a7ea01b8a50327e32f7a16ef2550a1d6ad23883ca4f57ed` |
| 19-02 | 2 | 5 | 2 | `4ae4d1956b204b0a87a5e94b6840a603cb217b9ef766948bde57da8e8fdfed23` |
| 19-03 | 2 | 6 | 3 | `5d05eb3e83daace11371c910b343d3efe23ae4d839a49549261ccb1ed35291b1` |
| 20-01 | 2 | 6 | 1 | `10f85e623c62cf9c03df11a5fb099513b6d29f47b9ee953807077074413ae476` |
| 20-02 | 2 | 5 | 2 | `1c41afc83552114206b4e34812befad312652917e8da9e29b40eb637d6a543da` |
| 20-03 | 2 | 5 | 3 | `3a4ac8723baaf0e9a17792b64e3381e742fb1a7a70b5ad71783292ffa8b78bc4` |

## Requirement map

| Requirement | Plans | Status |
|---|---|---|
| AGT-01 | 11-01, 11-06 | Planned; independent behavior/runtime acceptance pending |
| AGT-02 | 11-01, 11-06 | Planned; independent behavior/runtime acceptance pending |
| AGT-03 | 11-02 | Planned; independent behavior/runtime acceptance pending |
| AGT-04 | 11-03 | Planned; independent behavior/runtime acceptance pending |
| AGT-05 | 11-04 | Planned; independent behavior/runtime acceptance pending |
| AGT-06 | 11-05 | Planned; independent behavior/runtime acceptance pending |
| CAP-01 | 19-01 | Planned; independent behavior/runtime acceptance pending |
| CAP-02 | 19-02 | Planned; independent behavior/runtime acceptance pending |
| CAP-03 | 19-03 | Planned; independent behavior/runtime acceptance pending |
| DATA-01 | 15-02, 15-03 | Planned; independent behavior/runtime acceptance pending |
| DATA-02 | 15-04 | Planned; independent behavior/runtime acceptance pending |
| DATA-03 | 15-03, 19-03 | Planned; independent behavior/runtime acceptance pending |
| DEP-01 | 12-01 | Planned; independent behavior/runtime acceptance pending |
| DEP-02 | 12-02 | Planned; independent behavior/runtime acceptance pending |
| DEP-03 | 12-03 | Planned; independent behavior/runtime acceptance pending |
| DOC-01 | 18-01 | Planned; independent behavior/runtime acceptance pending |
| DOC-02 | 18-02 | Planned; independent behavior/runtime acceptance pending |
| DOC-03 | 18-03 | Planned; independent behavior/runtime acceptance pending |
| JOB-01 | 10-01, 10-03 | Planned; independent behavior/runtime acceptance pending |
| JOB-02 | 10-03 | Planned; independent behavior/runtime acceptance pending |
| OBS-01 | 16-01 | Planned; independent behavior/runtime acceptance pending |
| OBS-02 | 16-02 | Planned; independent behavior/runtime acceptance pending |
| OBS-03 | 16-03 | Planned; independent behavior/runtime acceptance pending |
| OPS-01 | 17-01 | Planned; independent behavior/runtime acceptance pending |
| OPS-02 | 17-02 | Planned; independent behavior/runtime acceptance pending |
| OPS-03 | 17-03 | Planned; independent behavior/runtime acceptance pending |
| OPS-04 | 17-04 | Planned; independent behavior/runtime acceptance pending |
| QC-01 | 20-01 | Planned; independent behavior/runtime acceptance pending |
| QC-02 | 20-02 | Planned; independent behavior/runtime acceptance pending |
| QC-03 | 20-03 | Planned; independent behavior/runtime acceptance pending |
| SDK-01 | 14-01, 14-02 | Planned; independent behavior/runtime acceptance pending |
| SDK-02 | 14-02 | Planned; independent behavior/runtime acceptance pending |
| SDK-03 | 14-03 | Planned; independent behavior/runtime acceptance pending |
| SEC-01 | 09-01 | Planned; independent behavior/runtime acceptance pending |
| SEC-02 | 09-01 | Planned; independent behavior/runtime acceptance pending |
| SEC-03 | 09-01 | Planned; independent behavior/runtime acceptance pending |
| SEC-04 | 09-02 | Planned; independent behavior/runtime acceptance pending |
| SEC-05 | 09-02 | Planned; independent behavior/runtime acceptance pending |
| SEC-06 | 15-01 | Planned; independent behavior/runtime acceptance pending |
| STK-01 | 10-02, 10-03 | Planned; independent behavior/runtime acceptance pending |
| STK-02 | 10-02, 10-03 | Planned; independent behavior/runtime acceptance pending |
| UI-01 | 13-01, 13-03 | Planned; independent behavior/runtime acceptance pending |
| UI-02 | 13-01 | Planned; independent behavior/runtime acceptance pending |
| UI-03 | 13-01, 13-02, 13-03, 13-04 | Planned; independent behavior/runtime acceptance pending |
| UI-04 | 13-02 | Planned; independent behavior/runtime acceptance pending |
| UI-05 | 13-03 | Planned; independent behavior/runtime acceptance pending |
| UI-06 | 13-04 | Planned; independent behavior/runtime acceptance pending |

## Addendum — 09-03 tenant inference and URL policy

The root added SEC-07 and SEC-08 after independent source verification, increasing the program to **49 requirements**. The 41-plan/47-requirement review and manifest above describe their earlier snapshot; they do not certify coverage of the new requirements. This addendum admits 09-03 only. 09-04 was not present at this inspection and has no admission from this addendum. Root owns updates to the exact-path inventory/guard.

**09-03 verdict: ADMITTED for scoped source implementation.** SHA256: `c85a737fd02bd40dded50349d1c8019ac28d02c71006177a8417b2ceddc6215d`. Native GSD structure passes, four tasks, eight source/test files; wave2 depends on09-01. Requirement SEC-07 is directly covered, with related SEC-02/03 regression coverage. No deployment, database mutation, broad IAM change or suspected caller-ID exploit is admitted.

Goal-backward review:

- Tenant authority must not come from the first global organization. The plan removes inference in both `finishApp` and the reusable tenant helper, and requires the actual exported hook chain→actual POST→actual auth/helper fixture. Only identity-provider/external/persistence boundaries are stubbed, so the test cannot assume tenant denial in a mocked helper. Verified-user/no-tenant member/admin, anonymous and explicit valid-context controls distinguish denial from breaking all requests.
- Enrollment must remain possible. The no-org onboarding redirect reaches existing `/join` before provisioning, linking or host work. Join/public/internal/cron exceptions retain their own authentication while receiving no synthetic tenant. This is explicit task/verification coverage, not a general promise to preserve onboarding.
- PUT must apply POST URL policy before persistence. Tests use the actual shared guard with DNS stubs, retain authorized token-only updates and sanctioned private-network opt-ins, and verify denied tenant/server-link precedence and fixed credential-safe errors. Policy parity does not establish a reachable outgoing SSRF exploit.
- Runtime/provider verification, membership selection, AUTH_DISABLED, token caching, join service targeting and Svelte markup remain outside ownership. Root must serialize `hooks.server.ts` against observability work and the server mutation files against09-01 before dispatch. The phase remains open for SEC-08 and rollout gates.

Warnings: four tasks exceed the preferred2–3, but the fourth is evidence/handoff; keep the three behavior seams separately testable. The summary artifact is task-owned but omitted from the eight source/test frontmatter entries; root can account for it as the standard plan output. These are not blockers. No research/Validation Architecture was added, so Nyquist remains not applicable for this plan. Static admission does not prove the source fixes, red/green result, actual identity cache or deployed behavior.

```yaml
issues:
  - plan: "09-03"
    dimension: scope_sanity
    severity: warning
    description: "Four tasks; the final task records evidence. Preserve separate verification of hook/helper, enrollment and URL policy seams."
    fix_hint: "Keep the eight source/test files and standard summary bounded; do not expand into unrelated IAM or server migration work."
```

## Addendum — 09-04 initial review pending two contract refinements

Reviewed draft hash `e688d13069eaa8ccb0b4c03ae79980f5789b72fe29ef78a29b8f6541f4062dc5`. GSD structure passes: three tasks, five implementation-owned files, wave2→09-02, SEC-08 with SEC-04 regression. The trusted POSIX writer assumption, no-await adjacency, descriptor-before-truncation rule, exact configured/shared ledger identity, hardlink and ancestor validation, and single prepared CRUD surface are well bounded. The text correctly denies a race-proof or hostile-same-UID isolation claim.

**Admission held for two small plan refinements**, both within the current file scope:

1. Main database identity is not the complete SQLite filesystem resource. Include known `-journal`, `-wal` and `-shm` sidecars in alias/nonregular-target validation and actual-engine fixtures before opening/reusing a handle. Preserve legitimate WAL/journal operation. SQLite documents these companion files and also engine-managed temporary storage; ordinary temp I/O must be explicitly operator-controlled or remain an exact-runtime qualification gate. This is a missing acceptance boundary, not a newly executed exploit. [SQLite temporary files](https://www.sqlite.org/tempfiles.html).
2. `PRAGMA database_list` establishes attachments, not clean retained connection/global policy or absence of registered effectful functions. A previously unrestricted writer may carry state outside that observation. Require a known trusted initializer/connection/schema/function provenance boundary or fail-closed rejection plus explicit fresh-runtime qualification before shared/cached reuse. Do not mutate another subsystem's handle to pretend it has been sanitized. SQLite's temp-directory setting can affect process-wide state; a no-attachment result cannot establish that state. [SQLite PRAGMA reference](https://www.sqlite.org/pragma.html#pragma_temp_store_directory).

The scope may continue to exclude hostile same-UID writers and OS-enforced sandbox implementation, but these exclusions must remain deployment gates. Caller-to-runner authority A9, schema/extension trust, saved legacy DDL/link compatibility and runtime identity also remain separate acceptance. No application/runtime probe was executed by this checker.

```yaml
issues:
  - plan: "09-04"
    dimension: verification_derivation
    severity: blocker
    description: "Main-file path tests omit the SQLite sidecar resources involved in actual database operations."
    fix_hint: "Add sidecar alias/nonregular validation and real-engine fixtures; document operator-controlled temporary storage boundary."
  - plan: "09-04"
    dimension: key_links_planned
    severity: blocker
    description: "Attachment inspection alone does not establish the trust of previously unrestricted shared/cached connection state."
    fix_hint: "Require known initializer/schema/function provenance or deny reuse; preserve explicit fresh-runtime qualification and do not silently reset shared state."
```

## Addendum — 09-04 revised admission

The parent authorized amendments within the existing five-file implementation scope. Both preceding plan blockers are now resolved in the written contract and acceptance matrix.

**Verdict: ADMITTED for bounded local source implementation**, hash `86d18fa068e7e252214c3ec83f175b6723a4541d02280fc79e9b070213afde4a`. GSD structure recheck passes: three tasks, five implementation files, wave2 depending on09-02. SEC-08 is directly covered; SEC-04 retains the reader regression requirement. Root owns addition to the exact-path allowlist and subsequent requirement status.

Changes reviewed:

- Main file and known `-journal`/`-wal`/`-shm` companions form the checked resource family. Existing links, hardlinks and nonregular companions deny before opening/reuse, with real-engine negatives and legitimate journal/WAL positives. Recovery files cannot be deleted and journal modes cannot be changed to disguise failure.
- Shared/cached use requires known trusted initializer, persisted schema, SQL function/extension and connection-policy provenance. No-attachment state alone is insufficient. Unknown provenance fails closed; a broader seam requires a newly admitted prerequisite. The executor cannot invent a flow-author-controlled trust bit, reset another subsystem's PRAGMAs or close/detach its writer to obtain a passing result.
- Engine-managed temporary I/O is explicitly distinct from the main database resource. The plan no longer implies all SQLite I/O is under stateDir. Operator-controlled temporary-storage policy and exact Node/SQLite/VFS qualification remain required. The primary SQLite documentation cited in the preceding addendum supports this distinction; this checker did not execute an engine exploit or infer a proven sidecar bypass.
- A fresh exact-image process plus trusted persisted schema/data/function provenance is a release gate. Restart alone cannot establish clean persisted schema. The trusted POSIX-writer assumption excludes hostile same-UID processes and concurrent ancestor replacement; source checks cannot certify that deployment fact.

Goal-backward result: caller-selected paths/SQL receive bounded rejection under an explicit resource and provenance model; overwrite/append checks precede truncation; independent readers remain read-only; consume and direct writers share admission; `sourceSQL` and the CRUD-only surface reject direct/appended file-management SQL. Required positive controls retain exact external configured-ledger access without sibling authority, shared-ledger lifetime, bound CRUD and legitimate file operations. Missing/no-follow/ownership/platform failures use bounded errors and cannot silently fall back to lexical trust.

No unconditional plan blocker remains. Implementation is authorized only within the five owned paths plus its standard summary. Where safe provenance cannot be established within that scope, deny the operation and record the exact prerequisite rather than weaken the contract. Independent post-implementation verification must come from a different verifier if the original security verifier executes this slice.

**Cannot be claimed from this admission or local tests:** hostile-writer isolation, deployed root/mount/UID trust, all SQLite file confinement, sanitized old process or data state, caller-to-runner authority A9, saved-flow DDL/link migration compatibility, or production release readiness. SEC-08 runtime acceptance remains pending until those applicable gates have evidence. No source implementation, live inspection, data mutation, permission change, process restart or deployment was performed by this checker.

```yaml
issues: []
resolved_issues:
  - "SQLite sidecar resource family and real-engine acceptance added."
  - "Shared/cached connection provenance distinguished from attachment state; unknown provenance fails closed."
mandatory_execution_gates:
  - "Exclusive five-file ownership and09-02 dependency evidence."
  - "Exact Node/platform fixture identity and all required positive/negative acceptance cases."
  - "New reviewed prerequisite plan if safe provenance requires broader source ownership."
mandatory_release_gates:
  - "Fresh exact-image process with trusted persisted schema/data/function/connection provenance."
  - "Operator-controlled roots/ancestors and engine-managed temporary storage; hostile same-UID writers excluded or separately isolated."
  - "Saved-flow migration, independent source verification and actual runtime identity evidence."
```

## Addendum — 10-02 matching stock schema declaration

**Exact scope amendment ADMITTED:** add only `minion_hub/src/server/db/pg-schema/stock.ts` to the four-file10-02 implementation scope. Reviewed base plan hash: `ef4a9d2273b81903c3e1d80c9002603397fca7ec6c414c8bae738912e247de62`. Root owns the final plan/hash/allowlist refresh; this decision does not accept unrelated later plan changes.

The matching Drizzle expression `uniqueIndex` for organization plus `metadata.invoiceId`, restricted to the migration's active invoice-issue predicate, directly implements the identity already required by task1. Keep expression, predicate and index identity consistent between schema, migration and preflight. Existing legacy rows without invoiceId stay excluded; cancelled history and permitted replacement semantics stay intact. Require active-duplicate rejection, cross-organization independence, cancelled replacement and missing-invoiceId controls. No historical backfill/rewrite, accounting policy change or broader schema edits are included.

The slice remains two tasks and now five source/test/migration files, within bounded scope. Parent and `jobs_fencing_execute` were notified of admission. Source/migration parity and actual PostgreSQL concurrency verification remain implementation acceptance; no production migration or completion was certified.

## 11-02 active duplicate boundary clarification

Root admitted the executor clarification on 2026-09-09: active identical request IDs replay the same run, conflicting active IDs fail deterministically, instance maxConcurrentRuns=1 is enforced. Completed durable replay remains11-03; gateway random UUID request IDs do not support a monotonic watermark. Session-only ACP late notifications and remote cancellation remain explicit11-03/04 gates. No unbounded terminal cache or protocol change is admitted. Clarified PLAN SHA-256: `9a7daa4a2724e67a06c5838ae1bfe0d1702bc70af04c0887d40b4d98220ed27e`. Independent implementation review remains required.

## Source-review amendments after execution

- 10-02 independently admitted fixture-only sixth file `minion_hub/src/server/services/stock.service.test.ts`: replace artificial non-UUID invoice mocks to support pre-mutation canonical item/warehouse validation. Locked DB invoice identity accepts equivalent UUID spellings. Required no-mutation rejection and uppercase/UOM fixtures pass in the66-test final suite. PLAN SHA-256 `451be8c1561d54054971d11d28d06826ae14743b5cdd8e5cd98b7ff26ef8e252`.
- 11-02 root independent review reproduced a JSON-null frame crash. Same bridge/test ownership admitted a nonnull-object/nonarray guard and recovery fixtures;18 independently rerun tests pass. Updated PLAN SHA-256 `d949fcc93a9b749c4b8113bcce4c17fc58b3cb455879d42169d0cc79d227c601`. Full protocol validation stays14-01.
- 12-01 independent reviewer admitted adding only `tests/dependencies/**/*.test.ts` to Hub vitest.config.ts include: the originally planned fixture path was otherwise undiscoverable. Executor must amend PLAN/files and prove real discovery before family admission.

## 09-05 independent root admission

Reviewed the three-task, seven-file restoration plan against09-04 findings and current initializer/schema/consumer seams. Admitted canonical outbox-only private initializer provenance and both writer/consume adoption, with real engine positive/negative controls and explicit trusted-process limitations. Generic SQLite loader, plugin API redesign, schema cleanup, deps and deployment are excluded. Unknown HMR/global handles stay denied; no constructor-history receipt is represented as a hostile-plugin capability boundary. Runtime, persisted-data and temporary-storage proof remain mandatory release gates. Draft reviewed SHA-256 `caa8eb59139736d1e87cec0e390ed6ebf675b967068a77097090446e693e8459`; admission changes only status before dispatch. Exact allowlist now44 plans,49 requirements.

## SQLite documentation-only amendment

Independent verifier admitted root correction of the power-loss/2x claims in minion/src/memory/sqlite-pragmas.ts with exact source/proposal handoff. No tuning value changes. This extra comment-only file is outside the seven-file09-05 behavior candidate and does not change its receipt/profile acceptance. Durability policy/qualification remains17/19.

## Current exact inventory structure receipt

Root rechecked all 53 allowlisted plans after the latest bounded admissions: 118 tasks, zero invalid plans and zero structure warnings. Receipt: /tmp/minion-360-gsd-structure-current.json. This checks GSD task structure, not semantic correctness, implementation or release. Latest child admissions are recorded in their phase review files; historical hashes above remain historical evidence.


## Exact 57-plan continuation structure check

Installed GSD `verify plan-structure` was rerun on every exact allowlisted path: 57/57 valid, 130 tasks, 0 parser errors and 0 warnings. Receipt: `/tmp/minion-360-2026-09-09/gsd-57-plan-structure.json`, SHA-256 `8ac8344c2ad2b0c2367c6fd261606158221f399300403fc4c8d430dc01b63696`. This verifies structure, not semantic adequacy, source admission, implementation, deployment or requirement closure. The 10-10 draft is not allowlisted. Task-specific gates in 12-07 and 14-04/05 still apply. Historical colliding phase 15 remains excluded.

### Sixty-plan structural receipt

Installed GSD validates all 60 exact admitted paths, 139 tasks, zero errors and warnings. Receipt `/tmp/minion-360-2026-09-09/gsd-60-plan-structure.json`, SHA-256 `3e054e2ede821e86f0a886173c51f891f8c67ff3fe21a98ad35687437e92f59a`. 14-06/07 source steps remain gated; 14-08 source is admitted. 10-10 and 14-09/10 remain drafts outside the allowlist. Structure does not establish implementation or release.


## Current 70-plan structural refresh

Rechecked only changed10-10 and14-06 plan bytes against the native GSD structural verifier; retained hash-matching prior results for68 unchanged plans. All70 pass:168tasks, zero warnings. Receipt `/tmp/minion-360-2026-09-09/gsd-70-plan-structure.json`, SHA-256 `fa5dcbf08a0de2810dcd10b496a6498f45229bc4cd3e101b6f42096209205831`. This validates document structure, not implementation completion.


## Current 71-plan structural refresh — 2026-09-09

Native GSD plan-structure validation covers all 71 exact allowlisted plans and 171 tasks: 71 valid, zero warnings. Unchanged plan hashes reuse prior native receipts; the four changed/new plans (14-06, 14-11, 14-14, 14-16) were revalidated. Receipt: `/tmp/minion-360-2026-09-09/gsd-71-plan-structure.json`, SHA-256 `bd22f0ccc1a882627a7767d7a16fb6fdef8b37187c6fe75a4088cdc4f2fe0f0e`. This establishes structure only. Draft 14-12 and packaging 12-08 remain outside the allowlist; no requirement is closed.


## Current 72-plan structural refresh — 2026-09-09

Packaging child12-08 is admitted for private setup after root review. Native GSD validation now covers72 exact plans and174 tasks:72 valid, zero warnings. Receipt `/tmp/minion-360-2026-09-09/gsd-72-plan-structure.json`, SHA-256 `8a8c33c5f993898dd9aa8eb60e461abc1d5e70597a4df09c08e8005fe0abf680`. Draft14-12 remains excluded until facade/setup qualification. Requirement and phase closure remain open.


## Current 73-plan structural refresh — 2026-09-09 (Claude resume)

Receiver child 14-12 is admitted after its facade/setup gates and private execution passed root rerun. Native GSD validation now covers 73 exact plans and 178 tasks: 73 valid, zero warnings. Receipt `/tmp/minion-360-2026-09-09/gsd-73-plan-structure.json`, SHA-256 `9fc3bcbe904805a4e9863e747bc66f7175aa11c4931aaec0dcd6ad48eca0853d`. 12-08 and 14-14 records updated with root verification. Requirement and phase closure remain open.

## 74-plan refresh — 2026-09-10

14-17 (caller publication, strict receiver configuration, owned lifecycle) drafted and admitted; 11-03 rewritten as sender-only with backup/restore deferred to an undrafted 11-09. Both are DRAFT ONLY and gate on adoption receipts for the 14-12 receiver and the 11-07 journal, plus a consumer-resolvable shared package carrying the durable contract (not yet published; meta PRs #374 merged, #375/#376 open). Native validation: 74 plans, 184 tasks, 74 valid, zero warnings; receipt `/tmp/minion-360-2026-09-09/gsd-74-plan-structure.json`.

## September11 UI-first scope reconciliation

Root reviewed13-05/13-06 exact ownership, dependencies, zero-skip expectations and actual-component limitations; both pass native GSD structure validation (three tasks, no errors/warnings). Existing13-02/04 frontmatter now names the preserved Claude source/fixture additions explicitly.13-03's future authenticated spec has a distinct filename to prevent ownership collision with13-06's component suite. Raw SUMMARY counting still cannot close any of these plans; GSD initialization currently reports legacy milestone metadata, so exact-path v1.1 allowlist remains authoritative.


## September11 UI-first continuation review

Native GSD structure validation passes all81 exact allowlisted plans, mapping51 requirements; full receipt is `PLAN-STRUCTURE-2026-09-11.json`. This validates plan shape only. New13-07/08/09/10/11 slices have explicit source ownership and test boundaries;13-11's independent review adds real-page fixture coverage, manual tab activation, IME/reduced-motion/error privacy checks, and serialized translation/workspace ownership.13-08's native test dependency alignment is admitted from actual lock evidence, with no unchecked plugin cast.

Current local implementation evidence is summarized in `UI-FIRST-2026-09-11.md`; source/behavior qualification remains separate from merged source, registry publication and runtime adoption. All prior numbered scope counts in this document are historical. No automatic commit or release was performed during this continuation.


## September 11 combined UI and task admission refresh

All 86 exact allowlisted plans pass the installed GSD structure validator, covering the current 51 requirements. `PLAN-STRUCTURE-2026-09-11.json` records each result. This includes 14-18 actual Site page/service/SDK integration and 13-13 reconciliation of seven inherited Calendar files; 13-13 explicitly states it was created after that existing implementation. Task 1 of 18-03 is independently admitted before historical dispositions finish, with fixed native-parser scope and no semantic closure.

Both UI candidates pass full native Svelte checks. Site's final native suite passes 56 cases. Root independently verified the 60-file Hub and 31-file Site unapplied packet, including exact output hashes and native patch applicability. These local source and browser receipts do not mark any full requirement complete. The separate Site SDK candidate and CI wiring continue under explicit ownership.
