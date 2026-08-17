---
id: 2026-08-17-gw-msteams-large-upload
title: MS Teams uploads >4MB fail — resumable upload session never implemented
status: approved
created: 2026-08-17
updated: 2026-08-17
repos: [minion]
tags: [logic, edge-case]
value: 6
effort: M
source: debt-sweep-2026-08-17
---

# MS Teams uploads >4MB fail — resumable upload session never implemented

## Problem

extensions/msteams/src/graph-upload.ts:27 TODO — only the simple PUT /content endpoint exists, hard-capped at 4MB by Graph; larger bot attachments error.

## Definition of done

createUploadSession + chunked PUT path taken for >4MB (unit test with mock >4MB buffer asserts the resumable path).

## Out of scope

Download side; non-OneDrive storage.
