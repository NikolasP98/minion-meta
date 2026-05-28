# Document Ingestion Spec

**Author**: nikolas (drafted by Claude)
**Date**: 2026-05-22
**Status**: DRAFT — for review
**Scope**: Inbound document/attachment understanding across the hub UI chat input AND the channel-side receive path (WhatsApp / Telegram media → agent context).

## Problem

Today, the agent can only "see" inbound attachments when they are **images**:

- `src/gateway/chat-attachments.ts:61` rejects any attachment whose MIME type isn't `image/*`: *"only image/\* supported"*.
- `parseMessageWithAttachments` (same file, L97) produces `ChatImageContent[]` and drops everything else with a warning.
- Channel-side, WhatsApp/Telegram inbound media-message handling has its own receive path I have not yet audited end-to-end — the bot picks up `media.kind` on incoming TG messages, but it's unclear how (or whether) that surfaces into the agent's tool-call context as anything other than a text "received an attachment" stub.

We just shipped the outbound side (`extensions/whatsapp/src/channel.ts` `actions.send` + `whatsapp-actions.ts` `sendMessage`). Inbound is the bigger work — it determines whether a user can DM a PDF and ask "summarize this," or upload a quote XLSX in the hub chat composer and have the agent reason about cell contents.

## Goals

1. The hub chat composer accepts PDF / XLSX / DOCX / TXT alongside images and the agent receives **model-readable content** (not a "file sent" stub).
2. WhatsApp and Telegram inbound media messages flow into the same content pipeline so the agent sees the document content regardless of source.
3. No regression to today's image attachments.
4. No silent loss — if a document type cannot be ingested, the user is told *why* (size, type, format error), not handed silence.

## Non-goals

- OCR for scanned/image-only PDFs (defer to a later phase; flag the limitation).
- Editable interaction with the original file (in-place edits, redlining). Read-only ingestion only.
- Cross-document "RAG" / vector indexing. The agent reads the document fresh in-context; long-term recall is the existing observation pipeline ([[reference_minion_gateway_observation_pipeline]]).
- Voice notes / audio transcripts (separate spec — see voxtype + meeting-recorder thread).

## Design overview

Two ingestion entry points share one **content-extraction layer**.

```
                          ┌────────────────────────────────┐
hub UI chat composer ────▶│  chat.send attachments[]       │──┐
                          │  (existing base64 path)        │  │
                          └────────────────────────────────┘  │
                                                              ▼
                                      ┌────────────────────────────────┐
                                      │  extractDocumentContent(buf,   │
                                      │     {mime, fileName, source})  │
                                      │                                │
                                      │  - image/*  → ChatImageContent │
                                      │  - pdf      → text + (Claude   │
                                      │                native if cfg)  │
                                      │  - docx     → mammoth → text   │
                                      │  - xlsx     → xlsx → CSV text  │
                                      │  - csv/tsv  → passthrough text │
                                      │  - txt/md   → passthrough text │
                                      │  - else     → reject w/ reason │
                                      └────────────────────────────────┘
                                                              ▲
                          ┌────────────────────────────────┐  │
                          │ channel inbound (WA/TG media)  │──┘
                          │ download → buf+mime+fileName   │
                          └────────────────────────────────┘
```

Output of `extractDocumentContent` is a discriminated union extending what `ChatImageContent` is today:

```ts
type ChatDocumentContent =
  | { type: 'image';      mimeType: string; base64: string }
  | { type: 'pdf-native'; mimeType: 'application/pdf'; base64: string }
  | { type: 'text';       fileName: string; sourceMime: string; text: string };
```

`text` is what gets inlined into the user-message body (with a sentinel block like `\n\n=== Attached: report.xlsx ===\n<extracted>\n=== end ===\n`). `image` and `pdf-native` are kept as separate content blocks for the model API (Anthropic supports both as native multipart content; non-Anthropic models receive a text fallback containing extracted text + a note).

### Decision points (need resolution before phase 1)

