---
id: 2026-10-18-assistant-capability-failure-recovery
title: Restore assigned assistant tools and contain malformed model output
status: in-spec
created: 2026-10-18
updated: 2026-10-18
repos: [minion, minion_hub]
spawned_spec: 2026-10-18-assistant-capability-failure-recovery-spec
---

# Restore assigned assistant tools and contain malformed model output

## AS-IS

The deployed agent advertises current search/load schemas but cannot discover catalog_query. Read-only production diagnostics establish that both discovery and permission endpoints return403 ASSISTANT_GATEWAY_ASSIGNMENT_REQUIRED. Its personal-agent row is active with gateway_idNULL. The FACES runtime also advertises a server hint resolving to a different organization; the correct FACES canonical row authenticates with the existing credential but still rejects the missing assignment. No production mutation occurred.

Gateway loader silently turns this403 into an empty remote catalog. Repeated search/load calls then consume six discovery calls, invoking answer-only recovery. The model's textual DSML control markup escapes through stream/final delivery instead of an answer. Earlier local proof used a directly provisioned actor and restricted allowlist, so it did not cover the hosted provisioning seam.

## TO-BE

A hosted personal agent is active for business tools only with a persisted, verified assignment to the selected canonical organization gateway. Discovery reports unavailable capabilities truthfully and stops retrying permanent failures. User-visible output never executes or leaks malformed control markup; one bounded recovery yields a grounded answer or an honest inability response. Valid quoted syntax examples remain readable.

## DELTA

Implement the matching spec with independent behavior and authority reviews. Prove real loopback provisioning, principal, manifest, normal factory policy, service-price ranking and response egress. Production pointer/config repair is a separate exact-target reviewed mutation requiring owner approval; do not infer permission from a model's orgId or from gateway possession.

## Retained boundaries

A personal_agents row currently has one gateway binding per profile. This repair must not silently move an existing binding on organization switches; broader concurrent multi-organization delegation requires its own scoped contract. Brain authority remains unchanged. Full Windows qualification debt is tracked in2026-08-23-minion-ai-ci-baseline-debt. No model upgrade or permission bypass is included.
