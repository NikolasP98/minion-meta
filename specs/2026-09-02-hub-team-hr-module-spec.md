---
id: 2026-09-02-hub-team-hr-module-spec
title: "Fold /scheduling/resources into /team — an HR-oriented Team module (roster, availability, time off, roles) modeled on NextERP HR"
stage: dev
status: implementing
pass: 1
created: 2026-09-02
updated: 2026-09-03
pr: 229
repos: [minion_hub, minion-meta]
tags: [ui, logic, schema, scheduling, hr]
type: feature
---

# Fold `/scheduling/resources` into `/team` — the HR module

**Owner surface:** `minion_hub` on `master` — `src/routes/(app)/team/*`,
`src/routes/(app)/scheduling/resources/*`, `src/lib/components/scheduling/{AvailabilityEditor,
MemberCalendarStrip}.svelte`, `src/lib/components/users/TeamTab.svelte`,
`src/server/db/pg-scheduling-schema.ts`, `src/server/services/scheduling.service.ts`, the
route-contract surfaces (`route-design-manifest.ts`, `route-design-validation.ts`,
`route-design-contracts.test.ts`, `business-route-shells*.ts`, `scripts/ui-audit-inventory.test.ts`,
`src/server/ui-audit/frontend-contract-scanner.test.ts`, `route-access-registry.ts`,
`components/scheduling/SchedulingNav.svelte`, `components/layout/sections.ts`), and the assistant
site map (`src/lib/assistant/site-map.ts`).

## 0. Product

Owner's words (2026-09-02): *"begin planning a spec for folding scheduling/resources into /team;
the team page is an HR-oriented page for managing internal human resources, such as vacations,
availability, roles, etc."* and *"for the new, revamped /team page, use nexterp's HR module. Look
into its source code and make a reliable and functional MVP with a roadmap."*

Today the hub has two half-pages for the same people:

- `/team` (Organization → Team) = `TeamTab` + `SharedAccountsPanel`: invites, join links, RBAC
  roles per member, shared/service accounts. Gated `capability:users.manage`.
- `/scheduling/resources` (Scheduling → "Team") = the bookable roster: every org member (person
  accounts) mapped to a `sched_resources` row through the `profileId` bridge, enrol/unenrol,
  "vacation" (= `active=false`), per-resource weekly working hours (`AvailabilityEditor` over
  `sched_schedules` + `sched_availability`), a 7-day `MemberCalendarStrip`, plus non-human
  resources (rooms/equipment, `kind != 'staff'`, never linked to a profile).

The product answer: **one `/team` module that is the HR system of record for internal people** —
who works here, in which role, when they are available, when they are off — and scheduling
*reads* from it. `/scheduling/resources` stops being a people page; rooms and equipment stay
in scheduling.

## 1. Reference model — NextERP HR

"NextERP" on GitHub is an ERPNext rebrand (`AltFl0w/NextERP-Deployment` points its
`ERPNEXT_REPO_URL` at an ERPNext fork); the other repos named NextERP have no HR module beyond an
employee CRUD. The HR module is therefore **`frappe/hrms`** (GPL-3.0, Python/Frappe DocTypes,
`develop` branch, active 2026-09-01), with Employee / Department / Designation / Holiday List
living in `frappe/erpnext`. Full source study with verbatim field lists and file paths:
`specs/research/2026-09-02-nexterp-hr-brief.md`.

### 1.1 Entities and their hub disposition (verified against source)

