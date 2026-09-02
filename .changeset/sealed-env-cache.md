---
'@minion-stack/env': minor
---

Replace the legacy plaintext Infisical cache with a machine-sealed cross-process cache. Disk mode is
now the default; `memory` keeps values in the process only, and `off` disables caching. The first run
removes a recognized legacy plaintext cache instead of migrating it. If that file may have been
backed up or synced, rotate `MINION_SECRETS_KEY`.
