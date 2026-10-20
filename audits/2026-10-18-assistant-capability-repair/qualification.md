# Assistant capability repair qualification

Updated 2026-10-20. This records local evidence; it is not a production adoption
receipt. New source changes have not been merged or deployed.

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

Repository-wide tests, checks, final builds and exact commit identities will be
recorded after completion. The current Hub base also has newer upstream changes
to integrate before final acceptance. Focused passing tests are not a substitute
for those gates.

The prior release's full Windows failures remain separate qualification debt.
One personal agent per profile still has one home-gateway binding. Mutation
fingerprints still compare target/display metadata, which can collide for
different same-length payloads; a matching TODO and proposal retain that gap.

Production requires the [release procedure](release-procedure.md), approved
source releases, the exact FACES callback correction, verified assignment, and
request-level acceptance. None is implied by this local receipt.
