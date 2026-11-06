# GW022A recovery-factory amendment self-review

- Verdict: **PASS for independent review**
- Scope: private config recovery factory only
- Parent config contract: `8ee807b3dc8127b8050fd6d3c095c1593a750bf0cd200b8d0d61992b6457b46f`

The amendment closes the replay gap without giving native code ledger-write authority. The factory
cannot return a session, so JavaScript cannot call a second rename while the durable row is behind
the observed filesystem. The retained classifier makes the acknowledgement gate enforceable in
native code and keeps the original root -> ledger -> config ownership through the handoff.

The four intent forms have complete before/after tuples. They include the first-backup seed and the
second backup exchange, which are easy to miss if recovery is modeled only as canonical config
publication. Ambiguity is fail-closed, and revalidation after the ledger append covers replacement
between classification and resume. No new durable stage or credit is invented.

The normal-stage tuple digest excludes the precursor intent and relationship, so an observed
unsynced digest survives the intent-to-unsynced append and restart byte for byte. Unclassified
filesystem evidence is a separate credited uncertain frame; native code never claims it was written.
The retained unclassified handle gives the adapter a bounded way to append that frame while locks
remain held, and accepted resources have registered control cleanup even if factory construction
rejects before returning a JavaScript handle.

The implementation boundary is package-private and does not claim a production adapter, target
artifact, or release. The current WIP must continue rejecting durable intents until this amendment
has both reviews and the actual-addon crash matrix passes.
