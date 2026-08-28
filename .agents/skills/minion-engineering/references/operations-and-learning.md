# Idempotency, sequencing, and structural learning

## Idempotency

Design mutating operations to converge after retries and partial failure.

- Inspect and reconcile existing state before creating new state.
- Make cleanup content- or identity-based, not dependent on creation order.
- Detect stale locks and abandoned work safely.
- Regenerate fresh inputs for retried work.
- Test a second identical run and a restart after each meaningful interruption point.

If re-execution depends on unexplained leftovers, add reconciliation or make the precondition explicit.

## Verifiable sequencing

Choose the smallest unit that ends in a real check. Establish the known state, make one change, run the check, and only then continue. Do not defer all verification until after a sweep or migration. Order dependencies so each state is usable and observable; do not encode repository-specific commit or PR ownership into the sequence.

## Encode recurring lessons structurally

When the same correction appears twice, prefer the strongest feasible mechanism:

1. Make the invalid state unrepresentable.
2. Add a schema constraint, banned API, lint, or CI check.
3. Provide one canonical helper or generator.
4. Add a runtime assertion at the boundary.
5. Keep prose only when judgment is irreducible, with a concrete failure example.

Put each rule in one authoritative place. Remove duplicate instructions after structural enforcement exists. A recorded lesson is incomplete until it changes the mechanism or becomes a concrete tracked action under local repository policy.
