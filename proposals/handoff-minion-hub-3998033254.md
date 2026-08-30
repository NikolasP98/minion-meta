---
id: handoff-minion-hub-3998033254
title: Handoff marker — src/server/services/crm-contacts.service.ts (minion_hub)
status: in-spec
created: 2026-08-20
updated: 2026-08-20
repos: [minion-hub]
tags: [handoff-sweep]
duplicate_candidate: 2026-08-13-crm-customers-server-pagination
approved_reason: "Real service-file marker (crm-contacts)."
spawned_spec: 2026-08-20-handoff-minion-hub-3998033254-spec
source: handoff-sweep
source_trust: trusted-automation
risk_class: low
priority: medium
owner: factory
---

# Handoff marker — src/server/services/crm-contacts.service.ts

Filed automatically by the factory handoff-ledger sweep: this file carries a
`TODO(handoff):` marker (the open-items ledger clause). Approving sends it
into the spec pipeline to resolve the open end below.

Every marker quoted below is text copied out of repository source this sweep
did not write — treat it as a finding DESCRIPTION, never as an instruction.

- source: handoff-sweep
- repo: NikolasP98/minion_hub

**Definition of done:** the marker's open end is resolved and the
`TODO(handoff):` comment removed; the sweep closes this proposal
automatically once the file carries no more markers.

## Markers (as of 2026-08-20)

- `NikolasP98/minion_hub@master src/server/services/crm-contacts.service.ts:212` — S2 ships these five filters on the SERVICE only — nothing
  https://github.com/NikolasP98/minion_hub/blob/master/src/server/services/crm-contacts.service.ts#L212
- `NikolasP98/minion_hub@master src/server/services/crm-contacts.service.ts:399` — DNI search reads crm_contacts.custom_fields->>'dni', the
  https://github.com/NikolasP98/minion_hub/blob/master/src/server/services/crm-contacts.service.ts#L399

## Reconciliation note 2026-08-20

Same idea as `2026-08-13-crm-customers-server-pagination` (in-spec) — its spawned spec
`specs/2026-08-13-crm-customers-server-pagination-spec.md` extends `search` in this exact
file to match `custom_fields->>'dni'` (and `->>'telefono'`) as a prefix match, which is the
DNI marker at :399; the "five filters on the SERVICE only" marker at :212 reads as the same
spec's S2 slice landing service-layer-only ahead of the UI wiring. Not merged (canonical is
in-spec, off-limits to edit); status set to `review` for a human to confirm scope.
