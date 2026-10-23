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

`src/plugins/org-enforcement.ts:36–106` supplies current config/account owner and enabled checks; raw hook filtering is initially checked by hooks.ts:127–147. Durable resumption must repeat these checks; stored context cannot authorize later work. Unscoped local gateway authority is distinct from missing/ambiguous ownership. Configuration ownership changes cannot mint permission to replay old work.

## Qualifications remaining

SDK static result seam is confirmed. Stubbed installed-SDK execution, actual hook/SQLite/queue crash tests, migration/retention, cron lifecycle test, full repo gates and independent code review are implementation tasks. No provider, deployment or runtime success is claimed by this specification. No owner clarification is needed for the refined design; review may identify corrections before code.
