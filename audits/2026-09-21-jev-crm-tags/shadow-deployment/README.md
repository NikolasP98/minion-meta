# PRD shadow deployment receipt

Readiness observer deployed to Netcup on September 21, 2026 at 22:45 Lima. Inference was enabled after the user explicitly accepted the bounded shadow experiment. This deploys the shadow observer, not the separate Hub settings foundation or automatic labeling.

- Source: `0375db344fce48b48fc48eb06d3d0f2a50aa763e`
- Artifact SHA-256: `4012b9cffa654f749fd09fcad5981e206c3552aa121e3ec1898fa0eafc282b9d`
- Draft PR: https://github.com/NikolasP98/minion_hub/pull/358
- Units: `minion-jev-shadow{,-monitor,-backup}.{service,timer}`
- Source account: `minion_jev_shadow`, FACES-only source functions. Production checks returned `default_transaction_read_only=on`, membership INSERT=false, tag UPDATE=false, unrestricted contacts SELECT=false.
- Private evidence: `/var/lib/minion-jev-shadow/ledger.sqlite` and `report.json`, with mode0700 parent/mode0600 files. Credential file is root-only. No public dashboard or raw conversation export.
- Due: September 28, 2026 at 22:45 Lima. Evaluation expires automatically; monitor/report generation continues. This is a scheduled report and stop, not a scheduled autonomous agent review.

`readiness-receipt.json` omits contact-level events and run identifiers. `provider-probe.json` records three synthetic calls made with the authorized OpenRouter key. Their measured token counts do not certify the required hard token contract. Official model/API references: https://docs.typesafe.ai/models and https://docs.typesafe.ai/api .

Tests: seven pure runtime tests, one native PostgreSQL tenant-isolation/read-only/SQL-bounds test, local executable worker/report/backup checks, production manifest and privilege verification, and successful production readiness ticks. Dedicated shadow CI passed on the initial artifact. A package.json formatting failure in broader Hub CI was corrected; latest-commit checks remain subject to their live GitHub results. No merge is claimed.

Week review: inspect uptime/errors/unknown charges first; then sample predictions, abstentions and low outcomes across tags for independent human labels. Use frozen snapshots, not current conversations, when comparing expected and actual labels. Track bugs with reproductions, revise prompts on development data, and use a later held-out set before enabling automatic tags. The root proposal records remaining integration, off-host backup and erasure-propagation work.


## Activation verified

The user approved the bounded experiment. The first production attempt succeeded with 1,667 input tokens, 143 output tokens, 509ms latency and USD 0.000071 accounted cost. All eight tag decisions, exact request/context, raw receipt and resolved model `typesafe/jev-1.13-20260917` are persisted privately. No customer-visible labels changed. The refreshed same-host backup contains the attempt and passes `integrity_check`.

`activation-receipt.json` contains aggregate activation evidence; `backup-verification.json` records the backup check. The earlier readiness receipt remains unchanged. Latest deployed-source dedicated shadow CI passes; general Hub checks may still be running and do not imply a merged application release.
