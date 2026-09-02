---
'@minion-stack/cli': patch
---

`minion doctor`'s `(meta)` row now reports the active `@minion-stack/env` cache mode, whether a
legacy plaintext cache was purged, whether the config directory permissions had to be tightened, and
whether any quarantined cache objects are waiting for operator review. Warnings column only — the
command's exit code is unchanged.
