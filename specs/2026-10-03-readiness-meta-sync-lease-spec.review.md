---
spec: 2026-10-03-readiness-meta-sync-lease-spec
pass: 2
verdict: approved
reviewer: root-orchestrator
created: 2026-10-03
---

Pass 1 traced every Meta SQL/blob write, corrected immutable digest reservations,
connection revocation/refresh races, database-clock expiry and bounded heartbeat
cleanup. Pass 2 rejected partial-null lease states and reusable cleanup keys.
The approved design keeps irreversible cleanup tombstones, allocates a new key
for a later same-digest generation, and excludes published files from cleanup.
Successful and failed cleanup passes both advance fair reconciliation time.
A nominal storage timeout is never proof that a remote write stopped.

Implementation may proceed through D1-D6. Native two-connection evidence and
independent final source review remain required; approval is not completion.
