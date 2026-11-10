# Stage 9 — One fresh re-audit

All three reviewers completed in new native contexts, fork_turns=none, read-only. This is the one permitted Stage9 re-audit. No further review round was run; no two-clean-round convergence or production approval is claimed.

## Codebase reviewer /root/egm_codebase_reaudit

Original findings closed for tested candidate; original severities unchanged.

CR-1 / CD-1 — Blocker — Closed. tts.ts903–917 selects terminal classification above enabled/disabled branch. Real caller supplies final kind at dispatch-from-config.ts595–601, forwards result625. Actual chained tests265–304 cover off/always/tagged and disabled control/media exceptions.

CR-2 / CD-2 — Blocker — Closed. finance-query-tool.ts50–67 preserves property presence with Object.hasOwn; common reader58–71 rejects blank/nonstring required values. Adapter→real-route tests cover blanks, genuine absence/all-time, malformed/conflicting inputs; boundaries synthetic as labeled.

CR-3 / CD-3 — Major — Closed. Native preview tests254–282 add inactive event/resource, same-tenant unassigned resource, deleted contact and occupied slot. Shared helper181–205 snapshots every fixture table, checks SELECT/no mutations and effects, calls actual service. Source checks288–332,342–381,588–600 correspond.

No new concrete claim/code mismatch or material candidate-scope gap in focused re-audit. Native RLS, production concurrent exclusion/builds/providers/alternate paths/deployed verification remain adoption gates. No tests/builds/writes by reviewer. Byte reconstruction remained root's check.

## Readiness reviewer /root/egm_readiness_reaudit

Reviewed detailed range108–149, target SHA25616ff2e9d132933bff80bcef32b26fe51c49ce81ae9683cf31a5c89da99d8e5db. Implementation choices sufficiently specified, but acceptance coverage and reconstruction were pending. Original IR-1 Major/CD-1 Blocker/CD-2 Blocker resolved in inspected source; CD-3 Major resolved at local native-service evidence level. identity.ts now listed. No architectural choice remains for implementer invention in prototype scope.

### RR-1 — Major — Required finance acceptance coverage absent or weak

Affected: approaches.md140; finance-egm-chain.test.ts50–83; hub-route-candidate.test.ts192–258. Plan requires non-leap Feb29 rejection, valid leap day, one-sided ranges, wrong-type fields and exact resolved boundaries. Existing export lacked these; default test used expect.any(String) for bounds. Add exact UTC/null boundaries, field-specific failures before HTTP/every aggregate, fixed-time default window and disclosed mode. This is an evidence gap, not an established source defect.

Reconstruction/both config runs were pending at review; earlier counts do not qualify final bundle. RR-1 prevents completion claim until tested. All production gates remain. No writes/tests or production approval by reviewer.

## Style reviewer /root/egm_style_reaudit

IS-1 Nit resolved: identity.ts and task/account-name behavior now explicit at126. IS-2 Nit resolved: integer1..500 wording expanded at138. No new SR findings. Synthetic/local SQL/unsupported-path/production distinctions sufficiently clear. Read all three candidate reports, root follow-ups and original readiness report; interpreted nonexistent allcandidate.md as the three actual reports. No tests/writes/production conclusion.

## Root resolution after re-audit

RR-1 was accepted at Major. Added eight more finance-chain cases: four wrong-type fields, non-leap Feb29, leap day, two one-sided windows. Fixed-time default asserts exact2029-01-06T05:00Z through2030-01-07T05:00Z and rolling mode in America/Lima. Invalid fields assert field names and no calls to HTTP or any aggregate. Expanded chain suite17/17 passes; final bundle is reconstructed and rerun separately. No additional Goldfish review was run after these test-only additions. RR-1 is root-verified, not independently re-reviewed or silently downgraded. Final counts/hashes are in verification.json.
