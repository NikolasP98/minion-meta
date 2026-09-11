---
phase: 15-data-pipelines
plan: "06"
requirements: ["DATA-01"]
requirements-completed: []
status: locally-qualified-service-binding-open
---

# Statement header and capacity repair

Candidate: `/home/nikolas/.cache/claude-tmp/hub-16-01-15-02`. The two owned files and before-images are recorded in `/tmp/minion-15-06-3jirthau/final-inputs.json` and `before/`. Parser SHA256: `09e9799c5f7a16f0989df10034416d12d3017098f2b532a53ea8cdcb5c4b92f5`; test SHA256: `81380d728a0f58f3ff9596b40d39906d4c86af0099466bc18ad81361ad96b6d4`.

The first nonblank header is rejected before mapping if it is truncated, malformed or contains replacement characters. The new typed StatementParseHeaderError contains a fixed reason and no source content. Data-record capacity excludes the same genuine blank records that the parser already filtered, while malformed or oversized empty-looking records remain evidence and consume capacity. Existing filtered logical sourceRow numbering, duplicate warnings, monetary/sign/currency behavior and normalized-text provenance are preserved. Parser version advances from 2 to 3 because accepted/rejected semantics changed.

Root independently reviewed both files and repeated **60/60 native tests**, zero skips, in 1.99 seconds. This includes exact/+1 field and column limits, decoded quote escaping, encoding hidden in truncated suffixes, 100000 actual records with surrounding/interspersed blanks, 100001 refusal, and original financial/provenance controls. The agent also passed scoped native TypeScript, formatting and diff checks. One worker, 1 GiB heap, private cache, envDir:false and denied network were used. Exact commands are in HANDOFF.md; root output is root-replay.log.

Preserved baseline has seven behavioral failures with fifty passing controls; two additional truncated-suffix cases also fail against the baseline. No customer statement, database, provider or ingestion action occurred. The ten telemetry files and Git index remain unchanged.

The service's private PARSER_VERSION is still 1. Its frozen durable-job candidate is owned by 10-04/10-07 and must be combined before changing persisted version/cursor behavior. The exact parser TODO and `proposals/2026-09-10-hub-finance-parser-version-binding.md` retain this integration gate. DATA-01 stays open until persisted provenance, retry/resume and the remaining pipelines are qualified. No historical parser-version backfill is inferred.
