---
spec: 2026-11-06-agent-transcript-hotfix-promotion-spec
pass: 2
verdict: approved
reviewer: orchestrator-self-review
created: 2026-11-06
---

# Design review record

Pass 1 traced actual CI admission, branch policy and immutable release identity. Pass 2 challenged adversarial contexts, normal-route preservation and post-merge reuse. The exact branch plus exact current-main base is one-time; every hotfix prerequisite still runs and is checked. Both passes are orchestrator self-review, not independent code clearance. The owner's explicit scoped-exception choice is recorded in the matching proposal. Independent source review and final CI remain required before merge.
