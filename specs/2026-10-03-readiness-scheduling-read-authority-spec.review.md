---
spec: 2026-10-03-readiness-scheduling-read-authority-spec
pass: 2
verdict: approved
reviewer: gateway_fixes-sol
created: 2026-10-03
---

Pass 1 requested complete route/consumer inventory, POS ticket versus collection
contract distinction, explicit OR authorization tests, alias/re-export/HEAD
coverage, exact public/scheduler exceptions, and HR GET-only guards.

Pass 2 approved the corrected spec. Root traced the shared POS forms and Team
consumers. Final acceptance includes visible retryable read failures and late
response rejection, not only server denial. Ticket scheduling retains its
existing scheduling:edit requirement. The POS slots route checks view and the
create-or-edit alternatives from one capability snapshot to avoid inconsistent
reads of the permission cache.

Final implementation review: gateway_fixes Sol inspected Hub b5940d59 source and
requested a generation fence around the multi-range Team retry loop. Root applied
that correction and the reviewer accepted the final source/tests. Six mounted
read-state and two real TimeOff component tests passed in root runs. The reviewer
explicitly did not count a separate run whose wrapper lost its final output.
Full combined typecheck and browser/CI qualification remain integration gates.
