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
