# D Pulse SDD — independent technical pass 2

Date: 2026-10-23. Reviewer: `/root/astra_pulse_digest_pass2_recovery` (Astra). **Standards: REQUEST_CHANGES. Spec: REQUEST_CHANGES.** One bounded required correction, D2-01. This reviewer did not author these artifacts and changed no specification or implementation.

## Evidence identity and limits

Reviewed every artifact in `specs/108-harness-pulse/`, its board stub, D/E shared contract, approved parent A17–A20 and relevant safety/rollout requirements, and C's approved `cron-binding-v1` contract. Read Hub instructions, MINION engineering/review/change-safety and technical-writing guidance, constitution and UI governance. The prior pass-one reports were available as context; the caller inventory, source challenge and disposition below were independently derived.

Hub D and E remain at `ef62e8ac2dd8d83d7f38dae8ec04f59c50cf4283` with clean working trees at inspection. D branch is `feature/agent-harness-d-pulse`; canonical PR base is `master`. Frozen `bun.lock` SHA-256 is `c5e63e6b708c7abc562da19c95d7c317f2fd329fc558b43267e3853d15e454f0`; Hub AGENTS SHA-256 is `782e8f2c953134200af218064c46a4f6231864ecc6d0c050936e00314c7ec8a4`. All 19 authored D/E hashes match `pulse-digest-report.md`; D's exact ten are below. The meta checkout advanced through parent-owned commits during this session; artifact hashes, not its moving HEAD, identify this review.

This is an SDD review. No D implementation, SQL migration, application test suite, browser acceptance, remote gateway qualification or deployment was run. Source reads and the repository's exported documentation validators are review evidence only. The only executed SDK probe belongs to E and used an injected in-memory transport with no network.

## Standards

**Request changes:** D's explicit ownership and validation lists omit an existing affected UI consumer, contrary to the required complete-caller and blast-radius check. D2-01 is the only standards blocker. The remaining plan follows existing scoped SQL, RLS, action-runtime, EN/ES, semantic-token, seed-pairing and independent-review requirements. One D PR is the owner's approved packaging override; it does not authorize merge or deployment.

## Spec

**Request changes:** FR-003 says all current clients submit the reviewed revision, but the executable task/ownership/proof inventory does not cover the existing `/notifications` Pulse decision flow. D2-01 must be included before this pass can approve. No second blocker was found in the bounded A17–A20 review.

### D2-01 — required: include the existing notifications-page Pulse decision consumer

**Artifact anchors:** `specs/108-harness-pulse/plan.md:41–42` lists exclusive UI/proof ownership; `tasks.md:29–33` names only the state helper, popup and `/pulse` page for revision propagation and mounted coverage; `contracts/validation.md:12` limits the explicit browser journey to Pulse page plus popup. `spec.md:75` requires all current callers, while the AS-IS inventory at `spec.md:103` omits this consumer.

**Actual source:** Hub `src/routes/(app)/notifications/+page.svelte:111–115` calls `pulse.approve(id)` / `pulse.dismiss(id)` and then invalidates `app:notifications`. Its rendered buttons at lines 297 and 306 pass only `p.id`. Those cards come from the independent SSR `data.pulseProposals` list: `src/routes/(app)/notifications/+page.server.ts:34–36` calls `listPending(ctx)`. They are not necessarily the rows currently held in `pulse.items`.

**Trigger:** the user approves or dismisses an executable Pulse card from `/notifications` after D changes the server contract. If the shared helper requires a revision, this unplanned caller fails to compile or sends no revision and conflicts. If compatibility is implemented by looking up a newer revision in shared state or refetching immediately before submit, it can approve content different from the SSR card the user reviewed. Its current independent invalidation also needs the committed-write/failed-refresh outcome to avoid offering a second decision as recovery.

**Impact:** the existing decision surface is broken, or the reviewed-content invariant is weakened. The current named page/popup tests can all pass while this flow remains unqualified. T001's general instruction to audit callers does not resolve the contradictory explicit ownership and verification inventory in a frozen implementation plan.

