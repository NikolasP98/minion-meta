---
status: admitted
reviewer: root
reviewed: 2026-09-09
requirements_completed: []
---

# Independent remaining-handler plan admission

Root reviewed the four plans against D360-11, source evidence and the completed10-03 implementation. The shared foundation is a dependency of all three adoption slices, including finance because reset-to-zero lacks a request epoch. Nine foundation files and three disjoint adoption scopes are bounded; no source/barrel or route addition is silently authorized. The foundation owns the only schema/migration and embeddings changes; adoption consumes frozen interfaces.

The plans preserve tenant RLS in the current owned transaction and restore role/GUC state before job bookkeeping. They avoid a broad job-table grant and reversed head/job lock order. Semantic identity is independent of legacy/current scheduling names. Provider selection and normalized request are pinned before admission; a missing durable response is indeterminate, and a new automatic paid request cannot repair it. Receipt constraints and vector/payload bounds must be enforced at public service entry and in persisted shape where practical; returned metadata alone is not validation.

Native tests must execute authored DDL and real service paths. The rootless PostgreSQL fixture is usable for foundation/finance tests, but the current binary distribution has no observed pgvector extension. Brain/corpus vector qualification therefore remains a concrete substrate prerequisite, not a passing text substitute. Backend-loss health waits for12-04; ordinary rollback/race cases may proceed. Current build packaging failure remains a separate shared release gate and is not waived.

Legacy job adoption must prove correspondence to the preexisting domain request under locks; ambiguity is rejected without a paid call. Retention has no inferred duration or purge. Existing current state remains readable through migrations and rollback does not reactivate stale workers. No production migration, provider call or release is authorized by this admission.

Plan structure checks passed for all four files. Root changed administrative draft wording only after review; final admitted identities follow.10-07 may begin after explicit file ownership.10-04/05/06 wait for its independent verification and applicable runtime substrate.

| Exact plan | SHA-256 |
|---|---|
| `.planning/phases/10-durable-jobs-stock/10-04-PLAN.md` | `f7bff696e9f7f72cf208ca38e830e32ddaa32605b42f936d6e80bf9ef6358ffd` |
| `.planning/phases/10-durable-jobs-stock/10-05-PLAN.md` | `16624eeec3d2041cc36e662f8cc09f31b1d8f38c83f7672dccd657e1b013e113` |
| `.planning/phases/10-durable-jobs-stock/10-06-PLAN.md` | `104eac725ef93f7b6f6e4dfab381638af9586e9853ccd95f0880f0c026cd485a` |
| `.planning/phases/10-durable-jobs-stock/10-07-PLAN.md` | `71a8384d19b2869977afd57ad6d8d8d8b0715d2035c95d04b6cad0b1ff64d40d` |

Root admitted the explicit finance legacy-recovery amendment: reject all unversioned jobs; authorized retry can replace queued/parsing/failed/undone requests preserving persisted progress, while done remains no-op and parsing undo remains409. The retry route is added for its contract comment only. Current10-04PLAN hash: `bc5202a0371ee1722d953206e6f1d2bee72fa71336ffe2212bc1ae32894567dd`. No shared-foundation change is admitted.

Root admitted10-05 legacy rejection/reingest clarification without extra source files; currentPLAN hash `71e5a46c94caaffc3a0fd8f3c9151f3551140211f0fac127da1ffa8857c51c1d`. No immutable legacy admission identity exists; existing explicit reingest establishes the new revision.
