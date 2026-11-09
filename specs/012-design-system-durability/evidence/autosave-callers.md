# Autosave and save-status caller ledger

Source scope: Hub feature branch, 2026-10-16. Inventory command: `rg -l 'createAutosave|createSaveStatus|saveStatus\.run|peekSaveStatus' src --glob '*.svelte' --glob '*.ts'`. Test files are evidence rather than product callers. All paths below are relative to Hub `src/`.

## Outcome contract

`lib/records/save-status.svelte.ts` distinguishes acknowledged, confirmed rejection, conflict, unknown and acknowledged-with-refresh-pending. HTTP 409 remains conflict; other HTTP 4xx are known rejection; transport/5xx/legacy untyped failure remains unknown. Only known rejection can repeat the captured writer. Acknowledged refresh failure retries its captured read closure. A matching later projection is not a receipt: it never changes unknown into saved.

`lib/records/autosave.svelte.ts` snapshots its writer when the draft is scheduled, captures record plus action-runtime scope, fences dispatch and completion, retires queued edits after a failed predecessor, and never replays an attempted unknown/conflict on blur or unmount. New user edits are distinct operations. Confirmed rejection can revert; unknown/conflict retains the draft. Acknowledged base yields to refreshed authoritative data.

## All six createAutosave hosts

| Host | Captured write identity/payload | Completion and recovery |
|---|---|---|
| `lib/components/scheduling/BookingDetailDrawer.svelte` | booking anchor/API scope/version and notes | Only current booking adopts token; lost/conflicting writes retain notes; Review reads detail; successful notes rebaseline Sheet dirty state |
| `lib/components/scheduling/AvailabilityEditor.svelte` | resource ID, timezone, version, immutable week rules | Current resource only invalidates; failed refresh repairs reads only; resource rotation resets draft without initialization writes |
| `lib/components/team/PeopleView.svelte` | selected employee/version plus designation, department, employment or joined-on field | Four autosaves share status; current selection refreshes; Review reads team data; explicit modal dirty while pending/unresolved |
| `routes/(app)/scheduling/reminders/+page.svelte` | enabled, personalize, inference, from-name; stages/channels direct writes snapshot arrays | HTTP errors retain classification; refresh failure is read repair; Review reads scheduling data |
| `routes/(app)/pos/settings/+page.svelte` | requirement kind/value/version | Current owner only adopts settings/version; Review refreshes under runtime-scope fence |
| `routes/(app)/home/settings/+page.svelte` | agent ID and config-list path plus identity/personality field patch | `config.svelte.ts` opt-in save fences acknowledgment/adoption and separates gateway patch from read repair; legacy manual callers keep their API |

## Direct SaveStatus callers and providers

| Caller | Disposition |
|---|---|
| `lib/components/pos/SellableWizard.svelte` | Captures product IDs, scalar/consumption/tag values; preserves HTTP rejection status; current record guards local completion |
| `lib/components/pos/SellableEditorPage.svelte` | Captures title/product ID; `requireOk` preserves rejection; record fence prevents queued title writes moving to another product |
| `lib/components/settings/BackupsTab.svelte` | Captures JSON body/scope; write and settings refresh separated; old-scope errors ignored |
| `lib/components/channels/ChannelCard.svelte` | Captures server/channel/payload; HTTP classification and read repair; current local owner fences refresh |
| `lib/components/channels/ChannelEditForm.svelte` | Captures onsave function, label and metadata before queue |
| `lib/components/tags/TagOptionList.svelte` | Captures tag scope/value; typed HTTP rejection; current scope fences onupdate/reconciliation; matching read never promotes unknown |
| `lib/components/users/EditableName.svelte` | Captures commit callback/name; boolean false remains unknown; retains draft rather than claiming rollback/rejection |
| `routes/(app)/channels/gmail/+page.svelte` | Captures retention value/runtime scope; typed HTTP failure; old response cannot overwrite newer draft or identity |
| `routes/(app)/stock/items/[id]/+page.svelte` | Captures item/version/body; conflict/unknown block repeat Save; acknowledged failed refresh has read-only repair |
| `lib/records/peek.svelte.ts`, `RecordPeek.svelte` | Context provider/indicator only; uses canonical status and safe retry contract |
| Six hosts above | Shared status providers and direct reminder array writes included in the preceding host table |

## PATCH/version contract and alternate writers

- Browser stock item PATCH: both items-table row patch and stock-detail save send required `expectedUpdatedAt`.
- Browser event-type PATCH: EventTypeEditor sends required version, snapshots payload/owner, adopts actual returned token only while current. Tag follow-up retains existing compound mutation handling.
- Both routes reject missing/malformed version with 400, missing row with 404, stale row with 409 and scoped current record. Service CAS predicate is part of the actual UPDATE.
- Stock archive and scheduling catalog-sync writers advance the same token; internal authoritative service calls deliberately retain optional no-CAS mode.
- `nextWriteTimestamp` advances beyond the prior millisecond even when writes occur in one millisecond. Event-type token comes from UPDATE RETURNING; row and resource links share one transaction.
- No schema migration. Local native PostgreSQL proof runs in isolated random schema in `minion_design_durability_test` on loopback port 54422; it does not touch QA tenant data. The production service paths run against native PostgreSQL transactions, with the organization wrapper injected (not a new RLS claim).

## Evidence

- `lib/records/{save-status,autosave}.svelte.test.ts`: unknown/no replay, conflict, queue retirement, scope fencing, committed read-only repair and authoritative base.
- `lib/components/scheduling/AvailabilityEditor.durability.mounted.test.ts`: real host, initialization silence, acknowledged write plus refresh failure, resource switch during response.
- `lib/components/scheduling/booking-custom-fields.mounted.test.ts`: existing real booking host contract.
- `lib/state/config/config-durability.svelte.test.ts`: gateway acknowledged refresh repair and retired-owner response.
- `routes/api/{stock/items,scheduling/event-types}/[id]/server.test.ts`: required version/status/returned token contracts.
- `server/services/design-durability.sql.integration.test.ts`: five native PostgreSQL tests passed (competing stock writers; event-type stale links/actual token; transactional rollback; alternate archive/catalog writers; foreign/missing safety). Registered in `scripts/qc/native-postgres-manifest.ts` qa-native lane.

Final integrated receipts belong in the feature validation/release ledger. Focused run receipts are retained in `/tmp/design-outcomes-final-tests.log`; a duplicate full svelte-check was canceled for resource contention, with no result claimed.
