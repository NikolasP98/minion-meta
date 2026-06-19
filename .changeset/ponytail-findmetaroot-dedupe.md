---
"@minion-stack/env": minor
"@minion-stack/cli": patch
---

Dedupe `findMetaRoot` into `@minion-stack/env` (it owns `minion.json` resolution) and re-export it from `@minion-stack/cli`. `env` now exports `findMetaRoot`; `cli` drops its byte-for-byte copy. The published `cli` requires this `env` version — keep them released together.
