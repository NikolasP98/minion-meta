# Review findings ledger — spec 143

Owner, 2026-11-21: "all those findings should be addressed before we continue". Every finding from both EGM rounds is listed with the decision that answers it. The last column is filled only after the code and a test for it exist; the PR does not merge with an empty cell.

## Round 2 — design critic on pass 2

| # | Finding | Decision | Code + test |
|---|---|---|---|
| 1 (Blocker) | Framework origin check 403s the form-encoded token endpoint | P1 | |
| 2 | Renewal retry / parallel sessions end the connection | P2 | |
| 3 | Code spend rolls back with a failed verification | P3, P18 | |
| 4 | Cookie identity leaks into capability resolution | P4 | |
| 5 | App name is self-asserted | P5 | |
| 6 | Address limit sits in front of the key path | P6 | |
| 7 | Connection ended on a failed lookup | P7 | |
| 8 | Renewal not bound to the client before it is spent | P3 | |
| 9 | Credential and client rows grow without bound | P9 | |
| 10 | Sandbox module availability not applied | P10 | |
| 11 | Code replay does not end the connection | P11 | |
| 12 | No `iss` in the authorization response | P12 | |
| 13 | Enhanced form cannot follow the outbound redirect | P5 | |
| 14 | Loose redirect matching | P13 | |
| 15 | 403 for "no longer a member" reads as step-up | P8 | |
| 16 | `resource` and registration tolerance | P14 | |
| 17 | Issuer follows the request origin | P12 | |
| 18 | Metadata path collision with the gateway issuer | P17 | |
| 19 | No absolute cap on a connection's life | P15 | |
| 20 | `tools/list` filtering by kind only | P16 | |
| 21 | Unbounded `state`; token responses cacheable | P9, token endpoint `no-store` | |

## Round 1 — pass 1 (Supabase as authorization server)

| Source | Finding | Answer in pass 2/3 | Code + test |
|---|---|---|---|
| Design 1 | Token is a full hub session and data-API credential | Hub issues its own credential valid only on `/api/mcp` (INV-5, D1) | |
| Design 2 | Ending a connection does not end the grant | D13: one row ends every credential | |
| Design 3 | Re-approval moves a live connection to another org | Each approval is a new connection (INV-3) | |
| Design 4 | Closed registration was only a dashboard toggle | FR-003, D11, P13: loopback-only, enforced in code | |
| Design 5 | Approve action under-specified; row written before approval | D10: everything re-validated from the URL; code created at approve, connection only at exchange | |
| Design 6 | Core assumptions untested until production | No provider behaviour is assumed any more; local end-to-end in step 11 | |
| Design 7 | Alternatives table incomplete | Rewritten | n/a |
| Design 8 | Pre-auth cost of garbage tokens | D4, P6: per-address limit before any lookup; no remote verification | |
| Design 9 / Codebase 5 | Google sign-in drops the return path | Plan step 8 | |
| Design 10 / Readiness 9 | Which permission `sandbox_query` needs | D8 | |
| Design 11 | Removed then re-added member revives a connection | D4, P7: ended when membership is found missing | |
| Design 12 | Consent page framing; touch throttle | D10, P5, D4 | |
| Readiness 1 | Refusal contract (401 vs 403, body shape) | D7, P8 | |
| Readiness 2 | Revocation loop | D13 | |
| Readiness 3 | Consent ordering | D2, D10 | |
| Readiness 4 | Connection identity contradiction | One connection per approval | |
| Readiness 5 / Codebase 6 | Data model and access model | Data model section | |
| Readiness 6 | Who may list and end; API shape | D13, Files table, FR-011 | |
| Readiness 7 / Codebase 8, 10 | Exact locals; missing profile | D5, D4 | |
| Readiness 8 | Platform admin who is not a member | D6 | |
| Readiness 10 / Codebase 4, 14 | Tool plumbing, authorship, list filtering | D8, D9, P16 | |
| Readiness 11 / Codebase 3 | Key tests and the 401 body | D7 last row, P6, SC-005 | |
| Readiness 12–13 | Tests per scenario; task detail | Detailed Implementation Plan steps 2–9, P18 | |
| Readiness 14 | Rollout checks and rollback | Steps 11–12 | |
| Readiness 15 / Codebase 12 | Origin source; hooks gates | P12, P17, Files table | |
| Readiness 16 | Consent route outside the app gate; no organization | A10, US1.7, Files table | |
| Codebase 1, 2 | Claims unreachable; platform vs org role | A6, D5, D8 (`resolveCapabilities`) | |
| Codebase 9 | Role cache; cookie overrides | A6, P4, Assumptions | |
| Codebase 11 | Database failure must be 500 | D4, P7 | |
| Codebase 13 | Settings API must not be in the write-prefix list | Files table | |
| Codebase 15 | Reuse (`listDatasets`, memberships, touch throttle, caller shape) | D8, D10, D4, Files table | |
| Codebase 16 | Library rows for a signed-in caller | D9 | |
| Codebase 17 | Inventory entries | Files table | |
| Codebase 18 | Unlimited pre-connection checks | D4, P6 | |
