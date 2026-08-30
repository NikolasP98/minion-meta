---
id: 2026-08-17-pkg-workforce-client-json-error
title: workforce-client throws raw SyntaxError on non-JSON (proxy 502) responses
status: in-spec
spawned_spec: 2026-08-17-pkg-workforce-client-json-error-spec
created: 2026-08-17
updated: 2026-08-17
repos: [minion-meta]
tags: [logic]
value: 5
effort: S
source: debt-sweep-2-2026-08-17
---

# workforce-client throws raw SyntaxError on non-JSON (proxy 502) responses

## Problem

packages/workforce-client/src/client.ts:96-97 JSON.parse runs before the !res.ok check — HTML error pages throw SyntaxError instead of WorkforceApiError.

## Definition of done

Parse wrapped; non-JSON yields WorkforceApiError(status,{raw}); mock-fetch test asserts typed error.

## Out of scope

Retry logic.
