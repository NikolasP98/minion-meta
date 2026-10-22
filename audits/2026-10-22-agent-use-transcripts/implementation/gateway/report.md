# Gateway Slice 10 implementation evidence

Implemented A10 in the isolated gateway clone on `feature/agent-harness-wave1`, based on `6d1cd8836ff7b82d21668c50cc20b9b6d1e79c18`. No commit, push, merge, deployment or live provider/channel operation is part of this evidence.

## Behavior

`TransportSourceProvenance` version 1 carries ordered original provider units. Each unit contains channel, account, raw conversation ID, provider message ID, optional provider edit revision, provider sender/time when present, and exact original text/caption. `MsgContext.SourceProvenance` passes the carrier to typed `message_received.metadata.sourceProvenance`; raw `message_inbound` hooks receive the same units under the same metadata key.

Telegram's ordinary debounce, long-text fragment buffer and media-group buffer preserve original constituents. Existing `channel_post` normalization injects routing sender information, so a local `WeakMap` preserves the original provider post before that normalization. Canonical metadata uses the original post; existing legacy raw/routing fields keep their prior normalized meaning. Provider `sender_chat` is used when supplied and no provider `from` exists. Missing sender information remains absent.

A certified batch has no single provider ID in received-hook metadata: `metadata.messageId` is undefined when multiple source units exist. Legacy `MsgContext.MessageSid` remains for agent routing/dedup compatibility. Watcher adapters must consume the original units in Slice 11 before any cross-hook deduplication claim is made.

Long-text and media-group paths previously bypassed raw hooks. They now capture one raw hook per original unit when a successful buffered flush reaches dispatch. Coalescing order, media selection, routing/access gates and reply delivery remain governed by their existing code.

## Transport support matrix

| Path | Carrier evidence | Certification boundary |
|---|---|---|
| Accepted Telegram ordinary messages/captions | Actual handler → raw hook → context → dispatch → received hook | Account/raw chat/message, exact whitespace/text, edit revision, forum identity tested |
| Telegram debounce | Actual debounce with two source messages | Ordered originals; received batch has no last-ID alias |
| Telegram long-text fragments | Actual fragment buffer plus existing media E2E | Original constituent texts and IDs survive concatenation |
| Telegram media albums | Actual album buffer; stub media download E2E | Caption and empty-text originals remain distinct |
| Telegram channel posts | Actual normalization/handler and existing channel-post tests | Original source sender is retained; synthetic sender is not certified |
| Telegram synthesized callback/native command paths | Callback fixture proves absent carrier | Uncertified; legacy functionality retained |
| Other channel adapters | No provenance producer added | Uncertified; no cross-source guarantees |
| Manual/flow/pluginAction input, including external langgraph-server | No producer or consumer changed | Uncertified; fresh-invocation baseline remains required |

Existing access/update gates can reject an input before it reaches these producers. This matrix does not certify rejected traffic or edited-update handler support.

## Validation

| Evidence | Result |
|---|---|
| `red.txt` | Intended red: 5 carrier failures, 2 uncertified legacy controls passed |
| `green.txt` | Initial 2-file carrier suite passed 7/7 |
| `affected-tests.txt` | 11 affected files passed 128 tests |
| `final-focused.txt` | Final carrier and wired-hook suites passed 15/15, plain forks and sequential files |
| `final-media-tests.txt` | Final existing bot/channel-post and repaired media E2E suites passed 68/68 |
| `check-final.txt` | Earlier full `pnpm check` passed format, `tsgo`, type-aware lint, plugin manifests and capability checks; 57 warnings in unrelated files, 0 errors |
| `final-tree-check.txt` | Final-tree `pnpm check` passed all declared checks; 57 warnings in unrelated files, 0 errors |

The final focused/media runs use the preserved `offline-network.mjs` fetch fallback that throws `OFFLINE_FIXTURE_NETWORK_DENIED`; their intended downloads/provider operations use in-process mocks. They do not prove a real Telegram session or delivery. There was no installed-SDK import mismatch in these executed paths; no dependencies were patched.

The first `tsgo` invocation found the absent generated BAML client. The repository's declared `pnpm baml:generate` resolved that prerequisite without package/lockfile changes. The first full check overlapped a fixture formatting edit and failed formatting; the subsequent full check passed.

The old media E2E fixture failed identically on the implementation and an untouched pinned-HEAD archive: 8 failed, 2 passed. Its harness mocked the wrong `hooks/config.js` path and omitted an explicit agent binding required by existing fail-closed routing. The test-only repair mocks `config/config.js` and declares a fixture main-agent binding. `repaired-media-tests.txt` passed 10/10; the final combined media run passed again. Product routing was not weakened.

## Separate reviews

**Standards:** No unresolved finding in the final source review. Changes are additive typed metadata, small Telegram carriers, focused fixture repair and exact handoff comments. No `any`, type suppression, dependency patches or release actions were added. The media buffer comment was corrected to distinguish preserved coalescing from newly added raw capture.

**Spec:** A10's optional carrier, exact original data, account/raw chat identity and ordered Telegram constituents are implemented. No watcher receipt, classifier, Jev gate or external-flow certification was introduced. Final-tree `pnpm check` passed all declared static/generated gates.

## Handoff

`TODO(handoff)` comments at `src/channels/fire-message-inbound.ts` and `src/auto-reply/reply/dispatch-from-config.ts` identify the planned Slice 11 consumer. Both point to `proposals/2026-10-22-agent-decision-and-proactivity-experiments.md` in minion-meta. The parent must preserve that proposal's implementation ledger: watcher matching is still unwired to canonical originals, so exactly-once matching/classification/delivery is not established by Slice 10.

`source-manifest.json` hashes every owned changed/new source file. `implementation.patch` includes those files and excludes frozen-install wrapper noise under tracked extension `node_modules/.bin` directories.
