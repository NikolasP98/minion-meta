# Money implementation proof — work in progress

Root server/core changes remain uncommitted pending independent implementation review. Client work has unresolved parent review findings. HS-028 and HS-017 remain implementing.

- `money-server-broad-first.log`: 25 files, 514 passing tests, including existing emission regression suites. This run preceded the source-ticket grant currency adjustment.
- `money-jobs-all.json`: actual disposable PostgreSQL jobs lane, eight files and 187 passing tests. The exact named behavior validator reports zero skips. This includes the new eight-case money service fixture and existing marketplace, Meta jobs and vector lifecycle cases.
- `money-native-currency-final.json`: eight native money cases rerun after validating plan-paid-ticket currency and preventing cancellation of unsupported-currency historical plans. Real RLS transactions, production plan/ledger/grant table DDL, and task-scoped schemas. Cleanup drops and verifies absence of every fixture schema.
- `money-final-affected.log`: 35 passing shared ticket/package tests after the latest paid-line projection change.

These runs overlap; their counts must not be summed. Their sources are an active isolated branch, not a deployed release. The current decimal policy is the approved money spec; no exchange conversion or production historical-value rewrite is included. HS-009 mixed supported currencies, HS-013/014 plan concurrency/status, HS-016 grant residual persistence and other money findings remain separate required work.

Production writes in this program remain zero.