**Smallest correction:** add the `/notifications` Pulse section and its SSR projection to D's source inventory, path ownership, T013/T014 and validation journey. Carry `expectedRevision` from the exact rendered `p` into the mutation; never synthesize the expected revision from a newer shared fetch. Reuse the same authoritative receipt/action outcome and read-only refresh recovery. Preserve the existing page's access rules and unrelated inbox/join-request behavior. No notification redesign, new feature or extra PR is required.

**Required proof:** mount the actual notifications-page Pulse consumer with its real mutation helper. Render revision 1 while the shared list/server holds revision 2; approval must submit 1, receive refresh-required conflict and produce zero dispatches. After an explicit refreshed display, a new decision submits 2. Cover approve and dismiss, owner-scoped SSR/readback, a committed response followed by failed `app:notifications` invalidation with exactly one write, reconnect to the same receipt, and keyboard EN/ES controls. Retain the current page/popup cases. The SDD correction must name these cases; development will execute them.

## Checked and cleared design boundaries

| Boundary | Independent source check and contract disposition |
|---|---|
| Decision atomicity and owner storage | Current `pulse.service.ts:63–98` updates independently without revision; the POST dispatches before `markApproved` at `proposals/[id]/+server.ts:43–70`. The SDD replaces this with proposal/revision locking, immutable target/action, one unique dispatch/job and decision in one transaction, plus direct-SQL immutability/state/scoped-FK and restricted-role tests. Legacy unbound information remains compatible. |
| SQL role and transaction ownership | `with-org-core.ts:25–60` reuses the supplied transaction and restores role/GUCs; `bg-runtime.ts:263–287` holds/validates the job generation; `job-effects.service.ts:375–400,423–430` demonstrates scoped domain work followed by bookkeeping on that same handle. D's T006 correctly avoids a nested independent commit or wider `app_ledger` queue grants. Ambient request transactions apply only to qualifying POS GETs (`hooks.server.ts:640–660`), not Pulse mutation/worker calls. |
| Selection, due time and retry | Existing claim `bg-runtime.ts:130–156` and global selection `:355–377` lack these safeguards. `contracts/shared.md:9–13` requires type/org/owner/due SQL before LIMIT, repeated claim/state/generation binding, direct-advance due checks, acquired-and-invoked counts, atomically persisted domain/job backoff and a future bounded return rather than a loop. Selected remaining budget accommodates E; legacy global tick retains its cap/default behavior. |
| Current authority | Cached RBAC at `rbac.service.ts:340–350` is insufficient; canonical `resolveMemberRoleKeys` and `buildCapabilities` are available. `personal-agent-binding.ts:39–76` shows live membership, credentials, lease and personal-agent reads. D requires those current rows before admission and a strict scoped resolver; it explicitly rejects the ambient fallback behavior at `gateway-rpc.ts:84–121`. |
| Same connection and gateway identity | Authenticated `hello-ok.server.version` / `commit` exist at Gateway `message-handler.ts:1077–1078`. D `contracts/pulse.md:24` requires exact full commit/version and assignment/credential qualification on the prepared socket, commit of local admission, then one dispatch on that same socket with no reconnect. Missing or mismatched trusted deployment qualification disables admission. This is a viable local-WS test boundary, not remote attestation or deployment proof. |
| Actual action and RPC schemas | Gateway calendar schema includes the `approved` bypass at `calendar-tools.ts:110–112` and uses it at `:256–269`; D explicitly excludes it and preserves downstream approval. `CronAddParamsSchema` at `cron.ts:200–212` is flat and rejects additional fields; D removes the current `{job:...}` envelope, binds explicit agent/origin session, uses isolated execution and `delivery:none`. C owns actual add/update/execution binding enforcement. |
| Irreversible admission and lifecycle | Post-admission ambiguity/crash never returns to retryable work; validated remote ID means scheduled only. Cancellation calls the real membership deletion/reconciliation paths (`user.service.ts:205–215,280–315`), fences generations and retains admitted tombstones. One-way raw snapshot redaction preserves identity/hash; current authority checks remain mandatory even if cleanup is delayed. |

