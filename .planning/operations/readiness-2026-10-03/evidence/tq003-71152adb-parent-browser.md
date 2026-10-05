# TQ-003 independent browser proof

Hub71152adb; Browser Harness on the dedicated headless Chromium152 endpoint. Parent ran the committed production-dependency fixture in a native browser, using three separately built static artifacts. The HTTP server verified each emitted file hash, served only manifest files on loopback18904 and applied connect-src none. No authentication or customer data was used. Production mutation count remains zero.

- Normal: four checks passed.
- Editor-paste mutation: only editor paste and Markdown failed, with fixture-invariant unsafe paste. Other three passed.
- Ordinary-sanitizer mutation: only ordinary sanitizer failed, with fixture-invariant executable HTML. Other three passed.

The JSON receipts include actual browser identity, compile-time mutation identity, all four outcomes and observed resource URLs. A reused tab initially retained the prior editor artifact; explicit navigation to a unique URL loaded the intended sanitizer artifact and the recorded receipt verifies that identity. The optional screenshot after the normal checks stalled and was interrupted; its already persisted four-check JSON is the evidence. These are Browser Harness behavioral receipts, not the exact Playwright reporter/outer-runner receipt. Lockfile-browser normal and mutation runners plus hosted CI remain required before TQ-003 closure. Source review independently reproduced the installed Playwright error prefix and the committed contract now tests that exact serialization.

All fixture server processes were sent SIGINT after their respective run. The final old server retained a native Chromium TCP preconnect even after SIGTERM and tab closure. Its exact task-owned PID/runId was verified before SIGKILL (exit137). This is recorded as a shutdown defect, not a clean runner receipt; the worker added closeIdleConnections/closeAllConnections and a native no-HTTP preconnect regression in a followup packet. No production writes or reversal work were required.
