# CRM analyst authentication release checkpoint

Signing recovered after the owner authenticated on the retry. Signed final source
`660ef0777844b56dc8df57eec3c169c5280126f4` is pushed; its tree equals qualified
`bad85c8d3638983b8f8d81ca4b381383cd2a64bc`. Fresh final-head CI is pending. The
pre-recovery details below remain historical provenance; no signer was bypassed.

The owner requested the current fix through production after EGM passed, then
said: "I'm going to bed, lmk when theyre live." Continue the scoped release
after its checks pass. Do not repeat the implementation/release scope question.
The current external blocker is the configured 1Password signer, not missing
task authorization. Four normal signing attempts failed with
`1Password: failed to fill whole buffer`; signing remains enabled and unchanged.
An async request asks the owner to unlock/approve 1Password. No unsigned or
alternate-signer fallback was used. No normal/administrative merge was attempted.

## Exact ownership and source

- Hub: `/home/nikolas/.cache/codex-work/hub-crm-analyst-auth-20261110`, branch
  `fix/crm-analyst-gateway-authentication`, PR
  <https://github.com/NikolasP98/minion_hub/pull/650>, draft.
- Published signed Hub head: `b523d281b80e35391726c9d115ccebf6c5e668b4`.
  Its tree is `e0795114885d45d577cd5ccfdbcc680e22d64072`.
- Final staged tree: `bad85c8d3638983b8f8d81ca4b381383cd2a64bc`.
  Three staged files add the test-only dynamic-import cleanup and move both
  restricted-role handoff pointers to the dedicated open proposal. All runtime
  authentication/permission logic is already in the published signed head.
- The final working source equals the staged tree. `checkpoint.json` records
  every scoped file hash. `/tmp/crm-auth-final-staged.patch` is a private backup;
  the staged files themselves remain intact. Do not reset, stash or replace them.
- Meta: `/home/nikolas/.cache/codex-work/meta-crm-analyst-auth-20261110`, same
  feature branch, last signed commit `8f02893c7` (initial approved EGM design).
  Later qualification, lifecycle/headings and follow-up ledger files are local
  pending a signed commit. No meta PR has been opened for this fix yet.
- Earlier role-simulation checkouts and shared root repositories are unrelated
  working trees; preserve their work. Hub base/PR target is `master`; meta target
  is `dev`, verified through the canonical fleet registry.

## Qualification and limits

EGM full five-stage flow completed with actual fresh-context agents. Feature
critique rounds 1–2 and technical rounds 2–3 were consecutive clean rounds after
document repairs. Reports preserve exact reviewed paths/hashes and limitations.
Independent Standards and Spec reviews passed both the initial implementation
and the final actual three-file test/ledger delta.

Local runtime candidate `b523d281`: type check zero errors/warnings; 9320 tests
passed,301 declared skips; architecture3/3; no unhandled-error exit. Final staged
fixture/CRM lane49/49 passed with no unhandled errors. Final staged production
build passed, Vercel adapter completed, client boundary2030modules/899artifacts/
zero violations and both mutation canaries rejected. Optional/dynamic dependency
tracing and Rolldown advisory output is preserved in the raw build receipt.
Final exact staged-tree qualification completed with exit0: zero check errors/
warnings; 9320 tests passed,301 declared skips,zero unhandled errors; architecture
3/3. Readable receipt is `final-exact-tree-qualification.txt`; exact original bytes
are preserved in `final-exact-tree-qualification.raw.log.gz`. Source stayed frozen at
`bad85c8d3638983b8f8d81ca4b381383cd2a64bc`. No local check needs repeating unless
the source/required environment changes or a new concrete failure justifies it.

All text log views are normalized for readability and Git whitespace checks;
immutable compressed originals and both raw/view SHA-256 values are cataloged in
`log-provenance.json`. Checkpoint log hashes refer to original bytes, not views.

First CI run `42779301202` on published `b523d281` finished with all9320
assertions passing,301 declared skips, but one unhandled EnvironmentTeardownError
from `gateway.session.test.ts` after the config lazy import outlived its fixture.
All nine other CI jobs passed, including check/build, native PostgreSQL, QA
stack, browser security and critical journeys. The staged cleanup fixes that
exact fixture lifetime: disconnect → await `vi.dynamicImportSettled()` while
mocks/fake timers exist → restore globals/timers. It suppresses no exception.
A new signed source commit and fresh final-head CI are still required.

The first local broad run used a cross-checkout node_modules symlink and failed
frontend CSS collection. It was interrupted, not counted as a complete verdict.
Only this clone's symlink was removed; a private frozen install fixed the issue,
and the narrowed mounted51-case suite plus the full9320-case suite then passed.
Dependencies and lock are unchanged. `.env` has only blank analytics build
variables; no diagnostic production environment was loaded into tests/builds.

## Resume steps

1. Verify current hashes/status against `checkpoint.json`. Obtain a functioning
   configured 1Password signing session; do not disable `commit.gpgsign` or
   replace `/opt/1Password/op-ssh-sign` to get past the failure.
2. Commit the three staged files with
   `test(gateway): settle session imports before tearing down fixtures`, then
   push the existing feature branch. Confirm its tree equals the qualified
   staged tree and record the new full source hash.
3. Update PR650 validation details, wait for fresh exact-source CI with zero
   unhandled errors, and finish the meta evidence commit/PR against `dev`.
   Use `gh-axi` for GitHub work. Do not treat the earlier failed CI as green.
4. Complete the owner-authorized merge/deployment flow after qualification.
   Respect actual protection requirements; the older role-simulation release's
   admin-override approval is not blanket approval for unrelated future work.
5. Verify merged tree identity and the Vercel production alias/deployment source.
   Then make bounded assigned-gateway/principal read-only probes: tool permissions
   200, CRM themes200 with expected aggregate shape, empty-body search400 after
   authentication/authorization without embeddings. Also invoke the actual gateway
   tool as described in `gateway-runtime-verification-plan.md`; a manually supplied
   header proves Hub admission, not the running gateway's transport. Do not replay
   a model turn or accept a successful outer envelope containing an inner error.
6. Record actual merge/deploy/runtime evidence and final spec lifecycle; merge
   the meta evidence through its approved flow. The dedicated restricted-role
   support proposal stays draft/open while the authentication repair can close.
   Notify the owner here only once the production result is verified.

No merge, production deployment, role expansion, token rotation, migration,
message send or model replay was performed for this authentication repair.
The earlier separately authorized FACES shared-knowledge permission remains a
different completed configuration action. Private original conversation and
principal receipts remain outside git; the temporary production env was removed.
