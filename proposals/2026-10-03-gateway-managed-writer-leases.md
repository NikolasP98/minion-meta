---
id: 2026-10-03-gateway-managed-writer-leases
title: Gateway managed-root writer leases and destructive cleanup fencing
status: approved
created: 2026-10-03
updated: 2026-10-03
repos: [minion, minion-meta]
tags: [security, data, logic, test]
effort: L
source: GW-022A deferred dependency
---

# Gateway managed-root writer leases and destructive cleanup fencing

## Implementation authorization

The user authorized every readiness finding, including GW-022A and its implementation
dependencies. This proposal records the separately reviewed implementation slice still required
before recursive managed-root cleanup, reset, uninstall or split may become available. It does not
authorize a merge, deployment, production cleanup or migration by itself. The user has approved this security/data implementation scope; two-pass specification
review and human merge remain required.

## AS-IS

The reviewed `@minion-stack/linux-fs-atomic` package owns descriptor-relative root admission,
bounded asynchronous syscalls, durable publication primitives and process-owned filesystem leases.
Its current package contract intentionally omits recursive managed-root deletion and does not claim
that every Gateway writer participates in a shared generation.

Gateway writers span agent workspaces, transcripts and sessions, plugin data, orchestration output,
configuration and runtime state. Several still open string paths or retain their own process-local
lifecycle. A root lock held by one transaction cannot prove that these independent writers have
stopped. Moving or deleting a managed root while any such writer remains active can redirect late
bytes, recreate a quarantined path or mix generations. Process exit releases kernel locks, but it
does not classify an operation killed between an external effect and its durable receipt.

For that reason the GW-022A filesystem contract keeps physical old-root cleanup manual. The native
package exposes no recursive cleanup facade, and unsupported integration must stay visibly
unavailable. This is a required dependency, not an accepted permanent exclusion.

## TO-BE

1. Every writer to a managed root acquires a generation-bound shared writer lease from the same
   physical-root authority before its first effect. The lease captures root identity, authority
   marker identity and digest, writer class, owner token and generation.
2. Destructive operations acquire the corresponding exclusive transition lease in canonical
   physical-root order, stop new admissions, cancel only queued no-effect work, and wait for every
   dispatched writer to settle or produce an explicit uncertain receipt.
3. Timeout, caller disconnect or shutdown cannot release transition capacity while a writer or
   cleanup syscall remains active. An uncooperative or uncertain writer leaves the root blocked and
   the destructive operation `UNAVAILABLE` or `manual-cleanup-required`; it never authorizes delete.
4. Writer generation changes and destructive transition stages are durable, bounded and
   caller-correlatable. Restart recovery distinguishes proven no-effect, committed, resumable and
   uncertain states without replaying a possible external effect.
5. Multi-root operations sort by the immutable physical authority key before acquiring any lease.
   Alias paths and independently opened root handles converge on the same authority and generation.
6. Only the fully converted writer registry enables recursive cleanup, reset, uninstall or split.
   Unsupported platforms and incomplete writer inventories expose a typed unavailable result with
   no path-string, shell or Node `fs` fallback.

## DELTA

1. Produce a source-hashed inventory of every production writer and its lifecycle owner, including
   agent/workspace initialization, transcript/session append and compaction, plugin storage,
   orchestration manifest/status/output publication, configuration writers and maintenance tools.
   AST and native-language ratchets fail on new unclassified writer call sites.
2. Specify a finite shared-writer lease facade on top of the reviewed native authority identity.
   Define admission limits, canonical multi-root ordering, owner fencing, immutable generation,
   deadline/cancellation behavior, cached close results and environment teardown ownership.
3. Add a bounded durable transition journal with operation ID, request digest, captured root and
   generation, owner token, stage, disposition and evidence retention. Reserve row/byte capacity
   before any effect and fail closed on corrupt, saturated or ambiguous state.
4. Convert each inventoried writer family under real write/read/close tests. A producer that misses
   its stop deadline is generation-fenced from the replacement root and keeps the old root retained.
5. Implement destructive move/quarantine/delete only after the writer ratchet reaches zero. Use the
   descriptor-relative GW-022A facade and durable initial/replacement publication rules; never use
   recursive string-path deletion as a fallback.
6. Prove with real processes: shared writers versus exclusive cleanup in both winner orders;
   process death before and after every transition barrier; moved/replaced ancestors; aliases;
   same path on different mounts; multiple roots in reverse request order; capacity boundaries;
   restart recovery; late writer effects; uncooperative syscall containment; and unsupported target
   behavior. A mutation that removes one writer registration or generation check must fail a named
   regression.
7. Only after two-pass review, implementation review and four-target package qualification may the
   exact unavailable handoff at the native facade and destructive callers be removed.

## Release and operational boundary

Local tests and a host-native artifact do not establish target parity or production quiescence.
Release requires the pinned x86_64/aarch64 glibc/musl artifacts, installed-package probes, exact
Gateway consumer version and operational recovery documentation. No production cleanup or migration
is part of this proposal packet.
