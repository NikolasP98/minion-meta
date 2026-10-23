# Evaluation batch validation guide

Run from the isolated F meta checkout with exact dependencies installed. Set the manifest's Hub source/lock/adapter identities to the reviewed A candidate through an explicit fixture-preparation step; never silently rewrite an approved live manifest. Only synthetic manifests and test-only approval keys are used below.

```bash
node --test scripts/agent-evals/run.test.mjs
node --test scripts/agent-evals/corpus.test.mjs
node --test scripts/agent-evals/report.test.mjs
node --test scripts/agent-evals/screen.test.mjs scripts/agent-evals/complaint.test.mjs
node --test scripts/agent-evals/live-provider.test.mjs scripts/agent-evals/lib/*.test.mjs
node scripts/agent-evals/corpus.mjs validate --input audits/2026-10-22-agent-use-transcripts/spec/fixtures/corpus
node scripts/agent-evals/corpus.mjs readiness --input audits/2026-10-22-agent-use-transcripts/spec/fixtures/corpus
```

Run the real integration smoke with the explicit A checkout and a fresh absolute private output path:

```bash
node scripts/agent-evals/run.mjs --mode fixture --manifest audits/2026-10-22-agent-use-transcripts/spec/fixtures/smoke-manifest.json --hub-root /home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/a-chat --out /tmp/minion-agent-evals-fixture-review
node scripts/agent-evals/report.mjs --run /tmp/minion-agent-evals-fixture-review
```

The output path must not already exist; choose another fresh path on rerun rather than deleting another process's evidence. The parent spec's shorter smoke command remains supported only if the manifest includes an explicit pinned adapter checkout and output creation is fresh; never auto-discover a dirty workspace. Source/lock/adapter drift fails before inference.

Expected smoke: three arms/reset hashes, explicit observation/domain receipts, zero external network and software-fixture-only status. Missing expected receipt or failed adapter causes incomplete/nonzero qualification, even if generated prose appears correct. Readiness reports actual small synthetic counts and “not ready” for human corpus; that is a successful software test, not a missing software implementation.

Live tests invoke the actual `--live` CLI path with a separately trusted test attestation and injected in-process/subprocess stub transport. They must prove both acceptance and zero-request rejections, plus fsync-before-dispatch, crash/reopen unknown fence, midnight/new-run carryover and response-persisted local recovery. A mocked implementation of the admission function is insufficient. Test harness denies all external network and supplies no operational credentials. No example command here authorizes an actual paid call.

For report qualification preserve exact seeded counterexample outputs: cheaper-but-less-successful fail, critical veto, missing receipts, zero successes/undefined bootstrap draws, bounded adverse unknown and unbounded unknown, cohort drift, stop/expansion metadata. For screen/complaint preserve controls/probabilities/independent labels and baseline-required shadow cases. Any attempt to treat abstain/timeout/missing label as negative must fail.

Run root declared CI gates after focused checks, including the newly wired nested tests. Orchestrator generates/checks spec/proposal indices once all six batch stubs are final. Record source SHA, lock hashes, actual Node/pnpm versions, command outcomes and artifact checksums. Independent review reports Standards and Spec separately. Paid smoke, full holdout, active gate promotion, merge and deployment remain unexecuted/separate gates.
