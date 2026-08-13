---
id: 2026-08-13-crm-customers-server-pagination
title: Wire DataTable server mode for /crm/customers
status: in-spec
created: 2026-08-13
updated: 2026-08-13
repos: [minion_hub]
spawned_spec: 2026-08-13-crm-customers-server-pagination-spec
---

# Wire DataTable server mode for /crm/customers

## Problem

/crm/customers loads the full customer set client-side; at 17k+ CRM rows the page is slow
and memory-heavy. A server-pagination spec already exists
(`specs/2026-08-03-crm-customers-server-pagination-spec.md`) but was never implemented.

## Definition of done

- DataTable on /crm/customers uses server mode (page/size/sort/filter params hit the API).
- Initial payload â¤ 1 page of rows; sorting on the ICP-fit column stays server-side.
- Existing spec's acceptance criteria pass.

## Out of scope

- Any other CRM route; schema changes.
