---
phase: 12-dependency-provenance
plan: "05"
status: diagnostic_complete_pending_independent_review
requirements_completed: []
key-files:
  created:
    - minion_hub/scripts/qc/trace-build-graph.mjs
    - minion_hub/scripts/qc/trace-build-graph.test.mjs
    - .planning/phases/12-dependency-provenance/12-BUILD-TRACE-RESEARCH.md
    - .planning/phases/12-dependency-provenance/12-BUILD-TRACE-RESULTS.md
  modified: []
---

# Plan 12-05: bounded Hub packaging diagnosis

The installed nft trace of the generated messages module completes with four files in 53.878 seconds at 223,556 KiB sampled peak RSS. This does not reproduce the whole-build OOM. The manifest and complete entry stop on outside-root metadata probes after 2.278 and 0.465 seconds, respectively; their dependency closure and memory behavior remain unknown. These are explicit containment outcomes, not packaging passes.

Implemented a marked temporary-artifact harness with selected input hashes, exact installed cached IO, resource limits, sanitized events, immediate containment stop and process-group timeout cleanup. Final synthetic tests pass 8/8 using the actual installed nft package. No product build configuration, dependency manifest/lock, application source, deployment or production data was changed by this diagnostic.

The initial real limits were 60 seconds and 2 GiB per child, as admitted by the root review and resource grant. These override the older larger illustrative limits still present in Task 2 of the PLAN. All real traces ran sequentially. All owned children exited and the resource window was released to root.

The messages result precedes the final guard-stop/hash-journaling refinement and lacks a contemporaneous harness digest; its artifact/result identities are retained. Root explicitly accepted finishing this evidence with that stated limit and requested no further heavy trace yet. Final manifest and entry runs embed harness/manifest hashes. An early raw-IO messages run and a manifest timeout caused by a swallowed hook exception are superseded diagnostics, not closure evidence. The final guard synchronously records a boundary and terminates the isolated child so nft cannot swallow the stop.

The exact boundary hashes match source literals `/minion/setup/setup.sh` and `/__data.json`. No outside metadata or content was read by those blocked hooks. Neither path is established as the OOM cause. Results recommend a separately admitted investigation of a faithful isolated filesystem before extending full-graph tracing. A product repair is not selected.

Validation: `node --test scripts/qc/trace-build-graph.test.mjs`, 8 passed, 0 failed, exit 0, 1.996 seconds; formatting passed. See [12-BUILD-TRACE-RESULTS.md](12-BUILD-TRACE-RESULTS.md) for the complete identities, per-run outcomes and evidence limitations, and [12-BUILD-TRACE-RESEARCH.md](12-BUILD-TRACE-RESEARCH.md) for upstream sources.

Open handoff: root owns independent review, the QC proposal entry for unresolved containment/memory cause, and admission of any next diagnostic/repair scope. The in-code TODO(handoff) points to that proposal and this result. DEP-01, DEP-02 and the frozen 12-01 dependency candidate's full-build gate remain open. There were no commits.
