---
id: 2026-11-13-cloudflare-worker-deploy-readiness
title: Make Cloudflare worker deployment validate readiness and report measured results
status: draft
created: 2026-11-13
updated: 2026-11-13
repos: [minion, minion-meta]
tags: [security]
source: agent-chat-release-2026-11-13
---

# Make Cloudflare worker deployment validate readiness and report measured results

## Problem

The ancillary Cloudflare Workers pipeline cannot deploy its current toolchain, receives empty account/token bindings, and labels static values as a before-deployment benchmark. Record and resolve those readiness gaps separately from the scoped agent-chat Gateway release. This proposal authorizes no credential change, worker deployment, live probe or behavior implementation.

## AS-IS

Actual [Cloudflare Workers run43524329080](https://github.com/NikolasP98/minion-ai/actions/runs/43524329080), source `834ddc4a6b06433ed1b1c632b5eb3830db595209`, fails in job132226263069 at `Deploy intent-classifier Worker` before deployment. Root inspected the actual job log: Node is20.20.2, while installed Wrangler requires Node22.12 or newer. The workflow at `.github/workflows/deploy-workers.yml` selects Node20 and installs `wrangler@latest`, so compatibility is not fixed together.

The same step's `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` bindings render empty. Their workflow sources are `secrets.CF_ACCOUNT_ID` and `secrets.CF_API_TOKEN`. This proves the bindings were unavailable to that execution; it does not establish whether the stored secrets are absent, inaccessible or incorrectly scoped. No value is copied into this proposal, and no configuration or credential repair has been performed.

The before-benchmark job succeeds by echoing fixed `p50=42` and `p95=110`. Those numbers are static workflow output, not measurements from this run. The after-benchmark job is skipped following deployment failure. No live HTTP/model benchmark ran, and no latency improvement is established. This run does not prove either worker was updated to source834; previously deployed worker identity and health remain unverified here.

This workflow was restored byte-exact to the previous main50 version under the approved runner-restoration contract. Its current release bytes remain unchanged. Private evidence is `.local/agent-chat-fixes-2026-11-10/main834-cloudflare-workers-outcome.json`, with sanitized status, selected error facts and log digest; raw logs and credentials are not published. Cloudflare worker deployment is a separate automation path from Docker Release and Gateway Swarm deployment. Its failure does not determine those other workflows' outcomes, which require their own receipts.

## TO-BE

A separately reviewed worker release uses a Node/Wrangler combination whose declared compatibility is verified together. The chosen version policy must be explicit rather than assuming a floating latest tool remains compatible with Node20. Before invoking deployment, an explicit readiness guard rejects missing or empty required configuration using fixed diagnostic names and no secret values.

The owner must approve the intended Cloudflare account, configuration source and credential provisioning or scope correction before any credential write or deployment. Keep repository authentication, permission and secret boundaries intact. This draft records the decision needed; it grants no account access or permission expansion.

Benchmark output must distinguish an actual observation from a fixture, unavailable result or skipped phase. Static demonstration numbers must not appear as measured release evidence. Any future real benchmark needs a separately reviewed endpoint, payload, authorization and cost boundary; only an executed probe may produce a measurement claim. A failed deployment must leave its after-benchmark explicitly unavailable or skipped.

The current Gateway release keeps its thirteen-path scope fence, frozen contracts, restored workflows and independent Docker/Swarm qualification. Worker readiness is a separate follow-up with its own spec, implementation and deployment evidence.

## DELTA

1. Reproduce the Node/Wrangler incompatibility using the actual installed version evidence, and choose a compatible, reviewable version pair in a new bounded spec. Prove compatibility through the executable local consumer rather than checking source strings.
2. Define the account/token readiness contract and the approved owner configuration route. Add a guard only after that spec and any required owner configuration approval. Synthetic missing/empty fixtures must reject before a deployment stub is invoked; sentinel credential values must never appear in logs. This step does not authorize provisioning credentials now.
3. Replace or clearly label static baseline output, and define measured, fixture, skipped and unavailable benchmark states. Executable fixtures must distinguish these states and prove that deployment failure cannot emit an after-benchmark measurement.
4. Qualify the separately scoped change through review and actual CI, then retain its own authorized worker deployment and identity evidence. Record benchmark results only if the separately approved probe actually executes. Do not use Gateway Docker/Swarm success as worker proof or make worker performance claims from static output.

## Definition of done

A reviewed spec fixes the version and readiness behavior; meaningful executable checks cover compatible tooling, missing configuration, secret-free diagnostics and benchmark provenance. Any owner-approved configuration change is verified without exposing values. The resulting worker release has actual exact-source deployment evidence, and its benchmark state describes what executed. Until then, retain exact-site `TODO(handoff)` pointers at the Node/toolchain, credential-binding and static-baseline sites linked to this proposal. A comments-only draft branch may carry those pointers; it provides no implementation or deployment qualification.

## Out of scope

No current Gateway/source/frozen-contract change, expansion of the release fence, repository permission change, credential write/rotation, manual deployment, live HTTP/model probe, business action or benchmark claim. No claim that existing Cloudflare workers are unavailable; their deployed state was not inspected by this failure analysis. Existing Gateway Docker and Swarm work continues under its own evidence and authorization.

## Open items

Owner-approved Cloudflare account/configuration route, reviewed compatibility/readiness spec, implementation, actual worker CI/deployment identity and honest benchmark qualification remain open. Normally signed [draft PR376](https://github.com/NikolasP98/minion-ai/pull/376), head `1209ac30642d801686a6b2ee825a47ef44f3cac9`, targets DEV and adds nine handoff comment lines only. Executable lines and parsed YAML semantics are unchanged; it is unmerged and implements no Node, configuration, credential or deployment fix. The draft PR and this proposal grant no implementation or account-change authority.
