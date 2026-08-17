---
id: 2026-08-17-hub-personal-agent-entrypoint-test
title: Direct unit test for loadPersonalAgentForUser (untested layout-load entry point)
status: approved
created: 2026-08-17
updated: 2026-08-17
repos: [minion_hub]
tags: [test]
value: 4
effort: S
source: debt-sweep-2026-08-17
---

# Direct unit test for loadPersonalAgentForUser (untested layout-load entry point)

## Problem

personal-agent.service.ts:282 has real branching (401 throw, dynamic ctx import) called on every authenticated page load, but tests only mock it as a black box.

## Definition of done

Test covers the 401-no-ctx path and the happy delegation path; bun run test personal-agent.service.test.ts green.

## Out of scope

Refactoring the function.
