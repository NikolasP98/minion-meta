---
id: 2026-11-21-hub-calendar-phones-spec
title: Calendar on phones — the calendar takes the screen, one toolbar row, touch that scrolls, and a list view
stage: spec
status: approved
pass: 1
created: 2026-11-21
updated: 2026-11-21
repos: [minion_hub]
verdict: approved
type: feature
tags: [ui]
---

# Calendar on phones

## 0. Product

On a phone the appointments calendar gets 26% of the screen today (48% on the team calendar), a finger on it
draws appointments instead of scrolling, and the summary card needs a mouse. This spec makes the calendar the
main element (at least 78% of the screen), with one toolbar row, a week strip, touch that scrolls, a tap summary
sheet, a list view, and keyboard and screen-reader access. The owner picked option B ("calendar first") with the
list view available and the day view as default.

The canonical [Spec Kit specification](145-calendar-phones/spec.md) has the AS-IS evidence, TO-BE, DELTA,
slices and acceptance scenarios. The [plan](145-calendar-phones/plan.md) has the technical approach.
FigCraft demo: [calendar-phones.figcraft](145-calendar-phones/calendar-phones.figcraft). Interactive preview the owner chose from: https://claude.ai/artifact/EMs9Zhvx4f6AwNuYmQugLm

## Verification

Per the DELTA table in the Spec Kit spec, one hub PR per slice (S1 to S4).

## Out of scope

The sales-history and time-off calendars (a different calendar library), the public booking page, and any
change to booking rules, statuses or permissions.

## Human gates

The owner approves this spec before code and merges each slice PR.
