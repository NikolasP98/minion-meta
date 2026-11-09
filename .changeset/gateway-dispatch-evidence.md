---
"@minion-stack/shared": patch
---

Expose typed gateway errors with dispatch evidence while preserving their existing messages and server error fields. Local serialization failures are rejected before a pending request is registered. A send failure remains uncertain because an injected transport may throw after accepting the frame; it no longer permits replaying a non-idempotent write.
