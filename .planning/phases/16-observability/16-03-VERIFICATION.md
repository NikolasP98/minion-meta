# 16-03 VERIFICATION — goal-backward check (executor self-check, not the independent review)

Candidate: `/home/nikolas/.cache/claude-tmp/16-03-45fd6671/MINION` at meta `origin/dev`
`5b498439` + 3 untracked `scripts/qc` files; docs in the main checkout's
`.planning/phases/16-observability/`; evidence under `…/16-03-45fd6671/checks/` and
`…/artifacts/`. Independent verifier still owes the phase verification.

## must_haves.truths

| Truth | Verdict | Evidence |
|---|---|---|
| Incident queries have valid denominators and explicit missing attribution; no customer or secret payload is exposed | **HOLDS (contract level)** | `checks/01-incident-query-test.log` 19/19: mixed-transport, unit-mismatch, unattributable-numerator, missing-sample-rate and missing-host-map all refused with codes; `attribution.environment` is `filtered` or `missing (…)` (test "master server_error: attribution is explicitly missing"); projection allowlist excludes `error`/`message`/`path`/`$current_url`/…; credential-shaped strings rejected; `artifacts/views.json` contains no raw description (asserted). **Not** established on live data (queries never executed; `obs-01` producer not deployed — G-6). |
| Threshold and recipient authority known; routed synthetic receipt or an explicit pending gate is recorded, never assumed | **HOLDS as an explicit pending gate** | `16-ALERT-ROUTING.md` §1 states authority is unknown for every rule; §2 every rule carries ≥ 1 gate (asserted by `checks/02-alert-routing-test.log` 10/10 "gates per rule match the routing doc"); §6 remote receipt PENDING with the exact unblocks; DR-16-03-01…05 recorded. No receipt claimed; no packet sent (`fetch` stubbed to fail during packet preparation). |

## must_haves.artifacts

| Artifact | Provides | Verdict |
|---|---|---|
| `scripts/qc/incident-query-contract.mjs` | build queries with valid denominators and environment filters | present (sha `ca829aa5…`), `node --check` ok, CLI exit 0 on the recorded export, exercised by 29 tests across two files |
| `.planning/phases/16-observability/16-ALERT-ROUTING.md` | prepare and verify the actual alert recipient path | present (sha `9bbeb18b…`); *prepare* delivered (inventory, contract, dry-run packet, decision requests); *verify* explicitly pending (§6) |

## must_haves.key_links

| Link | Verdict | Evidence |
|---|---|---|
| contract → `.lavish/minion-qc-2026-09-08/telemetry.json` | HOLDS | `assessSnapshot` consumes the export's shape (`devices`, `serverErrors`, `browserErrors`, `window.project`); CLI run against the real file (`checks/03-cli.log` exit 0); unit test pins the 244 / 248 / 27 numbers and the five findings |
| `16-ALERT-ROUTING.md` → `16-INCIDENT-VIEWS.md` | HOLDS | routing §3 requires ratio triggers to pass the incident denominator contract (`assertRatio`, shared code path; test "rejects a ratio trigger with a bad denominator") |

## Task done-criteria

- Task 1 done: **yes at contract level; no at runtime** (queries validated on fixtures and
  the recorded export, never executed against a project; production attribution needs #246).
- Task 2 done: **first clause partially** (thresholds known where they exist in source, recipient
  *names* known, values/authority unknown — recorded as gates, not assumed); **second clause
  honored** (explicit pending gate, no receipt claimed).

## Threat register

- T-16-03-01 (secret leakage / false environment attribution): environment allowlist +
  `unknown` bucket; release must be a sha; client attribution requires an explicit host list;
  credential shapes rejected in manifests, rules and packets; recipients are env var names
  only; sends need recorded authorization. Mitigated in the contract; runtime unproven.
- T-16-03-02 (evidence/fixture artifacts): synthetic markers `MINION_OBS03_<hex>`, no
  customer payload (raw description asserted absent from CLI output), exact source identities
  and runtime (`checks/freeze.json`) recorded. Mitigated.

## Negative/behavior evidence a report-only pass would have missed

- The export's tempting "248 500s over 244 pageviews" is refused twice over (no environment on
  the numerator; mixed transport) — the contract encodes the PROGRAM exclusion instead of
  restating it.
- `server_timing` cannot count requests: the estimate needs the deployed sample rate, which is
  an env value this executor cannot read; the contract refuses the denominator without it.
- Two real defects were caught red→green during development (dangling `else`; estimate label
  matched by the kind name) — recorded in the summary.

## Boundaries check

Owned files only (3 meta scripts, 2 meta docs); snapshot `git status` shows exactly the three
`scripts/qc` files; no STATE/ROADMAP/index/proposal edits; no commit/branch/stash; no
credentials; no external calls; `telemetry.json` read by absolute path, unmodified.
