---
spec: 2026-09-28-hub-formula-column-variables-spec
pass: 2
verdict: approved
reviewer: sol-guardians-dob-and-quick-add
created: 2026-09-28
---

# Formula column variables specification review

Specification: `2026-09-28-hub-formula-column-variables-spec.md`.

- Standards/security/data review: independent Sol agent `guardians_dob`, APPROVED after revisions. The accepted contract separates actor-visible authoring from canonical validation, evaluates primary dependencies before auxiliary variables, preserves legacy conversion, freezes UUIDv5 identity, fingerprints referenced state, and bounds aggregate work without excluding legal scalar formulas.
- Requirements/UI review: independent Sol agent `quick_add`, APPROVED after revisions. One variable is unnamed; complex variables require unique names. Stable IDs preserve formatting under rename/reorder. Preview diagnostics/results identify the variable. Visual per-variable controls, primary sorting selection, accessible reorder, legacy repair states and partial-quality behavior are specified.
- User confirmations: visual controls per variable; formula variables only. Existing session authorization covers implementation, independent review, verified merge and deployment.

Implementation and release qualification are recorded below.

## Implementation review

Reviewed Hub head: `049bb8f8c73b8ade42599321a5d3a96d201d6908`.

Verdict: **APPROVED**. The separate CI, browser and release gates below also passed.

The independent implementation review covered:

- actor-visible authoring with canonical graph validation under the existing org/table advisory lock and property CAS;
- stable primary and auxiliary UUID identity through rename, reorder, primary selection, formatting and legacy adaptation;
- primary dependency ordering, auxiliary evaluation after primaries, true-cycle rejection, transitive type checks and all-dependency archive protection;
- masked non-primary redaction across definitions, values, catalog, mutation responses and metadata-only updates without hidden ID/name leakage;
- deterministic V1 adapter IDs and blocked restricted/unavailable repair states;
- coherent list, bundle, create, update and lifecycle projections;
- statement chunking at no more than 500 variable/record pairs and aggregate expression limits;
- partial, blank, error and restricted rendering with one accessible warning and unchanged primary scalar semantics;
- catalog refresh after successful mutations without changing the active draft, plus preservation of UUID-keyed formatting while analysis is pending.

The restricted legacy-secondary compatibility rule was reviewed separately. A visible V1 primary expression edit is allowed and preserves the canonical hidden V1 presentation. The same caller cannot submit a presentation mutation or convert the definition to V2; both are rejected with 422. This maintains the existing V1 editing path without exposing or overwriting the hidden secondary identity.

## Qualification evidence

- Focused UI: 3 files / 18 tests passed; manager catalog lifecycle 5/5 passed; deferred-analysis formatting regression passed.
- PostgreSQL: 2 files / 8 tests passed.
- Authenticated loopback HTTP: formula variables 7/7 groups and column presentation 6/6 groups passed.
- Formula-variable QA seed registration: 3/3 fixtures passed.
- Final-head browser qualification passed persisted create/edit/reopen, keyboard reorder and UUID-bound formatting. The API retained the primary UUID and the exact currency/sign plus percent/ratio/muted mappings after rename and reorder. Complete, partial and blank rows rendered the expected two values, exactly one accessible partial warning without positive tone, and one dash. Screenshots: `/tmp/column-variables-final-editor.png` and `/tmp/column-variables-final-cells.png`.
- Independent exact-head Sol review: approved `049bb8f8c73b8ade42599321a5d3a96d201d6908` with no remaining code, specification or security finding.
- Final-head CI run `36517049538`: all jobs passed.
- Preview deployment `6725968007`: succeeded at `https://minion-jrc824ec5-nikolasp98s-projects.vercel.app`.
- Hub PR #403: merged through the authorized workflow at 2026-09-29 03:30:42 UTC as squash commit `2c39b3494b8cfe05f131d42d512fe2db13c85b02`.
- No schema migration was required.

An earlier hosted run for `84043dd` passed test and check/build but failed the QA stack on the legacy V1 expression compatibility case. The implementation fixed that regression before the approved head. The older run must not be represented as final-head CI evidence.

## Production release evidence

- GitHub Production deployment `6726033312` reports success for exact merge SHA `2c39b3494b8cfe05f131d42d512fe2db13c85b02` at 2026-09-29 03:34:00 UTC. Deployment URL: `https://minion-opqi7mmk6-nikolasp98s-projects.vercel.app`.
- Reviewed head and squash merge have identical source trees (`git diff --exit-code` passed), and `origin/master` contains the merge.
- Post-merge CI run `36517458901` passed all applicable jobs.
- A fresh browser request to `https://hub.minion-ai.org/en/login?release=2c39b34` rendered the complete Minion Hub sign-in page after deployment. Authenticated formula create/edit flows were tested on the local synthetic QA stack; production verification did not mutate tenant definitions.
- Dev server remains available at `http://127.0.0.1:5199/en/pos/catalog`.
