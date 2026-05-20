---
"@minion-stack/shared": minor
---

feat: secrets vault RPC method names + param/result types (static + dynamic).
Adds `secrets.list`, `secrets.set`, `secrets.clear`, `secrets.probe`, and the
`*_scoped` dynamic variants. Payloads never carry plaintext values.
