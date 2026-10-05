---
spec: 2026-10-03-readiness-hub-fresh-authority-spec
pass: 2
verdict: approved
reviewer: root-orchestrator
created: 2026-10-03
---

Two passes approved the bounded request-authority change. A removed preferred
organization must never reroute an API mutation. Page-load recovery is separate
from the API authority decision. Fresh directory lookups retain connection pools;
JWT signing-key caching stays with the Supabase SDK. Tests must cross the actual
request resolver and SQL boundary, not only mock a new boolean check.

Independent Sol hub_test_fixes review approved the source after correcting an
explicit empty organization cookie, removing dead cache mocks/comments, and
restricting no-tenant organization switching to the exact handler path. The
request resolver recovers only GET/HEAD app navigation before module guards.
Eighty focused tests pass across10files. Full integrated check is pending the
concurrent browser-qualification fixture type corrections.

Source checkpoint: Hub `5e391e52`. Final integrated Hub check after the fixture
corrections passed with zero errors and zero warnings. The independent worker
ran that check with the same public environment inputs as CI.
