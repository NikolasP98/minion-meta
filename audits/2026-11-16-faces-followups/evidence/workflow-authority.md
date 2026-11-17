# Local workflow authority excerpt

Read-only record of the active local policy used for these eight specifications.
It does not change the policy or record owner approval.

Source: `.specify/memory/constitution.md`, principle V, lines 36–40.
Source SHA-256: `a9fe397ca7c92e5310f71ad5d375c6d5f8f0d4d07a5b2510624b1f103feda9b0`.

```text
### V. Security and data work keeps human gates
Anything tagged security or data (auth, RBAC, credentials, tenant scoping, production data
mutation, migrations) requires owner approval of the spec before code AND owner merge.
Production data scripts are dry-run by default, reversible (undo in `finally`), run twice,
and assert an invariant rather than a statement count.

```
