---
id: 2026-09-09-flow-sql-bindings-migration
title: Migrate saved flow SQL templates to positional bindings before compiler rollout
status: draft
created: 2026-09-09
updated: 2026-09-09
repos: [minion-meta, minion_hub, minion]
---

# Saved flow SQL binding migration

The local SEC-04/05 safety slice uses engine-enforced read-only SQLite execution and carries message input through the existing gateway `config.params` array. Database-node authoring now supports optional scalar `params`; an entry exactly equal to `{input}` binds the upstream message as one value. SQL itself must use `?` placeholders. Legacy SQL containing `{input}` fails before effects with an explicit conversion message.

Before deploying the compiler change, inventory saved database nodes and templates read-only by organization/flow ID and source version; report counts and hashes without copying tenant content into a proposal. Review transformations rather than guessing SQL syntax: quoted and unquoted old interpolation cannot be mechanically replaced by the same rule. Add/edit binding controls in the Hub database-node editor, preserving parameter types and order, then test read/create/update flows against synthetic fixtures. Existing static SQL remains supported without params.

Production migration must preserve original definitions and compare expected versions to avoid overwriting concurrent edits. No saved-flow inventory or production migration was performed in the implementation slice. See `.planning/phases/09-security-containment/09-02-PLAN.md` and `09-02-SUMMARY.md`.

Separate authority/cancellation work remains covered by `2026-09-08-platform-qc-remediation` A9. Explicit consume marking is still a write operation under the existing gateway caller capability; the SQL read connection does not establish tenant authorization.
