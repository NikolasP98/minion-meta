---
spec: 2026-09-19-hub-pos-two-flow-hardening-spec
pass: 2
verdict: approved
reviewer: root-scheduling_hardening-and-frontend_hardening
created: 2026-09-19
reviewed_commit: 0acd6282
---

# Two-pass review

Pass 1, independent scheduling reviewer: no blockers. Required ticket -> line ->
prior booking lock ordering, preservation/audit of replacement history, explicit
customer validation, and product/customer checks for UID collisions. Parent owns
bookingStatus projection on ticket reads. Ordinary billing locks bookings before
new ticket inserts, so it does not invert an existing-ticket lock.

Pass 2, independent frontend reviewer: approved with incorporated clarifications.
Conflicting customer carts require an explicit choice; cancelled/rejected links
are pending but no-show is not; payment actions require no live coverage. Tests
must cover all-void and mixed payment histories, handoff conflicts, and reload.
F5's root cause remains unproven until a fixed-revision browser test.

User authorization is the explicit instruction to proceed with hardening. These
reviews authorize local implementation only, not merge or production changes.

## Implementation review

Independent scheduling reviewer approved the combined diff for standards and
spec conformance after finding and correcting two additional issues: concurrent
voids could reverse money twice, and historical customer soft references needed
same-organization validation. Three regression tests were observed failing before
the fixes, then passing. Final review covered ticket/booking lock ordering,
identity validation, replacement audit, pending predicates, mounted handoff, and
server policy enforcement. No blocking introduced integrity regression remained.

The reviewer used source inspection and the parent's reported runtime evidence;
it did not independently rerun the parent's browser or 307-test qualification.
The spec records remaining qualification and the unrelated full-typecheck error.
