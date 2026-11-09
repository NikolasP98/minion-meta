# Scheduling and Team local validation

Commit: Hub `b5940d59`. Real scheduling GET handlers use the capability resolver
before context/domain access. Public booking and scheduler exceptions remain
explicit. POS slot discovery uses one capability snapshot and requires view plus
create or edit, with both POS and scheduling modules enabled.

- 67 authority/write compatibility tests, seven files: passed.
- Six mounted read-state tests: passed. The independent reviewer caught a retry
  loop that could continue old ranges after an organization change. The new
  two-range regression proves the remaining old range is never requested.
- Two actual TimeOff component tests: passed. Error/retry preserves the request;
  scope change aborts the old read, closes the request and rejects a late reply.
  Happy-dom emits the real dialog animation-end event after asserting its closing
  state; this is not proof of native CSS animation/focus behavior.
- Design CI against `origin/master`: no changed-file debt regression. Token lint
  reported zero violations. Diff whitespace check passed.

Full Hub typecheck is pending the concurrently implemented Meta job API migration.
Client POS form changes are in the calendar slice and require combined acceptance.
Runtime/browser acceptance, hosted CI, merge and deployment are distinct gates.
No production data was written.
