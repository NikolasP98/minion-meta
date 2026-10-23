# A20 Gateway and Hub cron binding

## Existing fields and semantics

Use current `cron.add` / `cron.update` fields; no public wire addition. `CronJob.sessionKey` is the origin namespace for reminder delivery/wake routing (`src/platform/cron/types.ts:103`), while isolated execution intentionally uses an agent-owned `cron:<jobId>` session. Preserve this isolation; canonical origin binding and execution session are distinct evidence.

Group D supplies explicit nonempty personal `agentId`, canonical origin `sessionKey`, `scope:'session'`, `sessionTarget:'isolated'`, typed `agentTurn` payload, `delivery:{mode:'none'}` and its exact selected gateway credentials. `delivery:none` alone is not a guarantee against arbitrary downstream tool actions; existing permissions remain. D never uses an implicit default owner, universal scope, or ambient credentials.

## Validation and execution

Add one current-config binding validator callable by actual add/update and execution paths. An explicit nonempty agent ID must match a configured agent after existing ID normalization; unknown/deleted values fail with a safe invalid-binding error, never default. Empty supplied IDs remain invalid schema inputs rather than omission. Explicit null in update retains the current API meaning of clearing an optional field; D never sends it. A supplied canonical session must belong to the effective agent and must not be `global`; cross-agent values reject rather than rewriting to main. General callers with omitted ID retain the current default-agent behavior and valid session aliases. D always sends canonical `agent:<id>:...` form.

At add, validate the effective normalized record before store mutation. At update, validate the merged existing job+patch under the cron store lock, not only fields present in the patch. Reject changing agent while retaining another agent's session. At execution, reload current config and validate explicit binding before workspace/auth/provider/tool setup; repeat on main-system-event and isolated-agent paths, including direct isolated runner entrypoints. Deletion after admission records a failed/skipped invalid-binding outcome and zero provider/tool invocations. Omitted-ID jobs preserve default behavior. Existing explicit invalid jobs are inventoried/reported; do not silently rewrite stored jobs.

Isolated execution uses the validated agent and existing isolated session construction, and preserves the validated origin session on the stored job for routing. Test both against two-agent fixtures; a success receipt's execution session must be in the same agent namespace. `scope:universal` remains a general-cron feature; D rejects it for Pulse. A bound explicit session must still be validated even if universal routing would otherwise discard it. Scheduled acceptance remains distinct from actual execution and cannot promise execution-time user RBAC revocation after generic job acceptance.

## Qualification handoff to D

Produce `cron-binding-v1` verification evidence: Gateway source SHA, build/artifact identity, lock SHA, test command/result and fixture report proving add→store→execute for two agents, unknown/deleted ID zero-dispatch, cross-agent session rejection, agent-changing update rejection, omitted-ID default and `delivery:none`. This local fixture record qualifies code only. D activation additionally requires an operator-managed qualification record bound to exact assigned gateway ID and deployed build/source identity. No new wire capability field is invented; stale/missing/mismatched deployment qualification keeps new Pulse executable admission unavailable. Human deployment verification supplies the record, never a client claim or raw version guess.

C test: `pnpm exec vitest run src/gateway/server-core/server-cron.binding.test.ts` plus existing cron handler/service/tenant-scope/delivery suites. D test: its `pulse-dispatch.worker.test.ts` proves exact credentials/agent/session, no ambient fallback, no announcement, unknown RPC outcome and no replay. Both are required for full A20; C alone does not close the Hub acceptance.
