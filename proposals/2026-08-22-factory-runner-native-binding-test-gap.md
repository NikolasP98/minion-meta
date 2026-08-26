---
id: 2026-08-22-factory-runner-native-binding-test-gap
title: Factory runner native-binding test gap
status: closed
created: 2026-08-22
updated: 2026-08-24
repos: [minion-factory]
tags: [ci, test, npm]
---

# Factory runner native-binding test gap

## Handoff

The focused `runner/src/repos.test.ts` contract test passes, but the full
Factory runner test suite remains partially unverified under Node 22 because
`better-sqlite3` cannot load its native binding (`node-v127-linux-x64`).

## Required follow-up

Restore a supported native build or prebuilt binding in the runner test
environment, then rerun the complete test suite and make the full suite a
passing PR gate. Do not weaken or remove the changed-file Prettier assertion
added for issue #111.

## Resolution

Closed 2026-08-24. npm 12 was blocking dependency lifecycle scripts because
the runner package had no `allowScripts` policy. The runner now pins approval
to the reviewed `better-sqlite3@12.11.1` install script and
`esbuild@0.28.2` postinstall script. A clean Node 22 install produces the
SQLite native binding and the full runner suite passes; the existing
changed-file Prettier assertion remains covered by `runner/src/repos.test.ts`.
