# Gateway source and installed dependency research

## Pins

Gateway `cc150b56b2b0d4396d44b9ef6f14b5d772c52db8`; meta `220a9b9a0a96e950a5c2d986c6c218cd54ab307e`. Gateway frozen install completed exit0 on Node22.23.3/pnpm10.29.3; lock unchanged SHA256 `2fbb2f37e8c7c0cc8c0297eb9e800ff35c39606b9fffaf8c439e6aeb9d968649`. Installed Drone package0.6.0 `dist/types.d.ts` SHA256 `79ea1737f1b5f02251bc4244a34fb8332e5041f547f7d8760cd50e1e0efd97b9`; `dist/run.js` SHA256 `8616e0559081a095a05bdc28e562e25413ebc9f7792e82421b6f64f45f68e79a`. Package signature was read from actual isolated node_modules after frozen install, not a symlink or source package guess.

## Decisions and alternatives

| Decision | Source-backed rationale | Rejected alternative |
|---|---|---|
| Keep merged canonical carrier | hooks.ts:190–216 and Telegram producer carry original units, dispatch:284 forwards them. Watcher itself is not integrated yet. | Rebuilding provenance or treating last batch ID as whole-message identity. |
| SQLite work/recipient receipts | Existing index.ts opens alerts.db and store.ts owns migration. Need negative/failed/unknown results and generation fencing. | New Hub queue/Redis/runtime. |
| Retain queue until caller settlement | deliver.ts supports queueId, required durability and completionPolicy caller; queue-store acknowledgement verifies terminal success. | Direct `sendAlerts` Promise.all with all-recipient boot retry. |
| Per-run result-mode host | Actual Drone success has resolvedModel; failure does not. Its fallback loop may omit earlier failed usage. | Guessing from last resolved credential or changing SDK. |
| Preserve isolated cron session | CronJob.sessionKey is documented origin routing namespace; server-cron uses `cron:<id>` for execution. | Running arbitrary Pulse work in shared origin conversation or inventing a wire field. |
| Default-disabled shadow export | Parent §9.4 requires eligible census and frozen miss bounds first. | Enabling a gate based on no eligible traffic or tiny zero-miss fixtures. |

## Revalidated historical boundaries

Watcher index.ts still marks raw ID/content before provider dispatch and reads received metadata incorrectly; historical defects remain at this source pin. Current WhatsApp `src/web/inbound/monitor.ts:142–189` sends per-original raw hooks, skips member-assistant traffic and does not attach the canonical carrier. This is not Telegram certification and does not authorize new WhatsApp provenance work. External langgraph producer remains outside repository scope. Manual/flow classification retains fresh baseline identity and custom policy behavior.

`src/plugins/org-enforcement.ts:51–97` is deliberately compatibility-first: DB mirror miss falls through to JSON, absent mapping becomes [], and empty ownership enables plugins. It cannot alone authorize certified durable work. The narrow watcher adapter reads `orgScopeSource/getMirrorEntry/mirrorMeta` directly and rejects unavailable/stale/malformed DB evidence; JSON mode requires installed/configured exact account plus explicit owner mapping, including explicit [] for local authority. `channel-mirror.ts:150–164` retains last-good snapshots on empty refresh; the watcher freshness ceiling is the existing five-minute interval, without changing global hydration/channel behavior. Telegram account enumeration synthesizes default (`src/channels/telegram/accounts.ts:53–62`), so enumeration alone is not account evidence. Stored context cannot authorize later work.

## Revision 1 source checks

- C1-01: `server-methods/cron.ts:72,91` normalizes before schema checks; `platform/cron/normalize.ts:311–338` deletes blank bindings. `service/ops.ts:141–147` mutates a stored job via applyJobPatch before persistence; `service/jobs.ts:345–441` omits scope. Contract now specifies raw presence rejection, candidate-copy validation before replacement and existing scope persistence, with actual RPC/store/reload tests.
- C1-02: watcher manifest root/classifier schema has additionalProperties:false; `plugins/loader.ts:435–479` rejects invalid config before registration; watcher resolveConfig has no experiment field. Exact optional complaintExperiment.mode is now owned in manifest and resolved config and must pass actual loader tests.
- C1-03/C2-02: queue type/parser and recovery lack an expiry contract. Persisted opt-in callerRetention binds existing receipt/namespace and fixed deadline, enforced under the existing lease before generic recovery and each actual provider invocation. Tombstone precedes raw cleanup. Generic recovery is tested before/without plugin startup, not after prearranged cleanup.
- Provider-success crash audit: `deliver.ts:1095` checkpoints in-flight before provider dispatch; `delivery-queue-store.ts:129–191` writes under generation/lease and `delivery-queue-files.ts:327–370` fsyncs/renames. On restart store:219–239 converts in-flight to uncertain and recovery:144–153 withholds it. Existing machinery is sufficient for that crash window; require subprocess proof, no new queue/service.
- C2-03: watcher index:788–800 inserts pending reply after any delivery, store:38–57 blindly inserts, and handle-reply:43–73 consumes it. Add a nullable unique receipt binding to the existing table and settle one reply/cooldown with first-sent receipt before queue ack; frozen acceptedAt-based window survives recovery. Include all complaint/reply raw copies in retention.
- Precision: installed Drone invocation may include hidden fallback requests; the exported attempt ID names that admitted invocation. Event emitter:120–142 is best effort, so a durable receipt followed by an emission crash can omit analytics. Receipt export remains authoritative; no global outbox or exactly-once analytics claim.

## Qualifications remaining

SDK static result seam is confirmed. Stubbed installed-SDK execution, actual hook/SQLite/queue crash tests, migration/retention, cron lifecycle test, full repo gates and independent code review are implementation tasks. No provider, deployment or runtime success is claimed by this specification. No owner clarification is needed for the refined design; review may identify corrections before code.
