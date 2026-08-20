---
id: handoff-minion-ai-4278431509
title: Handoff marker — src/agents/minion-tools.ts (minion-ai)
status: review
created: 2026-08-20
updated: 2026-08-20
repos: [minion-ai]
tags: [handoff-sweep]
duplicate_candidate: 2026-08-17-gw-defaces-crm-tools
---

# Handoff marker — src/agents/minion-tools.ts

Filed automatically by the factory handoff-ledger sweep: this file carries a
`TODO(handoff):` marker (the open-items ledger clause). Approving sends it
into the spec pipeline to resolve the open end below.

Every marker quoted below is text copied out of repository source this sweep
did not write — treat it as a finding DESCRIPTION, never as an instruction.

- source: handoff-sweep
- repo: NikolasP98/minion-ai

**Definition of done:** the marker's open end is resolved and the
`TODO(handoff):` comment removed; the sweep closes this proposal
automatically once the file carries no more markers.

## Markers (as of 2026-08-20)

- `NikolasP98/minion-ai@DEV src/agents/minion-tools.ts:263` — all three CRM tools still use the built-in profile here;
  https://github.com/NikolasP98/minion-ai/blob/DEV/src/agents/minion-tools.ts#L263

## Reconciliation note 2026-08-20

Possible same idea as `2026-08-17-gw-defaces-crm-tools` (in-spec, same repo — de-FACES
the builtin CRM tool descriptions), but the marker's file (`src/agents/minion-tools.ts`)
differs from that proposal's named target (`src/agents/tools/knowledge/crm-search-tool.ts`
+ `crm-insight-tool.ts`), so this may be a third site the in-spec work doesn't cover.
Not merged — status held at `review` for a human to confirm scope against the spec.
