---
"@minion-stack/shared": patch
---

Clean release emission: `build`/`prepack` now run `scripts/build.mjs` (production-only `tsconfig.build.json`, no source/declaration maps, no test outputs, link-safe dist cleanup, real compiler exit propagation) and `prepublishOnly` only typechecks. Adds the package README. Archive drops from 125 to 44 members with no local build paths.
