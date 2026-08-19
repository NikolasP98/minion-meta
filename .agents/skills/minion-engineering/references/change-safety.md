# Blast radius and runtime verification

## Blast radius

Do more than list callers.

1. Describe the behavior that changed, including implicit timing, serialization, persistence, and lifecycle effects.
2. Trace direct callers, downstream consumers, wire and storage formats, generated artifacts, configuration, version-pinned dependencies, and other languages or processes reading the same data.
3. Identify the one or two safety facts on which the change depends.
4. Prove each fact as far as practical: source line, impossible failure path, executable script/test, then running application.
5. Mark any fact that was not executed as **unproven**. Separate confirmed risks from checked-and-cleared risks.

For each real risk, state the failure path, likelihood, cost, and cheapest discriminating check.

## Runtime verification

Build and typecheck are necessary proxies, not proof. Exercise the actual input-to-output chain:

- Invoke the real command, endpoint, UI flow, worker, or integration.
- Read the actual value or durable artifact, not cached or derived status.
- Test the full communication path at integration boundaries.
- Prefer a deterministic reusable command over a one-time visual claim.
- Inspect delegated artifacts and behavior directly; do not rely on self-reports.

Record the exact command and observed result. Redact secrets and private data from reported output.