The browser mutation same-origin guard is an explicit implementation obligation in `contracts/pulse.md:5`; generic hooks must not be assumed to supply it. Retention must be wired to the actual bounded cleanup/reconciliation path, not left as an unused helper. Both are already required, so they are review checkpoints rather than additional SDD findings.

## G2 assessment

These provisional scores apply to original bounded slices 17–20 packaged as one D PR. They do not override D2-01 or constitute approval.

| Axis | Score / 10 | Rationale |
|---|---:|---|
| slice_size | 7 | Four coherent slices; SQL, live-socket and crash qualification remain substantial. |
| dod_verifiability | 8 | Strong observable SQL/transport outcomes; missing notifications consumer needs explicit proof. |
| scope_containment | 9 | Existing Pulse/runtime; C and E boundaries remain clear. |
| impact_zones | 7 | Core boundaries are mapped, but one actual UI caller is absent from explicit ownership. |
| collisions | 8 | D/E shared files and parent serialization are explicit. |
| testability | 8 | Real SQL/process/WS/mounted procedures are viable; D2-01 closes the actual-caller gap. |

Equal-weight mean: **7.83 / 10; approval withheld for D2-01**.

## Validation performed

Recomputed all 19 authored SHA-256 values; all match. Ran actual exported `parseFrontmatter`, heading, scalar/array and slice-topic helpers for both board stubs: no errors. Checked local Markdown targets and sequential unchecked tasks: D has 26, E has 30, with no missing local targets. Read declared Hub validation commands and confirmed the planned entrypoints exist. A first broad `rg` included nonexistent optional helper globs; reran discovery against the actual `scripts/spec-frontmatter.mjs` and `scripts/spec-index.mjs` exports. No specification/index/source writes resulted.

## Exact reviewed D artifacts

| Meta-relative file | SHA-256 |
|---|---|
| `specs/108-harness-pulse/checklists/requirements.md` | `433626aee35d88ea157e6d1f4d4bea20e55083d6f03596f1d17efdfeb430be24` |
| `specs/108-harness-pulse/contracts/pulse.md` | `f79b1711226b807a3541f29fe16ab9574431f0fca9f24b6cb3af6d72799a4b52` |
| `specs/108-harness-pulse/contracts/shared.md` | `cb836393e5545253cfc7b4d15d781188429da1f42a1f787c6fc5764599bfd3ae` |
| `specs/108-harness-pulse/contracts/validation.md` | `0838bbb2ecde42f077693ded6ee4d7e29c7ae61638bacc7b3c4b802164ec6f5d` |
| `specs/108-harness-pulse/data-model.md` | `d02b11e5ac0354f44c9bd171fc80d13d2c2fa74d3cf9dfcddde5a78a0d1bb0ac` |
| `specs/108-harness-pulse/plan.md` | `46d8a9fcaedf597d833487b9e77a1072f51feeff532fb1bc823e9d4b1c555940` |
| `specs/108-harness-pulse/research.md` | `5b3180441368c36546e433c02ceaa8499c60edbfe81324b0cfac235e36630797` |
| `specs/108-harness-pulse/spec.md` | `60908aae64fee65aa9de9f100fee3d6354bb79a8fc3a49d1de931914b6a060e4` |
| `specs/108-harness-pulse/tasks.md` | `6bcff6d90d081bec9bdba831789b3179ddac2ae4b082a58e99fe64fa34d67694` |
| `specs/2026-10-23-harness-pulse-spec.md` | `5fb285a2cf7ad547340dac392ac5a73dfe3b4cc48c239a8e2b99a5154b33d6f8` |

## Disposition

