---
"@minion-stack/cli": patch
---

`minion doctor`: extend link-drift scanning to include `@minion-stack/shared`, `@minion-stack/db`, `@minion-stack/auth` (previously only covered `tsconfig`, `lint-config`, `env`, `cli`). Add per-subproject git status column. Handle missing (not-cloned) subprojects gracefully instead of surfacing auth-style errors.
