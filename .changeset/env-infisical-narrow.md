---
"@minion-stack/env": major
---

breaking: Infisical is now consulted only for `MINION_SECRETS_KEY` from the `minion-core` project. All other secrets — including per-subproject keys — now live in the gateway's encrypted local vault and are accessed via `runtime.secrets.get()` at gateway runtime, or via the `minion secrets` CLI offline. Subproject Infisical projects (`minion-hub`, `minion-paperclip`, etc.) are deprecated.

Migration: run `minion secrets import-static` on each gateway host to copy env-resident secrets into the vault, then remove them from Infisical. The resolver will emit a warning listing any keys still in `minion-core` outside the narrowed set.
