# Stage 9 — Round 1

Target ../stage9-round1-target.md SHA-256 8b84585c139a3a0c78fc81707ae81ab49eaa04f801d123774fff7c0605714269; DetailedRange114–223. Three native fresh-context personas completed. 0 Blockers, 7 Majors, 1 Nit. This round was not clean before repairs.

| ID | Persona | Severity | Finding | Disposition |
|---|---|---|---|---|
| S9-R1-1 | readiness | Major | Segmenter does not define valid emoji; space/suffix token rules ambiguous. | PROPOSE FIX applied: exact name-validation contract, explicit regex grammar/control/space/suffix/runtime rules, 23 deterministic fixture vectors. |
| S9-R1-2 | readiness | Major | Slice2 editor depends on app:branding layout delivery deferred to slice3. | PROPOSE FIX applied: T008/T009 delivery/dependency/shared shell precede owner editor in slice2; only remaining consumers/qualification remain slice3. |
| S9-R1-3 | readiness | Major | Contract exempts platform admin from canonical profile but prescribed transaction cannot. | PROPOSE FIX applied: every writer including admins requires fresh canonical non-deleting profile and active-org membership. |
| S9-R1-4 | readiness | Major | Standalone native Updater and dedicated messages cannot import SvelteKit page reader. | PROPOSE FIX applied: exclude bundled updater/native messages as installer identity; hosted DesktopTitlebar remains included. Inventory now49 identity candidates of247. |
| S9-R1-5 | readiness | Major | Existing tenant PATCH schema/error behavior not executable. | PROPOSE FIX applied: exact name/slug object/types/normalization/bounds/unknown/null/empty/2KiB and 23505→409 rollback contract plus route tests. |
| S9-R1-6 | codebase | Major | File table omits explicit actions and current registry/test names. | PROPOSE FIX applied: implementation-files.md enumerates73 Create/Modify actions, includes rbac service/tests and named no-change registry decisions. |
| S9-R1-7 | codebase | Major | Refresh recovery does not settle original global action record. | PROPOSE FIX applied: capture context.actionId with owner/generation/scopeVersion; checked acknowledged refresh reconciles that record; unknown history remains unknown without operation proof; mounted runtime-record tests required. |
| S9-R1-8 | style | Nit | Authority/save paragraphs combine multiple independent contracts. | PROPOSE FIX applied: split by allowlist, transaction, simulation, mutation lifecycle and recovery responsibilities. |

Read receipts:

- /root/egm_s9_r1_readiness: persona+standard complete; target223 and tasks62/data31/contracts31/quickstart13/research71 complete. Clean Hub AGENTS/CLAUDE read before source. 5 Majors.
- /root/egm_s9_r1_codebase: persona79/standard35/target223/research71/data31/contracts31/coverage259 complete. source-evidence.json completely parsed2693 lines,247 candidates; all159 source file hashes independently match clean3d39cbb640da894c9d78bc840af6153b5d896724. Hub AGENTS280/CLAUDE1 complete. Verified tenant/provision/bootstrap/authority/lock/switch/layout/mutation/mobile/seed seams. 2 Majors.
- /root/egm_s9_r1_style: persona66/target223 complete; no additional standard. 1 Nit.

No reviewer accessed memory/history, changed source, ran application tests, built, or verified runtime. The main agent's 23-vector contract exercise after repairs is a document-contract check, not a test of implemented application code. All repairs require subsequent fresh review.
