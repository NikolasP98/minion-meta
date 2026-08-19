# TypeScript and boundary discipline

## TypeScript

Treat the compiler as a proof tool.

- Model variants with discriminated unions instead of contradictory optional fields.
- Give semantically different primitives distinct types when mixing them would be dangerous.
- Parse `unknown` external data into domain types. Do not spread `any`, unchecked `as`, non-null assertions, `@ts-ignore`, or `@ts-nocheck` inward.
- Make variant handling exhaustive with a `never` check.
- Derive types from the authoritative schema or generated contract instead of duplicating shapes.
- Strengthen types where an operation would otherwise be partial; avoid precision that adds ceremony without safety.

## Boundaries

Validate and translate once where untrusted or framework-owned data enters: CLI arguments, environment, config, files, databases, HTTP, RPC, queues, or UI events. Expose domain concepts inward, not transport, storage, or framework representations.

Keep the shell mechanical and business logic pure where practical. Inside the validated boundary, trust domain types and propagate errors consistently instead of scattering defensive checks. Do not leak private boundary types through public APIs.

Test boundary parsing separately from domain behavior when that separation reflects the real design.