| ID | Question | Default proposal |
|---|---|---|
| D1 | Native PDF (Claude's built-in PDF support) vs always-extract via `pdf-parse`? | **Both, behind a config flag.** `gateway.documents.pdfMode: "native" \| "extract"`, default `"native"` because it preserves layout/tables for Claude users; routers that fan out to non-Claude models flip to `"extract"`. |
| D2 | Per-attachment size cap | 10 MB raw, 32 MB after expansion (XLSX with many sheets balloons). Reject above and surface to the user as a chat error. |
| D3 | XLSX representation | First sheet as CSV, additional sheets each as a labeled CSV block, capped at 5 sheets / 5000 rows total. Above cap → truncated with a `[truncated: N rows omitted]` marker. |
| D4 | DOCX representation | `mammoth.extractRawText` (plain text); skip image embeds; preserve heading hierarchy with `#` markdown. |
| D5 | Where does extraction run? | **Gateway** for chat.send (already has the buffer in memory). **Channel adapter** for WA/TG inbound (each plugin downloads media then hands buffer to shared extractor). |
| D6 | When a doc fails to parse, how is the user notified? | Inline error reply from the agent runtime: "Couldn't read `quote.xlsx`: <reason>. Try re-saving as CSV." No silent drop. |
| D7 | Hub-UI upload UX — show ingestion preview before send? | Phase 2 nice-to-have. Phase 1 ships blind upload. |
| D8 | Channel inbound — auto-ingest every media message, or require an agent-mention/command? | **Mention-required for groups, auto for DMs.** Groups have noisy media; DMs are intentional. |

## Phase plan

### Phase 1 — Shared extractor + hub-UI path (~1 day)

- New module `src/gateway/document-extract.ts` exporting `extractDocumentContent({buffer, mimeType, fileName})`.
- Add `pdf-parse`, `mammoth`, `xlsx` (or `node-xlsx`) to gateway dependencies. Audit bundle size — these are non-trivial; consider lazy-import.
- Extend `parseMessageWithAttachments` to call the extractor instead of rejecting non-images. Return shape becomes `{ message, images, documents }`; chat.send wires `documents` into the user-message body as text blocks (+ keeps `pdf-native` blocks as native content for Claude routes).
- Update `chat.ts` chat.send handler to flow `documents` through to the agent runtime.
- Tests: round-trip a PDF, an XLSX with 2 sheets, a DOCX, a 12MB PDF (rejected with clear reason), a corrupt PDF (rejected with clear reason).
- Update CLAUDE.md / chat-attachments.test.ts expectations.

**Phase-1 acceptance**: User uploads `quote.xlsx` in hub chat composer → agent's user-message contains a CSV-rendered preview of sheet 1 → agent can answer questions about cell values without any new tool calls.

### Phase 2 — Channel inbound (~2-3 days)

- Audit existing WA/TG inbound media handling. Identify the call site where a downloaded media buffer exists and where the agent's user-message is constructed.
- Each channel adapter calls `extractDocumentContent` and appends the extracted text / native content to the channel inbound payload.
- D8 gating: respect `cfg.channels.<channel>.dmPolicy` for DMs, group-mention check for groups.
- Tests: send a PDF to PANIK number → bot-prd gateway log shows extracted text → agent answers a follow-up question referring to the PDF content.
- Update the relevant channel plugin CLAUDE.md sections.

### Phase 3 — Observability + UX polish (~half-day)

- `gateway.documents.observations: true` → every successful extraction emits an observation in the user's personal-agent observation pipeline ([[reference_minion_gateway_observation_pipeline]]) with `kind: 'document'`, fileName, sourceMime, size. Searchable in `/my-agent` feed.
- Hub-UI composer: show a small chip preview per attachment with extraction summary ("PDF · 12 pages · 4.2 KB extracted").
- Add `gateway.documents.maxBytes`, `pdfMode`, `xlsx.maxSheets`, `xlsx.maxRows` to gateway config zod schema + types.

## Open risks

- **Bundle size**: `mammoth` + `xlsx` are heavy. May need to lazy-import (dynamic `await import()`) so non-document chat sessions don't pay the cost. Verify whether tsdown's chunk-dedupe handles dynamic imports correctly here ([[reference_minion_build_chain_dts_isolation.md]] for prior dts trap).
- **Scanned PDFs**: native-mode passes the PDF as-is; if Claude returns "I can only see images of the document, no text," we should detect that and fallback to an OCR pipeline. Defer to Phase 4.
- **State explosion from auto-onboard strangers**: if a stranger sends a DM with a PDF, the existing personal-agent flow currently skips strangers ([[reference_minion_gateway_observation_pipeline]] notes "null = stranger, SKIP for PR-1"). Document ingestion shouldn't be the thing that forces stranger onboarding — keep the existing skip behavior; the agent simply ignores the media.
- **Encrypted / password-protected docs**: `pdf-parse` and `mammoth` will throw. Catch and surface the password-required error to the user instead of generic "parse failed."

## Out of scope (explicit)

- File output / round-trip editing.
- Document signing / verification.
- Long-term storage of received documents (the receive happens, the buffer lives only as long as the chat turn — no separate archive).
- Cross-document semantic search.

## References

- Outbound (already shipped) — `extensions/whatsapp/src/channel.ts` `actions.send`, `src/agents/tools/messaging/whatsapp-actions.ts` `sendMessage`.
- Existing image-only path — `src/gateway/chat-attachments.ts:97 parseMessageWithAttachments`.
- Personal-agent observation pipeline — [[reference_minion_gateway_observation_pipeline]].
- Build-chain pitfall (lazy-imports) — [[reference_minion_build_chain_dts_isolation]].
- Media loading allowlist (mirror for inbound buffers if we ever cache them on disk) — `src/media/local-roots.ts`.

## Definition of done

Phase 1: user in hub chat can drop in a PDF, XLSX, DOCX, or CSV and the agent responds intelligently about its contents in the SAME turn. Tests cover all four file types + at least three failure cases (oversize, corrupt, encrypted). No regressions to image attachments.

Phase 2: WhatsApp DM with a PDF attachment → agent acknowledges and can answer questions about the doc. Same for Telegram. Group-attachment behavior matches D8 gating.

Phase 3: Document ingestions appear as observations in the user's `/my-agent` feed. Config flags reachable via Settings.
