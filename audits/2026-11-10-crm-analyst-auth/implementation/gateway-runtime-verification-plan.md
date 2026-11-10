# Actual gateway verification — source checked, not executed

Independent reviewer `/root/crm_auth_spec_review` read Core AGENTS and inspected
only fetched git blobs, not the dirty/stale Core working implementation.

Both `origin/main` at `50a3036ad7fac23710943e7eeadfe66b38d96fcd` and `origin/DEV`
at `d3e0fbf54fc657521df07c896ea7adce5ba1afcd` contain the complete configured
server identity chain: hub-metrics-config trims/requires serverId; server.impl
registers it; the shared global Hub REST registry retains it; hub-common's
hubHeaders/hubPost emits x-minion-server-id; the CRM themes adapter calls hubPost
with the resolved personal-agent identity. Header helper, REST registry, direct
invocation handler and themes adapter have identical blobs across those refs.
No Gateway patch is needed based on that source evidence. This does not establish
the running gateway's installed version or emitted headers.

After a successful Hub deployment, exercise the actual affected gateway through
its existing authenticated `POST /tools/invoke` surface, documented by Core
extensions/squid/README.md. The handler authenticates gateway requests, builds
tools/policy for the supplied session, and executes the tool directly without
a model turn. Request shape:

```json
{
  "tool": "crm_conversation_themes",
  "sessionKey": "<actual affected personal-agent session key>",
  "args": {}
}
```

Use the assigned gateway credential only in a private dedicated probe process.
Use explicit args.orgId only if the known assigned organization requires it.
Never substitute the default `main` session: it can select another agent. Tool
policy still applies; an unavailable tool can return404. The existing private
incident receipt identifies the exact session; do not copy its identity to git.

Inspect `result.details`, not merely HTTP200/outer ok:true. The adapter can return
a structured Hub failure inside a successful invocation envelope. Require the
expected organization and aggregate shape, with no error or HUB_HTTP_* rejection.
Keep returned CRM content private and publish only sanitized status/shape proof.

A manually hinted Hub API check verifies Hub admission; successful execution via
the actual gateway adds transport/adapter/principal proof. Exact emitted-header
observation is a separate claim and is not established by source or outer status.
No endpoint, model, production config or history was accessed by this reviewer.
