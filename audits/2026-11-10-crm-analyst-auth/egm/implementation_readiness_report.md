# EGM Stage 9 — Implementation readiness

Parent record of actual fresh-context review results. This is document/source
review, not executed implementation or runtime qualification. Technical target
starts at line 131; full-file line count is re-read before each round.

## Round 1 — changes required

Target 214-line candidate. Not clean before repair. All three reviewers completed
their assigned persona and implementation-readiness standard reads.

| ID / reviewer | Severity as returned | Finding | Resolution |
|---|---|---|---|
| IR-01 / `/root/crm_egm_readiness_r1` | Major | 157–164 leaves error JSON envelope unspecified. | PROPOSE FIX: exact `{code,error}` body and equality assertions added. |
| IR-02 / same | Nit | 153–155 references an incident comment absent in the new clean baseline. | PROPOSE FIX: insert at existing trusted-principal allowlist section; remove replacement instruction. |
| IR-03 / same | Nit | Matrix attributes anonymous CRM 401 to the hook. | PROPOSE FIX: document anonymous resolver → handler → real principal 401 and test that composition. |
| CRM-TECHSTYLE-R1-001 / `/root/crm_egm_technical_style_r1` | Major | Same unspecified response envelope. | PROPOSE FIX: same exact body, preserves existing `error` string and adds stable code. |
| details-r1-1 / `/root/crm_egm_details_r1` | Blocker | Same incorrect 401 boundary/test expectation. | PROPOSE FIX: correct AS-IS/matrix and execute real handler/principal anonymous denial after resolver. |
| details-r1-2 / same | Blocker under source-contradiction rule | Same nonexistent comment edit anchor. | PROPOSE FIX: name insertion point in clean actual baseline. |

All listed repairs were applied to the design before round 2. No severities were
changed, no findings contested, no accepted risks substituted for required repairs.
The source correction is not a change to the desired runtime permissions.
Round-2 target is 229 lines, SHA-256
`36958b941227b07e757534e9fe5c8096873be60a923fdc3a61dc74d3cdc0cd6a`.

Readiness and details each read full spec, Hub AGENTS, resolver/principal/handlers,
canonical permission/capability source, relevant tests, hook auth dispatch, Vitest
aliases, safe setup/private-env stub and package scripts. Details verified mock-db
reuse, required getDb stub, explicit false auth/fallback environment and actual
search gate ordering. Style read persona/standard, full target/proposal, Hub
AGENTS and both handlers. No tests, file/git writes, network, private environment,
history/memory or earlier report reads by the reviewers.

## Round 2

All requested reviewers completed against the unchanged 229-line candidate:

| Reviewer | Persona | Completed | Findings |
|---|---|---|---|
| `/root/crm_egm_readiness_r2` | implementation_readiness | Yes | None |
| `/root/crm_egm_details_r2` | codebase_details | Yes | None |
| `/root/crm_egm_technical_style_r2` | style | Yes | None |

Clean before repair: yes. No target edit needed. Readiness/details read their
personas and standard, complete spec, Hub AGENTS, actual resolver/principal/both
handlers, permission and capability source, existing fixture/tests, hook
dispatch, Vitest aliases/setup/env and declared commands. Details also read the
proposal, DB mock, retrieval/embedding and entitlement entrypoints. Style read
its persona/standard, full spec/proposal, Hub AGENTS and both handlers. Each
returned no unresolved implementation choice. No earlier report, private env,
history/memory/network/write/test/git use; no runtime proof claimed.

## Round 3

All three separate fresh-context reviewers completed on the unchanged 229-line
candidate with the same SHA-256 as round 2:

| Reviewer | Persona | Completed | Findings |
|---|---|---|---|
| `/root/crm_egm_readiness_r3` | implementation_readiness | Yes | None |
| `/root/crm_egm_details_r3` | codebase_details | Yes | None |
| `/root/crm_egm_technical_style_r3` | style | Yes | None |

Clean before repair: yes. Two consecutive clean rounds: technical review
converged. No target edit needed. Each read its persona/standard, full 229-line
spec, Hub AGENTS and relevant actual sources. Readiness/details additionally
read full resolver/principal/handlers and test config/setup/stub/DB mock, relevant
capability and permission source, existing identity/principal tests, hook
dispatch, service boundaries and scripts. Style read full proposal and both
handlers. Required reads completed, no omitted reviewer. No prior reports,
history/memory/private environment/network/source edits/git/tests; no runtime
proof. Their source-based verdict does not substitute for executing the tests.
