# Assistant capability repair: release procedure

This is a prepared procedure, not an execution receipt. It accompanies
`2026-10-18-assistant-capability-failure-recovery-spec.md`. Production changes
require owner approval of the reviewed source and the targeted operations below.

## Release scope

1. Release the Hub hosted-assignment repair and Gateway discovery/output repair
   from their reviewed commits through each repository's normal pipeline.
2. Verify the deployed Hub revision and running Gateway image digest before
   claiming either source change is live. Check both canonical services, the
   inactive slots, HTTP health, and WebSocket upgrade/challenge.
3. Correct only the FACES runtime callback identity. The default/MINION runtime
   is outside this configuration change.
4. Complete the existing personal agent's assignment through the reviewed
   hosted provisioning service, retaining its identity and workspace.

Deploying the Hub repair enables its normal authenticated layout ensure path to
repair active unbound rows. Approval of that release therefore includes this
behavior; it is not a schema migration or a bulk backfill.

## Exact production preconditions

Read these again immediately before execution; the incident observation alone
does not establish that they remain true:

| Field | Expected value |
| --- | --- |
| Active organization | `21e0601b-f632-43fd-8414-d644af4271f4` (FACES) |
| Authenticated profile | `3ab72ffb-6cac-4933-b35e-cd12aa7ccbd6` |
| Personal agent row | `jdrqie3tudz0n2pg27l2tggy` |
| Persisted runtime agent | `personal-nk7uyyafrbl4ngdrtbfmznvnk17xvwk0` |
| Canonical FACES gateway | `a64274a8-5803-418c-b92e-527e23f4a005` |
| Initial assignment | `gateway_id IS NULL`, `provisioning_status = 'active'` |
| FACES callback hint before repair | `1cf319d2-cad0-42d9-9bb5-151cef48c347` |

The owner must still be a member of FACES. The current production channel lease
must select the canonical FACES gateway, and its current credentials must
authenticate to that exact runtime. `agents.list` must contain exactly one
entry with the persisted runtime agent ID. A different non-NULL assignment,
changed lease, duplicate/missing runtime agent, changed credentials or identity
is a stop condition, not permission to improvise a reassignment.

## Targeted configuration correction

Read `/home/node/.minion/gateway.json` inside the verified active FACES container
without printing its contents or credentials. The intended semantic patch is:

```json
[
  {
    "op": "test",
    "path": "/gateway/hubMetrics/serverId",
    "value": "1cf319d2-cad0-42d9-9bb5-151cef48c347"
  },
  {
    "op": "replace",
    "path": "/gateway/hubMetrics/serverId",
    "value": "a64274a8-5803-418c-b92e-527e23f4a005"
  }
]
```

Keep a unique private backup on the same persistent volume. Write a private
temporary file, preserving the runtime file owner, then atomically rename it
after rechecking that the original bytes have not changed. Verify that this
single field is the only semantic difference. Never log the full configuration,
tokens or backup contents. If the field already equals the canonical FACES ID,
verify it and skip the write. Any other prior value requires fresh diagnosis.

Use the supported runtime configuration reload; if a controlled restart is
necessary, target only the FACES service and verify convergence and health.
Record the exact command, backup identity, before/after non-secret field values
and health receipt in the execution record. No restart has been performed by
this prepared procedure.

## Assignment and runtime proof

Use the authenticated FACES owner's normal hosted ensure/completion path. The
reviewed service verifies the runtime roster and conditionally commits the
assignment while rechecking membership, lease, target credentials and the
personal agent snapshot. Do not bypass it with ad-hoc UPDATE SQL, a fabricated
browser identity, or a client claim that provisioning succeeded.

If automatic ensure already completed after the Hub deployment, verify the
result rather than replaying it. Preserve the existing agent ID, personality,
workspace and profile pointer. Record the verified canonical assignment.

Using the runtime's configured callback credentials and server hint, verify
that `query/tool-catalog` and `query/tool-permissions` return an authorized
catalog including `catalog_query`. Do not substitute a corrected request
header for the runtime's configured hint when claiming the configuration is
fixed. Existing Gateway permission snapshots have a 60-second cache lifetime,
including failed snapshots. After verifying the callback and assignment, allow
that lifetime to expire before starting a fresh acceptance run if the runtime
still holds an earlier denied snapshot. Do not replay the assignment or widen
permissions to work around the cache.

Then perform the approved bounded production acceptance question:
“what are the most expensive services we sell”. Require services ranked by
sale price with source links, no automatic navigation, no repeated discovery,
and no visible DSML. A healthy container alone does not prove this behavior.

## Failure and rollback

- Before assignment commit, roster/authority failures leave the assignment
  unchanged. Investigate the sanitized failure instead of creating a duplicate
  agent or widening permissions.
- If the callback patch causes a runtime failure, restore the private backup
  only when the current configuration still equals the patched version. Retain
  any concurrent changes for reconciliation; never overwrite them blindly.
  Reload the FACES runtime and recheck health and WebSocket readiness.
- Roll back a source deployment through its normal previous-revision/image
  mechanism. Record the observed deployed revision/digest afterward.
- A successfully verified assignment is durable identity state. Do not undo
  it merely because an unrelated deployment or refresh failed. If the binding
  itself is proven wrong, stop and obtain a separate reviewed correction with
  exact current-state checks; this procedure authorizes no non-NULL rebind.

## Retained limits

The current schema binds one personal agent per profile to one gateway. This
repair does not provide concurrent multi-organization delegation. Full Windows
qualification failures from the preceding release remain separately tracked;
focused repair tests and Linux checks do not close those failures.
