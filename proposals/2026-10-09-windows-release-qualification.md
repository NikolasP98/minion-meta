---
id: 2026-10-09-windows-release-qualification
title: Qualify Windows durable delivery and bounded script execution
status: approved
findings: [GW-031, GW-032]
created: 2026-10-09
updated: 2026-10-09
repos: [minion]
tags: [infra, data, test]
---

# Qualify Windows durable delivery and bounded script execution

## AS-IS at qualification start

Full DEV CI at d880c73b fails 63 Windows tests across nine files. The queue lease fencing path reports EPERM, causing delivery leases and downstream routing to fail. The first correction assumed directory open was the failing primitive; native follow-up run38016081384 disproved the adequacy of that correction. Directory-open versus directory-flush failure remains under native diagnosis. Operator recovery separately requires POSIX UID/ownership authority; its successful-mutation tests cannot truthfully run on Windows. Logging fixtures assume Unix device paths and modes. A directory can incorrectly appear to be an empty successful log source on Windows.

The custom-tool runner kills only its immediate child. Reproduction shows a timed-out descendant can retain inherited pipes. Unterminated output can grow its partial-line buffer without a bound, and empty lines consume array memory while counting as zero bytes.

## TO-BE

Delivery checkpoints tolerate only a demonstrated unsupported Windows directory primitive. File sync, writes, renames and genuine permission/I/O errors remain failures. Any change to the initial open-only compatibility rule requires native phase-specific evidence and independent review. Supported-platform operator recovery preserves ownership and no-replay guards; Windows must reject unsupported operator mutations without changing bytes. Logging bounds and cursor identity remain portable; only POSIX-mode assertions are platform-specific.

Custom-tool timeouts terminate the owned process tree and bound waiting on inherited pipes. A failed OS termination is reported explicitly. Captured output accounting includes incomplete and empty lines. Normal tool output, minimal environment, exit codes, temporary-directory cleanup, and input precedence remain intact.

## DELTA

Use an isolated clone and independent source review. Split directory-open and flush error handling, add platform/phase fault tests, and run real Windows queue/routing/cron regressions in PR CI before the full DEV suite. Replace nonportable logging assumptions and reject nonregular log reads. Give scripts an owned POSIX process group or use bounded Windows taskkill, retain a bounded uncertain-termination fallback, and add real process/output regressions.

This is a narrow release-qualification hotfix to existing delivery and resource-bound contracts; a standalone two-pass design spec is bypassed because it adds no new product feature or authority. It must receive independent Standards/Spec review and native Windows CI before release. It must not weaken POSIX ownership validation, invent a Windows UID, suppress broad permission failures, or send provider messages. Broader Windows operator support remains unsupported until an equivalent ACL authority design is approved.

## Parent blast-radius amendment

The detached POSIX script group must be explicitly owned by cancellation. Forward the existing agent tool signal and the approved PR301 lifecycle signal into `runToolScript`; prove pre-abort and live-abort do not leave child effects. The first production release now depends on qualified lifecycle integration. File-level merge compatibility alone is insufficient. At that review point, PR306 remained held until this regression was fixed and reviewed; it is now closed and replaced by PR307.

## Native qualification follow-up

PR306 eddcad9 failed 66 tests across 11 files on actual Windows: queue lease EPERM remains, and the bash timeout test reports unconfirmed tree termination. Operator-authority negative tests and logging bounds passed. The secret scanner independently scans historical commits and flags an old synthetic environment sentinel; preserve PR306 and publish a fresh reviewed branch without weakening the scanner. PR301 merged into DEV at eb40b998 after all hosted checks passed.

The directory-flush hypothesis is supported by [Microsoft FlushFileBuffers access requirements](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-flushfilebuffers) and [libuv Windows filesystem implementation](https://github.com/libuv/libuv/blob/v1.x/src/win/fs.c), but these sources do not replace an exact native probe. Script termination likewise needs resolved executable and bounded error/ancestry evidence before changing behavior.

## Current state

Native probing confirmed that file sync and directory open pass while directory sync returns `EPERM`. The narrowly scoped `153c` correction and the bounded UTF-8 diagnostics at `bde87a` passed source review and focused tests. PR307 replaces closed PR306; its final native Windows job is still running, so native qualification is not yet claimed.
