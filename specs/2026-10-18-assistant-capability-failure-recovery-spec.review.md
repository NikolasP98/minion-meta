---
spec: 2026-10-18-assistant-capability-failure-recovery-spec
pass: 1
verdict: approved
created: 2026-10-18
reviewer: codex-independent-reviewers
---

# Review

Behavior pass (dynamic_catalog): approved. Search/SDK metadata must preserve useful local tools; loading a requested missing capability under permanent unavailable inventory must terminate with TOOL_CATALOG_UNAVAILABLE, including remote groups resolving empty. Alternate SDK inspection must expose the same incomplete inventory status.

Authority pass (hub_answer): approved. Verify exact persisted legacy identity on the selected authenticated org gateway; atomically bind only NULL assignment while rechecking current membership, gateway identity/credentials and row state. Never rebind non-NULL assignments, infer authority from model text or log credentials.

Output feasibility pass (execution_guard): approved. Shared egress must cover streaming/block/final extraction and preserve quoted examples. Existing error handling can reject repeat recovery before provider invocation without adding a retry layer. Both spec reviews completed before implementation.

Production repair remains a separately reviewed, explicit owner-approved mutation. No production state was changed by these reviews.
