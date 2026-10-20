---
id: 2026-10-19-hub-context-menu-and-drop
title: Right-click menus on hub records and one app-wide file drop target
status: draft
created: 2026-10-19
updated: 2026-10-19
repos: [minion_hub]
tags: [ui, ux]
value: 6
effort: M
source: specs/028-hub-app-feel-shell
---

# Context menus and global drop

## AS-IS
`ContextMenu` exists (nested, checkable) and is used on the calendar, sidebar and workshop, but DataTable rows and record cards show the browser's menu on right-click. There is no app-wide drop target: dropping a file outside a specific upload field does nothing.

## TO-BE
Right-click on a table row or record card opens the same actions as its kebab/row actions (with icons, per the context-menu governance rule). Dropping a file anywhere offers where to attach it (current record, inbox, assistant).

## DELTA
DataTable `rowContextMenu` built from existing `rowActions`; a `GlobalDropTarget` in the `(app)` layout routing to registered handlers. Proof: browser right-click on /crm customers and a drop on a record page.
