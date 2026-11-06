# Evidence inside each finding

The user requested before/after hard evidence in every finding disclosure. The readiness report now contains a panel for all 116 findings, with no missing baseline attachments. The panel uses the Minion semantic tokens and local typography already used by the report.

A screenshot is an actual captured state, labeled with its environment and revision. The calendar failure/recovery screenshots are both post-change states: the injected failure proves visible unavailability and Retry; recovery proves the read repair. They are not mislabeled as a pre-change/post-change pair. The earlier bulk-tag screenshot is a true baseline reproduction. A screenshot reused for related findings is the same capture, not another independent run.

Where visual evidence is unavailable or cannot prove the defect, the panel embeds numbered frozen-source excerpts, exact committed diffs, production aggregate measurements or captured console output. Source changes are code evidence, not runtime acceptance. Every queued fix keeps its after panel explicitly pending. No benchmark, p99 or speed improvement is inferred from a test runner duration.

The source snapshots are pinned to the original recon commits. The implementation side reads only commits recorded in `findings.json`, not uncommitted worker changes. Console excerpts preserve their full-source SHA-256 and source location; excerpt files are bounded and credential strings are redacted where applicable. Committed diffs are attached locally so unpublished feature commits remain independently inspectable. The local report and source receipts are not uploaded to a public host.

`finding-evidence-coverage.json` records attachment coverage. `finding-evidence-report-validation.json` records report-only Chromium validation: all 116 panels hydrate, local asset links resolve to files, the native disclosure click hydrates its evidence, and the 390 px viewport remains 390 px wide. This is not acceptance of the application findings.

Rebuild from the task checkouts and preserved recon:

```bash
python3 .planning/operations/readiness-2026-10-03/report-tools/render-readiness-report.py \
  /home/nikolas/.cache/codex-implementation/2026-10-03-hub-gw \
  /home/nikolas/Documents/CODE/MINION
```

The builder reads the historical report and its screenshots, the meta findings ledger and evidence directory, the isolated repositories and explicitly mapped test logs. It writes only the dated readiness artifact and its assets plus a local attachment inventory. Keep original recon receipts intact. Add exact screenshot/test mappings when each subsequent fix is qualified, then rebuild and refresh the coverage receipt. Do not replace a pending panel with a proposed result.
