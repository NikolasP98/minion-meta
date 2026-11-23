# T014 local creation and partial-provisioning retry evidence

Outcome: PASS, three temporary native integration cases. No application changes are needed for the exercised behavior. No Hub tracked files or active final pipeline files were changed or committed.

## Evidence gap audit

The existing 19-test native data run (`/home/nikolas/.no-mistakes/evidence/01M83BDQMWKAGFTMSBAY7H98V1/branding-native-results.json`) proves actual `bootstrapOrganization` creation/retry in a disposable schema and actual branding PATCH persistence. Its exact bootstrap case is `organization role bootstrap against PostgreSQL creates one Administrator with explicit full organization grants and separate ownership`. The earlier actual `provisionOrganization` retry cases used an in-memory Supabase substitute. That did not establish complete T014 orchestration-to-QA-database evidence, so this temporary test adds that missing seam rather than repeating the full suite.

## Source and target provenance

Private execution checkout: `/tmp/minion-white-label-145-data`, commit `cafed572f2ff9084a1bf1752a0acfe2ba8212105`. The actual provisioning route, orchestration service and bootstrap source were independently byte-compared with merged data PR707 commit `0aab78ecb089b548f057ae67ce87ee1820b42536`; all three match.

| Actual application source | SHA-256 |
|---|---|
| `src/routes/api/organizations/provision/+server.ts` | `029a14ee92e9cf4b4c9c11817b6608238bbab8a6a4d57745ce4af17c6e2fef55` |
| `src/server/services/organization-provision.service.ts` | `5b437420302dc51843513fdc6a2fc8b5e4c727edd8f54e9dd6a4dc63e8331a33` |
| `src/server/services/organization-bootstrap.service.ts` | `d151e9ce5ce727e1a060db5964c5a67b6ff7a821196485aa1c3568db7034e1cd` |

Targets: dedicated GoTrue/PostgREST `http://127.0.0.1:54421` and PostgreSQL `127.0.0.1:54422/postgres`. The temporary runner reads only the existing private QA environment file and validates exact loopback host/ports. It does not copy credentials into an evidence artifact or test source.

## Executed behavior

The actual POST handler, `requireAdmin`, `provisionOrganization`, `supabaseAdmin`, legacy organization/membership/role writes, PostgreSQL pool and new-model `bootstrapOrganization` were used. Only Workforce/Gateway outbound transport seams were mocked. The mocked Workforce getter deliberately rejects before sending any request. A fetch fence rejects every HTTP origin except the dedicated local Supabase origin.

For each legacy and organization role model, the first request returned502 after real organization, membership and RBAC commits. Workforce failed with the injected outage; gateway, workstation and readiness steps were skipped. The second request retried the same normalized slug while requesting an uppercase legal name and a different `Replacement` prefix. It returned the same existing organization with original full legal name and `Clínica Faces` prefix. Native reads proved exactly one organization and identical stored identity, membership, role assignments, role catalog and permission rows after retry.

| Model | Initial / retry HTTP status | Stored role key | Rule count | Retry identity and access |
|---|---|---|---:|---|
| legacy | 502 / 502 | `owner` | 0 | Unchanged |
| organization | 502 / 502 | `custom-administrator` | 24 | Unchanged |

The actual platform-admin admission function rejected a separate real local nonadmin profile with403. An invalid custom suffix returned400. Neither attempt created an organization or reached an outbound transport. Identity is supplied directly to the handler as a fixture; this does not qualify browser sign-in, cookies or the identity-resolving hooks.

Network observations: four invocations of the mocked Workforce getter, zero Gateway RPC calls, zero Gateway credential resolutions, and actual HTTP traffic only to local GoTrue admin and PostgREST organizations/membership/role endpoints. No Workforce, gateway, model, workstation or production request was made.

## Cleanup

The test removed only its two generated organization rows, their associated fixture-owned audit/role/permission records, and its two newly created GoTrue auth/profile IDs. Exact generated IDs are retained in `white145-provision-native-receipts.json`. Native post-cleanup queries found zero created organizations and zero created profiles. No reset, seed or existing fixture update was performed.

## Commands and artifacts

Exact reviewed temporary source: `/tmp/white145-provision-native.test.ts`.
Exact temporary config: `/tmp/white145-provision-native.config.ts`.
Actual source/config remain under `/tmp/minion-white-label-145-data/.local/hub-white-label-145-implementation/t014/` so this replay command uses the same executable seam:

```sh
python /tmp/white145-provision-native-run.py
```

The runner invokes, from the private data checkout with its explicit guarded QA environment:

```sh
node node_modules/vitest/vitest.mjs run --config .local/hub-white-label-145-implementation/t014/vitest.config.ts --reporter=verbose --maxWorkers=1
```

Final output log: `/tmp/white145-provision-native.log` — one test file, three passing tests,7.12s total (test bodies156ms/86ms/4ms). Responses and committed-state receipts: `/tmp/white145-provision-native-receipts.json`.

Temporary source SHA-256: `4557ea8327d09828441818859062dd1a41d7d81bba6518a4829d5e14af15920a`.
Temporary config SHA-256: `a57f5a4ed7e750e349eeb63d360c6a0d54acc1960ecff5b39108aa376bdbda69`.

## Boundary of the result

This closes local server-side T014 creation/partial-retry persistence evidence for both creation models, preserving the platform-admin gate and legal name. Both attempts intentionally remain partial at the injected Workforce outage. It does not claim completed workstation provisioning, external Workforce readiness, successful browser form interaction, or final-pipeline/full-feature deployment. The active final branch and pipeline were untouched.

Durable copies beside this report: [test](provision-native.test.ts), [config](vitest.config.ts), [guarded runner](replay.py), [log](run-output.txt), [receipts](receipts.json). The original paths above describe the actual execution checkout; replaying elsewhere requires re-establishing that guarded QA checkout.
