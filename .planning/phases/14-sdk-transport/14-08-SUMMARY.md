---
phase: 14-sdk-transport
plan: "08"
status: source_verified_pending_independent_review
requirements: ["SDK-01", "SDK-02"]
---

# 14-08 authenticated-session foundation

Implemented the admitted optional `onAuthenticated(hello, { generation })` callback, once per successful current connection attempt, with explicit per-attempt socket/resolver ownership across asynchronous challenge and response work. Internal reconnect publishes a new real generation. Duplicate challenge/response delivery cannot dispatch a second connect request or notify twice. Explicit close and replacement invalidate pending handshake work synchronously and settle its timers/promises.

All three pinned reference error hooks are reconciled. The new observer settles the connect promise before notification and contains synchronous throws or returned rejection with the fixed diagnostic `[GatewayClient] onAuthenticated observer failed`. It does not report hello or exception contents or invoke an unrelated error hook. Observer close/reconnect and a throwing diagnostic sink are covered.

Source is frozen for independent review. This is not Hub/Site installed adoption or SDK-01/02 closure.

## Authority and execution identity

Admitted PLAN SHA-256: `2b3975efdc3e35481593415ba4cf69f833e801dec592c08df297868cda26b490`. That file was not changed by this executor. The initial draft hash was `0228fe84250db59d3bc0c0fdcd557ca9996a354066587e5c88d07a226c31486a`; execution used the admitted plan.

The first planned command selected the correct file but installed Vitest 2.1.9 rejected the worker bounds before discovery: `options.minThreads and options.maxThreads must not conflict`. Zero tests ran, and that invocation is not a behavioral red result. Root approved adding `--minWorkers=1` alongside `--maxWorkers=1`, with no config/source boundary expansion. Root will synchronize the plan command at acceptance.

Effective test command from meta root:

```sh
pnpm --filter @minion-stack/shared exec vitest run src/gateway/client.test.ts --maxWorkers=1 --minWorkers=1
pnpm --filter @minion-stack/shared typecheck
pnpm --filter @minion-stack/shared exec oxlint src/gateway/client.ts src/gateway/client.test.ts
```

For exact command identity, SHA-256 of compact JSON argv arrays (UTF-8, no trailing newline): original test argv `6c18394f8e4afe07b22e3555090af29dcf24c0c7851fda94a396e9b57a945499`; effective argv `0aa5cce2052f19b2bc887f0d5539395c2ce3c6f287c66412f8afc194bed9277e`. The only argv change is the final `--minWorkers=1` element.

Commands used allowlisted inherited PATH/HOME/LANG, installed pnpm/runners and a 60-second process watchdog. Only the focused client test file was selected. No application env, network server, browser, provider, broad suite, package build, install, commit or outside-owner source edit occurred.

## Red and green evidence

| Candidate stage | Result |
|---|---|
| Planned runner command | Runner configuration error; zero tests, retained separately |
| Original source + preserved/reference tests + first session fixtures | 37 failed / 16 passed out of 53; 11.52 seconds |
| Exact pinned hook implementation + same session fixtures | 24 failed / 29 passed out of 53; 11.37 seconds. All existing/reference cases pass; every new session case still fails |
| Initial session implementation | 53/53 passed; 1.37 seconds |
| Expanded failure/timeout/reentrancy coverage and final timeout-preservation correction | 65/65 passed; final 1.39 seconds, one file, zero skips |
| Final package `tsc --noEmit` | Exit 0 |
| Final two-file oxlint | Zero errors, zero warnings; 33 ms |
| Scoped `git diff --check` | Passed |

Baseline failures include absent successful-session notifications, obsolete connect promises not settled, stale response failure closing a successor, and explicit close waiting for native delivery before settling the pending handshake. Duplicate-challenge assertions already pass where the original boolean guard was sufficient; the new tests preserve that behavior while checking it against per-attempt ownership and exactly one notification.

An intermediate typecheck found three test socket-array lookups could return undefined after replacing reference `any` annotations. Explicit fixture exhaustion guards corrected these without weakening assertions or introducing `any`. The final package check passes. Self-review also retained the original timeout close arguments (`close()`), distinct from challenge/connect failure (`close(4008, 'connect failed')`); both branches now have assertions.

The final 65 cases comprise 29 preserved/reference tests plus 36 session cases using Node-style and browser-style synthetic delivery. The retained reference default socket-error test prints a synthetic `Error: boom`; this is expected reporter evidence, not an unhandled failure. No unhandled error was reported in the final run.

## Frozen source and reference identities

