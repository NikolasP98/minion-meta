---
"@minion-stack/shared": minor
---

Add GatewayClient.beginRequest so callers can distinguish synchronous pre-send rejection from an attempted send with an unknown acknowledgement outcome. Existing request calls retain Promise-only rejection behavior.
