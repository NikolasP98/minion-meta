---
"@minion-stack/shared": minor
---

Add the gateway wire-protocol version contract: `PROTOCOL_VERSION`,
`MIN_GATEWAY_PROTOCOL` and `checkGatewayCompat()`. Frontend-ahead-of-gateway
warns; gateway-ahead-of-frontend fails. Consumed by the gateway `/health`
payload, the connect handshake, and the CI version-compat gate.
