# EGM tested candidates

**Release update: not live.** The original EGM exports below are frozen prototype evidence. Repository qualification found and fixed a large-output redaction performance defect and replaced source-fragment test execution with real callable modules. Use [current release status](release-status.json) and the submitted [Gateway](gateway-release-draft.patch) / [Hub](hub-release-draft.patch) snapshots for release review; signed Gateway/Hub commits now exist and release qualification is running; human approval/merge and deployment remain pending.

[Read the consolidated result](consolidated_review_report.md): approaches for all eight findings, 253 distinct passing tests, review findings and remaining adoption gates.

- [Design and exact plan](approaches.md)
- [Gateway patch](gateway-candidate.patch) / [Hub patch](hub-candidate.patch)
- [Verification, source hashes and test names](verification.json)
- [Reproduction script](reproduce.py)
- [Raw review and dispositions](goldfish_review_report.md)

These are exported-source candidates; shared product checkouts and production were not changed. This folder includes synthetic test evidence, not raw message ledgers or historical secret values.

The submitted patch snapshots precede later gate-owned fixes. Current review decisions, candidate identities and remaining qualification are recorded in `release-status.json`; these downloads are not a production-ready release.
