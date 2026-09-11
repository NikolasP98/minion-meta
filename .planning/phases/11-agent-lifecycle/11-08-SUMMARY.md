---
phase: 11-agent-lifecycle
plan: "08"
status: verified_source_slice
requirements-completed: []
---

# Bridge environment injection

loadConfig(env) now passes its environment into required-field and optional-integer helpers. An explicit argument cannot silently borrow ambient identity, credentials or scheduling settings. Calling without an argument still reads current process.env. Public API, command splitting, integer parsing and default values are preserved.

Ten actual-loader cases cover conflicting ambient values, five missing injected required fields, injected integer/default behavior, immutable input and no-argument compatibility. Baseline8fail/2controls; corrected10pass. Independent review repeated10pass and strict TypeScript success. Scoped lint reports0errors/0warnings. See11-08-VERIFICATION.md for independent source/private hashes and command receipts.

The private credential-free fixture is /tmp/minion-11-08-ic9duaz5/shells-bridge. It uses native Vitest2.1.9, real private caches and a zero-network guard. Active source/test bytes match the qualified copy. No harness, model, database, dependency or deployment was changed.

Exact command-split TODO and the canonical remediation proposal preserve structured argv and provisioned systemd-environment work. Integer policy, ACP initialization/session/permission/cancellation and real pinned harness/image qualification remain open. AGT-05 is not closed by this loader fix.
