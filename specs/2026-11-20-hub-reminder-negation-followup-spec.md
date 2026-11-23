---
id: 2026-11-20-hub-reminder-negation-followup-spec
title: Reminder negation follow-up — agent confirms, asks how to proceed, reports to staff
stage: spec
status: draft
pass: 1
created: 2026-11-20
updated: 2026-11-20
repos: [minion_hub]
verdict: approved
type: feature
tags: [data, ui]
---

# Reminder negation follow-up — agent confirms, asks how to proceed, reports to staff

## 0. Product

When a client answers a reminder with a negation, the appointment moves to Por reconfirmar (spec 134) instead of being cancelled; the agent confirms what it understood, offers another date or not continuing, books a new slot only when the client accepts one, and reports every case to staff. Money and sessions move only by staff action.

The canonical [Spec Kit specification](139-reminder-negation-followup/spec.md) contains AS-IS evidence, TO-BE invariants, DELTA and acceptance scenarios.

## Verification

- Plan: next (`/speckit-plan`) after owner approval.

## Out of scope

Enabling reminders and reconnecting FACES WhatsApp (owner configuration), automatic cancellations or refunds, reminders for staff.

## Human gates

Tagged `data`: the owner approves this spec before code and merges each PR.
