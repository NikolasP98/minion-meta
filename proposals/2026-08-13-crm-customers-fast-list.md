---
id: 2026-08-13-crm-customers-fast-list
title: Make the CRM customer list fast for large orgs
status: rejected
created: 2026-08-13
updated: 2026-08-13
repos: [minion_hub]
duplicate_candidate: 2026-08-13-crm-customers-server-pagination
---

# Make the CRM customer list fast for large orgs

## Problem

Opening /crm/customers with a big customer base is very slow because the browser downloads
every row. We should only fetch what the table shows and let the backend do sorting and
filtering.

## Definition of done

- The customers table requests one page at a time from the server.
- Sorting and filtering happen server-side.

## Out of scope

- Other CRM pages.
