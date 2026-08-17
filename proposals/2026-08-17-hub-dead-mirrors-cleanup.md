---
id: 2026-08-17-hub-dead-mirrors-cleanup
title: Delete satisfied-TODO dead mirrors: local secrets.ts + workspace-membership schema
status: draft
created: 2026-08-17
updated: 2026-08-17
repos: [minion_hub]
tags: [logic, unwired]
value: 5
effort: S
source: debt-sweep-2026-08-17
---

# Delete satisfied-TODO dead mirrors: local secrets.ts + workspace-membership schema

## Problem

src/lib/types/secrets.ts TODO says remove once shared >0.5.0 ships gateway/secrets — hub is on ^0.9.0 and the shared file exists; 4 importers still use the stale mirror. src/server/db/schema/workspace-membership.ts marks itself TEMPORARY, superseded by @minion-stack/db, zero real callers.

## Definition of done

Both files deleted; importers retargeted to @minion-stack/shared / @minion-stack/db; svelte-check green; grep returns no references.

## Out of scope

Any behavior change.
