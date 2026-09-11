---
id: 2026-09-11-hub-telemetry-boundary-followups
title: Qualify telemetry delivery and remaining host log boundaries
status: draft
created: 2026-09-11
updated: 2026-09-11
repos: [minion_hub, minion, minion_site]
---

# Telemetry delivery and remaining log boundaries

GSD 16-04 repairs the fixed PostHog server capture boundary in the PR246 candidate. Root independently reviewed the ten frozen files and repeated all 50 native tests. This is source qualification; no production captures were sent and no error groups were resolved.

1. **Flush and delivery:** `minion_hub/src/lib/server/posthog.ts:57` carries the matching TODO. Existing error hooks request immediate flush. Promise rejection containment and shared client initialization do not establish bounded outbound request fan-out during an error storm or reliable serverless delivery. Use the installed SDK's supported batching/lifecycle mechanisms after measuring concurrent requests, shutdown, timeouts and retry bounds in an isolated synthetic receiver. Establish an explicit loss/latency budget before changing batching. Do not claim exactly-once analytics delivery.
2. **Host logs and Sentry:** `minion_hub/src/routes/api/servers/[id]/provision/run/+server.ts:140` carries the matching TODO. Its remaining raw exception/path console output is outside the repaired PostHog payload. Review actual error and provision logs plus Sentry before-send behavior, request/body/header attachment, source maps and release identity. The existing broader SEC/OBS plans own these surfaces. Use token/customer canaries and prove redaction without hiding actionable error categories. No historical logs are to be deleted by this proposal.
3. **Producer coverage:** gateway/agent execution, Site/browser events and authenticated full-stack delivery remain separate gates. Read-only PostHog project129899 shows no AI generation/trace/evaluation event names seen in its recent schema window; this is a coverage gap for that project, not proof that agents did not execute. Sentry tools were unavailable in this session. Link actual run/definition versions to a reproducible test manifest before declaring the agent layer observable.

Request/run/resource hashes are correlation pseudonyms; they do not grant authority or protect low-entropy inputs against guessing. Route attribution relies on actual SvelteKit route.id, and actor/organization authority remains server-resolved. The repaired event allowlists must not become a generic free-text escape hatch.

Evidence: `.planning/phases/16-observability/16-04-SUMMARY.md`, `.planning/operations/360/POSTHOG-READONLY-2026-09-11.md`, and `/tmp/minion-16-04-oxfrdibz/HANDOFF.md`.