| File / identity | SHA-256 |
|---|---|
| Original `packages/shared/src/gateway/client.ts` | `9a4a63b8ad9ca3f7ec3c9832c7b597a274e56cebea0e21c47f54e3223aa10532` |
| Original `packages/shared/src/gateway/client.test.ts` | `dc363783b7589b5ef477a741c983544e491bbb7af6d52f77cf12789091734fc5` |
| Pinned reference client at `59c4b56c192a730dbd63bb8e51dd8305eb2ad424` | `b81c7ff63c371909fccdd7c08525f4b84573f03baca71cfccfbc16d54da32dc3` |
| Pinned reference tests | `d735b70e1045265b8ba1e61e62b4c9b7eea0f8886423a4d7af8b81fd33b8b9ce` |
| Final owned client source | `c0c492d4e03f0a26ae9afd5b9993bd66c82451f7289670cfed411344ac677666` |
| Final owned client tests | `de1ddab9590b7e793252b0a61f23d6a165aee1aa1424d753ffd7b6aed77a31ba` |

Exact reference patch extraction uses the two `git show --format= --no-ext-diff --binary ... -- client.ts client.test.ts` commands in the admitted plan. Event-hook commit `399fc59c78f4aea2176737f32d654a3c6914498b`: 13,751 bytes, digest `287f0c0d899a70ed27a9eeb125e2d008f597532a657425f5a22128a08e993d5f`. Lifecycle-hook commit `a8e6c6d8771025a6549cd079be2ebf0a74c94159`: 21,900 bytes, digest `4dd2888a918b27a27b13e21a8f2c14d8dcf4453437b9c7332dbf47d24736c575`.

Original two-file bytes are preserved at `/tmp/minion-14-08/baseline-client.ts` and `baseline-client.test.ts`. Only these two product files plus this summary were written in the checkout.

## Local logs

All logs are under `/tmp/minion-14-08/`. The `accepted-*` filename labels the executor's final candidate run, not independent/root acceptance.

| Log | SHA-256 |
|---|---|
| `reference-red.log` (runner failure, no tests) | `2aa976a9a100bb42cd1a9dfa8bba4fc0b7387dd05a294ff1f423827018211572` |
| `baseline-red.log` | `cdd537c44a8c5396b7ed3ab55664d1cb4a68ddda4d9c0d446932586c91a57c27` |
| `hooks-green-session-red.log` | `3f544c818520be10e3f82982adb3f49a6a473f8404c07768a872e3b570117016` |
| `accepted-tests.log` | `439be672264ba9ae93ef903be16583b76fdd00c1a6f5b52adcd022f6bb7a6eb5` |
| `accepted-typecheck.log` | `4cca301852354d97fd6e066bd945ac205a433da05e43e0b0af0277cc9801bd02` |
| `accepted-lint.log` | `9846d0b15e86c4d593b10b70ef2942e582bdb9b06d67697fcd6b99ba28b735c6` |

## Standards review

Two-file ownership maintained. Existing reference reporting logic and tests were reconciled instead of replacing the transport. The socket-attempt record is internal; generation comes from production connect(), not a fixture-only model or timestamp. No new required argument, export, protocol frame/version, dependency or general event framework. Existing traceparent/request timeout/backoff code and no automatic request replay behavior remain; default timeout and connect-failure close behavior are distinguished. New test factory annotations avoid `any`, and existing public transport constructor typing was not broadened.

The tests exercise actual GatewayClient instances with injected delivery, including pending challenge, response-continuation races, supersession, native-close delay, duplicate challenge/response, observer failure/reentrancy, constructor/send failure, timeout cleanup, one reconnect timer and no mutation replay. Browser-style and Node-style here describe event adapters; neither is an actual browser or Node WebSocket network test.

## Spec review and remaining gates

The selected optional callback is emitted once for a successful current socket attempt after promise settlement bookkeeping is cleared. Old async challenge/hello/error work cannot send, settle or close the successor. Explicit close invalidates immediately while retaining current native onClose delivery. Reentrant close/connect and reconnect-scheduling callbacks cannot leave a competing old reconnect timer. Observer failures are contained and report only the approved static diagnostic. All three reference hooks retain default/reporting/containment behavior and socket errors remain reporting-only.

Source typecheck proves the callback's source declaration and Node options inheritance compile. No emitted declaration, archive or installed consumer has been built or replaced. Hub and Site inspected installed0.9.0 client digest remains `082e7c38fa050ceffbcb6e500b8ed2123a1856526c9cbdbad292d165280227bc`; Paperclip inspected installed0.3.0 client digest remains `624a59c8bfaa2370b27a9af5921da621838be127e935d91d411d1b7495ee794d`. These are the decision packet's preserved identities, not newly emitted artifacts. 14-09/14-10 remain draft adoption plans; 14-02/12-03 declaration/archive/install gates are mandatory before application adoption claims.

The notification carries unknown hello payload exactly as selected. Envelope/HelloOk runtime validation and authority remain 14-01. Generic non-handshake request serialization/send failure still needs its own pending-map cleanup; this change cleans failed handshakes and does not claim every generic request path is repaired. Both sites now carry TODO(handoff) comments pointing to the root remediation proposal, and root was sent the corresponding ledger wording. Existing consumer reporting/adoption and Hub/Site session publication TODOs point to the same proposal and named child plans. Root owns proposal integration.

No Node server fixture, broader shared suite, browser, gateway receiver, full application check, build or installation was run. Independent review is pending; SDK-01/02 and the wider program remain open.
