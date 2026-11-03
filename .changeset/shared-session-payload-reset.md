---
"@minion-stack/shared": patch
---

Reset the previous session's payload limit before replacing a gateway connection
so the new handshake can negotiate its own limit.