**Pass 2 requires the bounded D2-01 SDD correction before D runtime development.** Parent/author owns revisions and renewed frozen hashes; independently recheck the correction and obtain both approvals for the revised artifacts. E's separate approval does not waive D's prerequisite. No merge, deployment, production migration, live/paid call or schedule activation is authorized by this report.


## Revision 1 bounded rereview — final pass-two disposition

Date: 2026-10-23. Same independent reviewer: `/root/astra_pulse_digest_pass2_recovery` (Astra). **Standards: APPROVED. Spec: APPROVED. D2-01: CLOSED at the revised hashes below.** This disposition supersedes the earlier request-changes decision for revision 1 only. The original finding and initial manifest above remain preserved as review history.

### Scope and source verification

Read `d-pulse-revision1.md` and the complete seven-document D correction diff. Recomputed the full ten-file D manifest and all six listed Hub source hashes: every hash matches. Independently rechecked the current notifications consumer at `src/routes/(app)/notifications/+page.svelte:111–115,281,297,306` and its SSR load at `+page.server.ts:15–41`. The source still confirms independent `data.pulseProposals` rendering, ID-only existing decisions and the `app:notifications` invalidation boundary identified by D2-01.

All nine E artifacts plus D's API contract, shared D/E contract and data model still match the original frozen manifest (12 unchanged files). FR-001–FR-009 are byte-identical to the pre-correction committed text. Tasks remain sequential T001–T026 and unchecked. This rereview did not reopen the previously cleared SQL/worker/gateway/provider design areas, which did not change.

### Standards

Approved. The plan now explicitly owns `src/routes/(app)/notifications/+page.{server.ts,svelte}` and its SSR test, and includes the actual notifications page in mounted fixture ownership. It preserves existing review/org-kind gates, adds the already-required Pulse capability/owner-safe projection to the changed section, and keeps inbox/join-request behavior outside the correction. The revised task and validation inventories require the actual page and helper, EN/ES, keyboard, route and design/token gates; replacement markup cannot qualify. No endpoint, permission expansion, redesign, new PR group or shared-interface change was introduced.

### Spec

Approved. Every D2-01 obligation has an owned implementation and observable proof:

| D2-01 obligation | Revised coverage and closure |
|---|---|
| Missing SSR/current caller ownership | Plan's UI/proof rows and T012 own the notifications SSR projection and actual load/real-reader test. Same-org other-owner exclusion, permitted legacy rows, safe projection and existing access boundaries are explicit. |
| Exact reviewed revision | T013 requires both notifications actions to pass rendered `p.id` and `p.revision`. It expressly forbids substituting the newer shared-state revision or a pre-submit fetch. Spec US2 scenario 5, T014 and validation step 8 test SSR revision 1 against shared/server revision 2, conflict and zero dispatch; only an explicitly refreshed display permits a new revision-2 decision. |
| Committed write with failed page refresh | Plan US2 and T013 require retaining the committed action outcome before `invalidate('app:notifications')`, fencing stale controls and offering read-only recovery. T014 and validation step 8 cover both approve and dismiss with exactly one mutation. |
| Durable receipt and owner-safe reconnect | Spec US2 scenarios 6–7 and T014 require reconnect to the same authoritative decision/receipt and owner-scoped SSR/readback. No new receipt meaning or API is invented. |
| Real UI and accessible recovery proof | T014 retains Pulse page/popup cases and mounts the actual notifications page with the real mutation helper. T024 includes the revised validation procedure; T025 explicitly adds notifications revision-conflict, owner denial, reconnect, failed-refresh and EN/ES keyboard screenshots/call counts. |

The test seams are viable against the existing source: SSR data is a page input, decisions call the shared Pulse helper, and invalidation has a named dependency. The current critical-journeys fixture already mounts actual route components with synthetic framework/transport inputs; it can extend that approach to this page. The separate real-PostgreSQL server-load test supplies the authority evidence that a synthetic UI fixture cannot supply. These are planned executable obligations, not claims that the future implementation or tests already pass.

