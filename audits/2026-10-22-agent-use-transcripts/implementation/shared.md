# Supporting shared-client change

Slice2's real acceptance contract requires a synchronous pre-send boundary. Installed Hub `GatewayClient.request()` is async, so a closed socket rejects only a Promise; `conn.connected` plus client presence cannot prove a frame was attempted.

The isolated meta feature adds `GatewayClient.beginRequest()` using the existing request implementation. Closed socket, invalid serialization and negotiated payload limit throw before dispatch. Once socket.send is attempted, failure remains an asynchronously rejected Promise with unknown effect; never infer safe replay. Existing `request()` delegates while retaining Promise-only rejection behavior.

Red before implementation:3 expected failures,87 existing client tests passed. Green:91 client tests passed including payload limit. All shared tests:392 passed; typecheck/build passed. Lint completed with two pre-existing warnings outside changed code. The package archive identity is in shared-artifact.json. An additive minor Changeset is prepared; no package version was changed or published.

Hub originally already consumed a checked-in `file:deps` readiness archive. Follow that existing convention: the implementation adopts the exact tested archive as `deps/minion-stack-shared-0.9.0-agent-harness.e6e69bb92fd1.tgz`, updates the repo-relative package dependency and Bun lock, then verifies a frozen install. No package version mutation or npm publish is required. The capability guard remains a defense for unsupported clients, not an excuse to leave normal sends unwired. Product merge/deployment remains separate from local implementation qualification.
