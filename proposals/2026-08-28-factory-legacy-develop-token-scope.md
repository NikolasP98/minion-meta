---
id: 2026-08-28-factory-legacy-develop-token-scope
title: Remove GH_TOKEN from the legacy develop/self-test environment
status: draft
created: 2026-08-28
updated: 2026-08-28
repos: [minion-factory]
tags: [security]
---

# Remove GH_TOKEN from the legacy develop/self-test environment

## Problem (audit 2026-08-28, finding #3)

In the legacy single-container path (`agent/run.sh`, still the production
shape), `GH_TOKEN` is container-level env inherited by the model process and
by `bash -c "${FACTORY_SELF_TEST}"`. Only prose stops the develop agent from
running `gh pr ready` / `gh pr comment "All gates passed"` itself — it cannot
forge run `status=passed` (trusted wrapper writes result.json), but it can
forge the human-facing PR signal. Containment-v2 already fixes this
structurally: develop refuses to start when a GitHub credential is present
(`agent/factory-develop.sh:120`) and review runs with `github: null`.

## Proposed implementation

Either accelerate containment-v2 rollout (`FACTORY_CONTAINMENT_V2=1`) for all
dev runs — preferred, the isolation work already exists and is tested — or,
if v2 stays gated, restructure run.sh so the model+self-test subprocesses run
with GH_TOKEN scrubbed from env and only the wrapper's own gh calls read it
from a file (`gh auth login --with-token < file` in a wrapper-only HOME).

Blocked-by consideration: v2 rollout is the same lever that closes audit
finding #3's sibling (self-test with full token), so a partial run.sh patch is
only worth it if v2 is more than a few weeks out.