### Canonical G2 scores at approval

Assessed over original bounded slices 17–20 grouped into the authorized D PR. The corrected existing caller adds no new feature scope.

| Axis | Score / 10 | Rationale |
|---|---:|---|
| slice_size | 7 | Four coherent slices; transaction, socket and crash proof remain substantial. |
| dod_verifiability | 9 | Every acceptance now includes observable proof through all current decision surfaces. |
| scope_containment | 9 | Correction stays within existing Pulse decisions; no notification redesign or new domain. |
| impact_zones | 9 | The formerly missing notifications SSR/action consumer is explicitly owned and tested. |
| collisions | 8 | D/E shared ownership and parent sequencing remain unchanged; notifications work is scoped. |
| testability | 9 | Actual SSR/reader and mounted helper/invalidation seams cover the source-confirmed failure. |

Equal-weight mean: **8.5 / 10, pass**. These scores replace the earlier provisional assessment for this revised candidate.

### Validation and evidence limits

`git diff --check` passed for the D artifact paths. Actual exported frontmatter, required-heading, scalar/array and slice-topic validators returned no errors for the board stub; it correctly remains `status: review`, `verdict: pending` pending parent registration. Relative Markdown targets exist, all ten revision hashes match, all six source hashes match, the unchanged twelve-file set matches, and all nine functional requirements remain identical. A narrow fixture-path search named optional paths absent from this checkout; the actual `tests/fixtures/critical-journeys/README.md` was read directly to verify the mounted-route approach. No fixture build or runtime proof is claimed.

This append is the only mutation performed by this rereview. No source/spec/index/commit mutation, application/database/browser execution, provider request, live/paid call, merge, deployment or activation occurred.

### Exact approved revision-1 D artifacts

| Meta-relative file | SHA-256 |
|---|---|
| `specs/108-harness-pulse/checklists/requirements.md` | `fc0eaeeed22ef1125352665cdf059722bc8d5a0050dfef4bc7c7d8110fc8bcea` |
| `specs/108-harness-pulse/contracts/pulse.md` | `f79b1711226b807a3541f29fe16ab9574431f0fca9f24b6cb3af6d72799a4b52` |
| `specs/108-harness-pulse/contracts/shared.md` | `cb836393e5545253cfc7b4d15d781188429da1f42a1f787c6fc5764599bfd3ae` |
| `specs/108-harness-pulse/contracts/validation.md` | `b34624423c44b063a4b3af36dad451bb5cadd759cd1dfb45993e31c6c13bfd62` |
| `specs/108-harness-pulse/data-model.md` | `d02b11e5ac0354f44c9bd171fc80d13d2c2fa74d3cf9dfcddde5a78a0d1bb0ac` |
| `specs/108-harness-pulse/plan.md` | `37965f6d85ffbed2e5f41f981abf67850785577e78c67a818eef59b214cf1e2d` |
| `specs/108-harness-pulse/research.md` | `5af597a077fedd6df921a1388b71a9fa9cba968c2a8f52d48712bc0294996d32` |
| `specs/108-harness-pulse/spec.md` | `127e3dafe1864eed711618c33c74f948573acf022d76f389e80afe8739e13578` |
| `specs/108-harness-pulse/tasks.md` | `1556373679bb78beaa15f18e041bb1fadd53df57db25f107bec46df713187537` |
| `specs/2026-10-23-harness-pulse-spec.md` | `cbcdb67f5f0899455d48909e33eb4905ac2150c5fa2f5ad3882e1546d864c997` |

### Final disposition

**Independent technical pass 2 APPROVES revision 1 at these exact ten hashes. D2-01 is closed.** The other independent pass must approve this same revised candidate before D runtime implementation begins. E's prior approval and unchanged shared interface remain intact; E still consumes D's verified implementation commit. Parent retains commit/PR sequencing, canonical `master` PR base and all human merge/deployment/activation gates.
