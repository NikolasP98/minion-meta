---
phase: 13-ui-qualification
plan: "09"
requirements: ["UI-03", "UI-07", "SEC-09"]
requirements-completed: []
status: locally-qualified-provider-revocation-open
---

# Provider-aware Site logout

The six-file repair is frozen under `/tmp/minion-13-08-dn7zbntf/logout-freeze/`; receipt.json and files/ preserve exact source. Root reviewed the endpoint and AppBar behavior. The source candidate remains private and undeployed.

POST /auth/logout enforces exact request Origin and selects the provider from actual server configuration. Supabase uses the current request-scoped session with local sign-out scope. Better Auth receives original request headers and returns its complete cookie-bearing Response. AppBar uses the native shared touch button, prevents duplicate attempts, redirects only after reported success, and presents localized accessible failure/retry text without exposing raw provider errors.

All **13 endpoint and 8 AppBar native cases pass** within the combined 40-case Site run. Actual AppBar browser behavior passes at mobile/desktop widths in all three engines, six cases within the combined 18-case browser run. Those original browser layouts used fallback fonts; 13-12 repeats them with actual Barlow faces. No real provider/session mutation occurred.

SEC-09 remains open: installed Better Auth 1.4.19 catches a durable deleteSession failure and can return success while clearing cookies. Synthetic endpoint response propagation cannot prove durable server-side revocation. The endpoint carries an exact TODO(handoff), and `proposals/2026-09-08-platform-qc-remediation.md` records the required disposable real-session storage-failure gate. Do not replace the auth library with a parallel homegrown session engine or claim all sessions were invalidated.

Later Chat ownership includes the shared EN/ES message files; prior logout messages must remain intact. No global requirement, real-device or deployment certification follows from these local tests.
