# Assistant capability repair qualification

Updated 2026-10-20. This records local and exact-commit CI evidence; it is not
a production adoption receipt. New source changes have not been merged or deployed.

## Confirmed failure

The incident's catalog and permission requests returned
`ASSISTANT_GATEWAY_ASSIGNMENT_REQUIRED`. The persisted personal-agent row was
active with a NULL gateway assignment. The FACES runtime callback also used a
server hint resolving to another organization. Changing the model could not
restore this missing authority.

Discovery previously represented that failed remote inventory as an ordinary
empty result. Six discovery calls exhausted the progress allowance; the model
then returned textual DSML, which escaped the output boundary. These are
separate provisioning, discovery and delivery defects.

## Implemented boundaries

- Hosted provisioning selects the authenticated organization's canonical leased
  gateway and verifies the exact persisted runtime agent ID. It conditionally
  commits assignment while rechecking membership, lease, credentials and the
  row snapshot. It preserves legacy identity and customization and rejects
  conflicting assignments. A client success claim is not sufficient evidence.
- Discovery carries fixed, sanitized, run-scoped remote-inventory status. It
  preserves authorized local tools and emits a terminal unavailable-capability
  result when loading a missing capability after a permanent failure.
- Shared output filtering contains DSML across partial, block, final, reasoning
  and formatted-error output, including split markers. Complete quoted examples
  and native tool calls retain their semantics. Recovery issuance is shared
  across attempts, with one honest fallback if recovery is empty or malformed.
- Tool summaries retain declared browser/canvas action labels. Existing mutation
  outcome comparison remains strict under its current fingerprint contract.

## Independent review

Behavior and authority spec reviews preceded implementation. Independent source
review found and drove corrections to reasoning output, invalid inline-code
exemptions, personality preservation on bind-only retries, late failure callback
handling, and postgres-js lease result handling. Final source reviews approved
the discovery, output and assignment boundaries. Root review retained the
production approval boundary and required the actual hosted provisioning proof.

## Real loopback acceptance

Receipt: [loopback-proof-20261020.json](loopback-proof-20261020.json).
Build identity and checksums: [loopback-provenance-20261020.json](loopback-provenance-20261020.json).
The final proof used clean Hub `afc242e` and Gateway `43f3fa9`, built by CI
run 39517416592. Artifact 12308576753 matched its published SHA256 before
installation; all 2,599 installed files were verified against the manifest.

The reusable Hub `qa:personal-agent-catalog` command creates a random owned
organization, authenticated GoTrue user, gateway and active NULL-assigned legacy
agent. A real compiled Gateway answers roster requests. The authenticated empty
`/api/personal-agent/create` request and legacy completion route exercise the
production verification service; the test does not prefill the assignment.

Before binding, manifest access returns 403. After verified binding, the same
identity returns 200 and exposes `catalog_query`. A second, older candidate
receives zero connections because the persisted current lease is honored.
Wrong gateway and organization requests remain denied. Runtime configuration
and existing personality remain unchanged.

The Gateway helper builds ordinary personal-agent tools through factory and
permission policy, discovers the catalog tool, and executes its real typed
endpoint. Synthetic services rank at PEN250, PEN250 and PEN75 with catalog
source links; one missing price is reported, and product/inactive rows are
excluded. This proof uses selection mode off to avoid remote embeddings: it
proves admission, discovery and execution, not model shortlist quality.

No model or production request is made. The receipt confirms zero remaining
owned rows, the owned gateway stopped, and the hash of all pre-existing
personal-agent assignments unchanged.

## Qualification still pending

The source candidates are reviewable in:

- Gateway [PR338](https://github.com/NikolasP98/minion-ai/pull/338), head
  `43f3fa9bbe9d3db1466120314804e715e0d4e700` (runtime source commit
  `37411570cf4c8fb58ce13fad9ba24f4172b40193`; the follow-up only adds the changelog reference).
- Hub [PR574](https://github.com/NikolasP98/minion_hub/pull/574), head
  `afc242e898fc6b58a2d561deb04a8a985f528327`, cleanly rebased onto master `d42a14a`.

Gateway `pnpm check` passed with zero errors and 57 existing lint warnings; the
full build, including plugin-SDK declarations, passed. The local full test
attempt ended with signal143 before the main unit/extension reports; its
completed process-isolated group passed 17 files and 223 tests. Seven CI-fixture
failures were caused by the host mise Node shim rejecting isolated HOME. Both
files passed all 48 tests when replayed with `/usr/bin` first in PATH, with no
source or assertion change. The initial local attempt is incomplete evidence.

Gateway PR CI uses smoke tests behind the historical shard names. Exact run
[39516579150](https://github.com/NikolasP98/minion-ai/actions/runs/39516579150)
covered 20 files and 177 tests in its Linux smoke jobs; it is not full-suite
proof. The full workflow was explicitly dispatched at the same candidate in
[39517416592](https://github.com/NikolasP98/minion-ai/actions/runs/39517416592).
Full test results and complete configuration coverage remain pending. The
dispatch security scan failed closed because this feature-branch event supplied
no trusted BASE_SHA for commit-delta scanning. The normal PR security scan
passed its actual PR diff. No security check was bypassed; test coverage and
the overall dispatch conclusion must be reported separately.

Hub's pre-integration full run completed 890 files: 883 passed, 2 failed and
5 skipped; 7,802 tests passed, 3 failed and 263 skipped. The failures were two
Git-commit signing timeouts and one frontend-scanner timeout. After integration,
a focused four-file replay passed all 62 tests, including every ACI and scanner
case, the binding tests and the incoming PostgreSQL-pool tests. It used the real
Node binary and disabled Git signing only for the test process; test timeouts
and assertions were unchanged. Exact-head Hub CI
[39517369538](https://github.com/NikolasP98/minion_hub/actions/runs/39517369538)
passed 885 test files (5 skipped), 7,806 tests (263 skipped), and all 3 architecture
tests. Its declared check reported zero errors and warnings; the production
build, client-boundary and canary gates passed. The final loopback acceptance
also passed on this candidate with the exact Gateway CI artifact. A redundant
local check was stopped after hosted success and contributes no additional
completion claim. The QA-stack job also passed. Preview deployment status is tracked separately
from production adoption.

The prior release's full Windows failures remain separate qualification debt.
One personal agent per profile still has one home-gateway binding. Mutation
fingerprints still compare target/display metadata, which can collide for
different same-length payloads; a matching TODO and proposal retain that gap.

Production requires the [release procedure](release-procedure.md), approved
source releases, the exact FACES callback correction, verified assignment, and
request-level acceptance. None is implied by this local receipt.
