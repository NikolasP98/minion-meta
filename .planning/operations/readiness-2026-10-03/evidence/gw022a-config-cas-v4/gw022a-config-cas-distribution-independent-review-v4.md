# GW022A config CAS and distribution independent Standards review v4

- Date: 2026-10-03
- Reviewer: `/root/hub_client_fixes`
- Verdict: **PASS**
- Spec SHA-256: `8ee807b3dc8127b8050fd6d3c095c1593a750bf0cd200b8d0d61992b6457b46f`
- Self-review SHA-256: `8865291619e43cc7991a9d721aab7816bda78b04de3bc1e126f5449b1c5775ee`
- Supersedes: `gw022a-config-cas-distribution-independent-review-v3.md`
- Source edits authorized by this review: none

## Delta reviewed

The v4 amendment closes both v3 blockers without weakening the private reusable-scratch or
publication-session contract.

1. The effect-owning path now acquires the process root, the exclusive selected-pair ledger lease,
   and the exclusive config lease in that order. The same ledger authority appends every session
   frame while both operation leases remain held. Normal settlement appends `observer-pending`,
   closes the native session and releases config, then releases ledger before any observer runs.
   Recovery and registered control cleanup use the same acquisition hierarchy and reverse release
   order. Terminal observation reacquires ledger alone, so no path reacquires ledger beneath a held
   config lease.
2. Admission now atomically charges all 16 parent ledger-frame credits before any effect in each of
   the initial, first-backup, and later-replacement branches. The 11/15/11 values are explicitly
   normal-success consumption, with terminalization releasing 5/1/5 unused credits in the same
   generation CAS. The operating threshold counts all 16 outstanding credits, and an injected
   fault consumes an already charged credit rather than requiring a seventeenth frame. This keeps
   uncertainty classification capacity unavailable to concurrent operations and rollover.

The separate terminal `PublicationHandle`, finite private session, independent bootstrap and seed
topology, held-reader and link/inode barriers, bounded retained evidence, withheld delete, durable
operation identity, and four-target release gates remain intact. No remaining Standards or
blast-radius blocker was found in this frozen contract.
