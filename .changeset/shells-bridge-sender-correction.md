---
"@minion-stack/shells-bridge": patch
---

Sender correction (11-10): `RunJournal.admitForDispatch()` decides fresh-vs-replay inside the committed BEGIN IMMEDIATE transaction; only stable ACP stop reasons (`end_turn`, `max_tokens`, `max_turn_requests`, `refusal`, `cancelled`) project to terminal outcomes, everything else stays unresolved; the local run/session owner is released only after terminal persistence commits.
