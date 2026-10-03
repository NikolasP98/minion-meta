---
id: 2026-10-03-readiness-faces-runtime-spec
title: FACES runtime exposure and diagnostic retention
stage: dev
status: implementing
pass: 2
created: 2026-10-03
updated: 2026-10-03
repos: [minion]
tags: [security, test]
type: fix
proposal: 2026-10-02-hub-gateway-production-readiness-recon
verdict: approved
---

# FACES runtime exposure and diagnostic retention

## 0. Product

Address FACES-001, FACES-002 and FACES-004 in the gateway runtime without changing customer data or service authentication. The user authorized every discovered finding.

## AS-IS

Read-only production evidence is recorded in the readiness ledger. A 4.62 GB core
file resides in the gateway state volume; core limits are unlimited. The gateway
18790 published port answers public plaintext HTTP even though the edge route is
restricted. The firewall drops only INPUT traffic, while Docker forwarding uses
DOCKER-USER after destination translation. An explicitly configured persistent
log file has grown to approximately 475 MB and bypasses dated-file pruning.

## TO-BE

- Container entrypoints disable core dumps for the gateway and child processes.
  Existing crash artifacts remain unchanged until their exact reviewed cleanup
  action is approved; no process memory is read as part of this fix.
- Both IPv4 and IPv6 host INPUT and Docker forwarding paths block gateway ports
  arriving at the public interface. Loopback and private proxy traffic remains
  usable. Restart/reload does not deliberately remove the active rules first.
  Missing commands, chains or attachment make verification fail explicitly.
- Every application log path, including an explicit configured file, has bounded
  size and retention. New files use owner-only permissions; old configured-file
  permissions are tightened. Log readers follow rotation without a stuck cursor.
- Integration readiness is distinct from process liveness. Provider outages must
  not cause a Docker restart loop. FACES-003 and FACES-005 receive separate slices
  covering channel and Workforce readiness and controlled service restoration.

## DELTA and proof

1. Disable core dumps in the shipped container entrypoint before invoking any
   gateway process. A disposable child observes soft/hard zero limits; the test
   leaves production and the original checkout untouched.
2. Add idempotent public-interface INPUT and DOCKER-USER conntrack-original-port
   guards for 18789 and 18790 with explicit check mode. Verify required chains are
   attached. Reapply after Docker restart. Stateful command tests cover both
   families, repeated start/restart, missing chains and preserved unrelated rules.
   An external negative probe and local/private positive probe are release gates.
3. Extract bounded-file writing from the logger. Rotate at 50 MiB with five
   archives and owner-only mode, preserve valid JSON lines, bound oversized
   records, and never recurse into logging on I/O errors. Tests exercise the real
   filesystem, already oversized files, retention, permissions and tail reset.
4. Add a narrowly scoped crash-artifact inventory/cleanup procedure that records
   exact file identity and operator approval; no automatic recursive deletion.
5. Run focused tests, affected formatter/typechecks, independent blast-radius
   review and document the image/deployment qualification. The current production
   runtime remains unchanged until the human merge/release gate.

## Blast radius

Node child processes intentionally lose core-file output; normal exit status and
application error reporting remain. The firewall affects only specified TCP
ports arriving on the public interface and preserves Tailscale/loopback paths.
Rotation preserves the active log path used by `logs.tail`, external transports
and console logging. Separate readiness must retain `/health` liveness semantics.

## Out of scope

No production deployment, credential rotation, crash dump inspection or deletion is performed in this source slice. Channel and Workforce readiness are separately tracked FACES-003 and FACES-005.

## Verification

Run the real child-process core limit test, stateful IPv4/IPv6 firewall tests, real-filesystem log rotation and tail tests, then review the affected source and container packaging. Release qualification requires external denial plus private access, bounded disk usage and retained healthy liveness.