| HRMS DocType (source file) | Fields that matter (verbatim `fieldname`) | Hub disposition |
|---|---|---|
| Employee (`erpnext/setup/doctype/employee/employee.json`) | `status` Select `Active/Inactive/Suspended/Left`, `date_of_joining`, `relieving_date`, `user_id` Link User, `department`, `designation`, `reports_to`, `holiday_list`; HRMS injects `default_shift`, `leave_approver` | **MVP** → `hr_employees` (status `active`/`left`, `joined_on`, `left_on`, `profile_id` = `user_id`, `designation` text, `holiday_list_id`, `resource_id` — no HRMS analogue, ERPNext only links staff to a login) |
| Designation (`designation_name`) · Department (tree, `parent_department`, `leave_approvers`) | | **MVP-lite**: free-text designation; Department tree + department approvers = next |
| Shift Type (`start_time`, `end_time`, `holiday_list`, `color`, thresholds) · Shift Assignment (`employee`, `shift_type`, `start_date`, `end_date`, `status Active/Inactive`) · Shift Schedule (`frequency`, `repeat_on_days`) | | **MVP** — already modelled as `sched_schedules` (named container) + `sched_availability` (weekly `days` + `date` overrides); keep, re-home under the employee. Shift Schedule's weekly `repeat_on_days` = our weekly rule rows |
| Holiday List (`from_date`, `to_date`, `weekly_off`, child Holiday `holiday_date`, `weekly_off` Check, `is_half_day`) | weekly offs are **materialised** as Holiday rows (`get_weekly_off_dates`) so one table answers `is_holiday()` | **MVP** → `hr_holidays` (`date`, `name`, `weekly_off`), same materialisation |
| Leave Type (`max_continuous_days_allowed`, `is_lwp`, `allow_negative`, `include_holiday`, `is_carry_forward`, `maximum_carry_forwarded_leaves`, `applicable_after`) | | **MVP** → `hr_leave_types` with `paid` (= ¬`is_lwp`), `allow_negative`, `include_holiday`, `max_days_per_request`; carry-forward + `applicable_after` = next |
| Leave Allocation (`employee`, `leave_type`, `from_date`, `to_date`, `new_leaves_allocated`, `total_leaves_allocated`) | | **MVP** → `hr_leave_allocations` |
| Leave Application (`employee`, `leave_type`, `from_date`, `to_date`, `half_day`, `half_day_date`, `total_leave_days`, `leave_balance`, `leave_approver`, `status Open/Approved/Rejected/Cancelled`) | | **MVP** → `hr_leave_requests` (`pending/approved/rejected/cancelled`; HRMS's docstatus submit layer is dropped — a status column suffices) |
| Leave Ledger Entry (signed `leaves`, `transaction_type`, `is_carry_forward`, `is_expired`) | balance source of truth in HRMS | **next** — MVP computes balance from allocations − requests; add the ledger when carry-forward/expiry arrives |
| Attendance (`status Present/Absent/On Leave/Half Day/Work From Home`, `shift`, `working_hours`) · Employee Checkin (`log_type IN/OUT`, `time`) | | **next** — manual marks first (POS shift open/close already records who ran the till); check-ins + auto-attendance thresholds = later |
| Expense Claim, Payroll, Appraisal, Training, Recruitment, Onboarding/Separation | | **later / out of scope** |

### 1.2 Business rules to port (from `leave_application.py`, `holiday_list.py`, `employee.py`)

- **Balance** (`get_remaining_leaves`): `balance = total_allocated + leaves_taken(negative) + expired`;
  what may be consumed = `min(balance, days left in the allocation period)`; `leaves_pending_approval`
  = sum of `total_leave_days` where status = Open. Hub: allocated − approved − pending per type
  inside the allocation period; beyond balance is rejected unless `allow_negative`.
- **Day count** (`get_number_of_leave_days`): `date_diff + 1`, −0.5 for a valid half day, minus
  holidays unless `include_holiday`; a request that falls only on holidays is refused.
- **Overlap** (`validate_leave_overlap`): same employee, existing status ∈ {Open, Approved},
  date ranges intersect → refused (half-day-on-same-date exception).
- **Max days** (`validate_max_days`) from Leave Type `max_continuous_days_allowed`.
- **Self-approval** blocked when HR Settings `prevent_self_leave_approval` — hub: an approver
  cannot decide their own request.
- **Probation** (`validate_applicable_after`): a type is usable only `applicable_after` days after
  `date_of_joining` — next, not MVP.
- **Status machine**: Open → Approved | Rejected; Approved → Cancelled reverses the ledger and the
  attendance rows. Hub mirrors with `pending → approved | rejected`, `approved → cancelled`.
- **Holiday resolution** (`get_holiday_list_for_employee`): employee.holiday_list → company default.
  Hub: employee → org default list.
- **Lifecycle** (`validate_status`): `Left` requires `relieving_date` and refuses while active
  employees still `reports_to` the person; linked User is disabled when not Active;
  `validate_active_employee` blocks every transaction for Inactive. Hub: `left` requires `left_on`,
  removes the person from rosters, pickers and the slot engine; history stays.
- **Shift → expected hours** (`get_employee_shift`): active assignment covering the date, else
  `Employee.default_shift`; overlapping assignments refused. Hub: the resource's default schedule
  is the "default shift"; date overrides are the assignment layer.

## 2. Target data model (hub)

Additive migrations only; nothing existing is dropped in this spec.

```
hr_employees        id, org_id, profile_id (→ profiles, unique per org, nullable for non-user staff),
                    party_id (→ parties, the person facet; role "worker" becomes emergent here),
                    resource_id (→ sched_resources, 1:1, created on enrol), designation text,
                    status 'active'|'left', joined_on date, left_on date null,
                    holiday_list_id null, metadata jsonb, created_at, updated_at
hr_holidays         id, org_id, date, name, weekly_off bool
hr_leave_types      id, org_id, code, name, paid bool, allow_negative bool, max_days_per_request int null
hr_leave_allocations id, org_id, employee_id, leave_type_id, period_start, period_end, days numeric
hr_leave_requests   id, org_id, employee_id, leave_type_id, from_date, to_date, half_day bool,
                    days numeric (derived, excludes holidays/weekly off), reason text,
                    status 'pending'|'approved'|'rejected'|'cancelled',
                    decided_by profile_id null, decided_at, created_at
```

- `sched_resources.active` stops meaning "on vacation". Availability for a date =
  weekly rule ∧ ¬holiday ∧ ¬approved leave ∧ `hr_employees.status='active'`. The slot
  engine (`scheduling.service` slot computation) gains one predicate: exclude dates covered by an
  approved leave request of the resource's employee (S3).
- Rooms/equipment keep living in `sched_resources` with `kind != 'staff'` and no employee row.
- The event-type "Assigned team" picker (`ResourcePickerField`, shipped 2026-09-02) keeps
  reading `sched_resources` of `kind='staff'`; after S2 it filters through `hr_employees.status`.

## 3. Target UI — `/team`

`PageShell archetype="collection"`, section nav inside the page (tabs, `SegmentedControl`):

1. **Roster** (MVP) — `DataTable` of employees: name, designation, roles (from `member_roles`),
   availability this week (mini strip), status. Row actions: edit, set left. "+Add" opens the
   Picker primitive over org members not yet enrolled (and a "non-user staff" quick-add that
   creates a party + resource without a hub login).
2. **Availability** (MVP) — the existing `AvailabilityEditor` per employee (weekly windows +
   date overrides), moved verbatim.
3. **Time off** (MVP) — leave requests list with status chips, "+Request" form (employee, type,
   from/to, half day, reason; balance shown live), approve/reject for managers; a month view
   showing who is off.
4. **Holidays** (MVP) — org holiday list + weekly-off days.
5. **Members & access** (existing) — `TeamTab` + `SharedAccountsPanel` unchanged.

`/scheduling/resources` becomes **Rooms & equipment** (non-staff resources only) or a 307 redirect
to `/team` when the org has none — decided in S4 by the characterization audit.

## 4. Slices

| Slice | Scope | Definition of done |
|---|---|---|
| S0 | NextERP source audit → fill §1.1 with verbatim field names; freeze the entity map | brief committed at `specs/research/2026-09-02-nexterp-hr-brief.md` (done 2026-09-02); §1.1 verified |
| S1 ✅ hub #226 `f696097c`, migration applied 2026-09-03 | Schema + services: `hr_*` tables (Drizzle + SQL migration, meta migrations first), `hr.service.ts` CRUD, balance computation, overlap rule, leave→availability predicate; unit tests for balance/overlap/holiday exclusion | `bun run test` green; migration replays on the local QA stack |
| S2 ✅ hub #227 `0f5a066a` | `/team` Roster + Availability tabs: move roster/enrol/strip/`AvailabilityEditor` from `/scheduling/resources`; enrol creates employee + resource in one tx; Picker-based "+Add" | characterization tests for enrol/unenrol/toggle preserved; `/team` gate widened to `scheduling:edit` OR `users.manage` (RBAC registry + nav) |
| S3 ✅ hub #227 | Time off + Holidays tabs; slot engine excludes approved leave; "vacation" kebab action on the old page replaced by a leave request | e2e: approved leave removes that day's slots for the resource; balance decrements |
| S4 ✅ hub #227 + follow-ups #229 `3553a906` (rooms & equipment tab, weekly-off toggle, holiday delete under edit, self-approval UI, members hint) | Retire `/scheduling/resources` for people: route → Rooms & equipment (or redirect); SchedulingNav "Team" → `/team`; route contract counts; assistant site map + `PAGE_KEYWORDS` (`vacaciones`, `permiso`, `horario`, `disponibilidad`) | six/seven count files updated; ui-audit baseline re-pinned; assistant use-cases for "quién está de vacaciones" land on `/team` |
| S4b ✅ (2026-09-04, `feat/team-calendar-polish`) | Calendar polish: TeamNav side menu, roster timeline column (shared day header), Time off calendar on `@event-calendar/core` (month/week/agenda), holidays per country (Nager.Date) with enable/move, weekly off as one recurring rule (`hr_settings`), Employee department + employment type, Settings tab | proposal `2026-09-03-hub-team-hr-tabs-followups` §Calendar polish |
| S5 (next) | Attendance from POS shift open/close; per-employee calendar feed; Departments as an entity; leave ledger; probation | roadmap only |

Each slice is a separate PR off `master`; S1 must merge before S2.

## 5. Out of scope

Payroll, expense claims, appraisals, recruitment, biometric check-in, multi-company. No change to
customer-facing booking links. No deletion of `sched_resources`.

## 6. Verification (end to end)

1. Enrol a member on `/team` → a `sched_resources` row exists with `profile_id`, and the member
   appears in the event-type "Assigned team" Picker.
2. Set weekly hours Mon–Fri 09:00–17:00; request Vacaciones for next Wednesday; approve → the
   public booking page and `/scheduling/bookings/new` show no slots for that resource on Wednesday;
   the balance drops by 1.
3. Add a holiday on Thursday → no slots Thursday, balance unchanged.
4. Mark the employee "left" → gone from Roster default view, picker, and slot engine; past
   bookings still render their name.
5. `/scheduling/resources` (people) URL → redirect or rooms view per S4; `bun run check` 0/0,
   full test suite green, lint:design/lint:tokens clean.

## 7. Open items

- **O1** NextERP field names and rules unverified until S0 (brief pending).
- **O2** `organization_members` / `member_roles` / `profiles` have no CREATE in the monorepo
  (prod-only) — `hr_employees.profile_id` cannot carry an FK in a migration that must replay on an
  empty DB; use a plain uuid + index, enforce in the service.
- **O3** Gate decision: `/team` is `users.manage` today; HR tabs need `scheduling:edit` for
  non-admin coordinators. Proposal: add `hr` module with `hr:view/edit/approve` in
  `rbac.service.ts` (ERPNext-style), map existing admins to all three.
- **O4** Non-user staff (no hub login) — party-only employees; confirm with the owner that these
  exist at FACES (e.g. contractors).
