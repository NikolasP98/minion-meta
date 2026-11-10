# CRM analyst authentication delivery record

## Released source

Hub PR <https://github.com/NikolasP98/minion_hub/pull/650> merged at
2026-11-10T17:55:48Z as `df1ae0efcb2d6269b45d1385d2421ce75c1a05e3`.
Signed source `660ef0777844b56dc8df57eec3c169c5280126f4` and the real merge
share qualified tree `bad85c8d3638983b8f8d81ca4b381383cd2a64bc`.

The owner authorized implementation/release after EGM, then explicitly approved
"Yes, merge #650 with the owner override after CI passes" after GitHub's
separate-account review requirement was confirmed. All13PRchecks passed before
the administrative merge. Normal merge had been rejected solely by that review
rule. Protection settings were unchanged.

Configured 1Password signing recovered after owner authentication. Source and
meta evidence were signed through the unchanged configured signer. Four prior
failures are historical; no unsigned or alternate-signer fallback was used.
`signature-verification.json` distinguishes cryptographic verification against
the configured public key from GitHub's existing factory-author account badge.

## Qualification

Full five-stage EGM passed, with two consecutive clean feature and technical
rounds after document repairs. Independent Standards and Spec review passed the
initial implementation and final fixture/ledger cleanup. Exact final-tree local
checks passed: zero type errors/warnings, 9320 tests plus301 declared skips,
zero unhandled errors, architecture3/3, and production build with client-boundary
negative controls.

Final-head CI42865113752 passed all10jobs, including native PostgreSQL, seeded
QA and full browser matrix. Vercel preview and all13PRchecks passed. Raw immutable
logs and readable views are indexed in `log-provenance.json`.

First-run CI's unhandled fixture teardown import was repaired by waiting for
tracked dynamic imports before restoring globals/timers. The exception was not
suppressed. Earlier cross-checkout dependency/CSS collection trouble was resolved
with this checkout's private frozen dependency install. These are closed defects.

## Actual production proof

Vercel deployment `dpl_4WTSivYaTbvaJd4rbt1SspDG9BSw` is READY on the exact
merge commit. `hub.minion-ai.org` points to that deployment. At
2026-11-10T17:59:49Z, the assigned gateway/principal returned permissions200 with
CRM view, themes200 with nonempty analysis, and empty-body search400 before
embedding. The actual gateway executed `crm_conversation_themes({})` in the
affected user's exact personal-agent session: HTTP200, valid inner aggregate,
no inner error. This proves the tool path, without replaying an assistant/model
turn or writing business data. Exact emitted-header capture and semantic search
embedding are not claimed. See the two production JSON receipts.

The initial verifier query assumed a nonexistent personal-agent organization
column and failed read-only before any API request. The private verifier was
corrected to use the canonical gateway organization and exact agent assignment;
the four probes then passed. No product or database change was needed.

Temporary production credentials were removed. Private transcripts, identity
records and returned customer content stay outside git. No production role,
configuration, schema or gateway restart change was part of this repair.
Post-merge CI42869942809 also passed on the identical qualified tree. Both
pre-merge and post-merge CI are successful; see `postmerge-ci.json`.

## Companion evidence and scope

Meta PR <https://github.com/NikolasP98/minion-meta/pull/987> carries this evidence,
the shipped spec and completed main proposal. Its final receipts are signed
and its spec/proposal indexes are validated against current `dev`. GitHub
records the companion PR check and merge state.

The authentication repair is complete for unrestricted CRM roles. The dedicated
`proposals/2026-11-10-crm-conversation-restricted-role-support.md` stays open;
both product guards retain their `TODO(handoff)` pointers. Do not remove them
without separately qualified owner filtering and sensitive-content handling.
Preserve shared root repositories, earlier checkouts and unrelated PRs.
