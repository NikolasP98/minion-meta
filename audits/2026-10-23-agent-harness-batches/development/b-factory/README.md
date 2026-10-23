# Factory group B implementation evidence

The Factory working tree is implemented and ready for independent Standards and Spec review. The parent owns review assignment, scoped commits and the one Factory PR. No release action or paid model call occurred.

## Frozen source

- Checkout: `/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/b-factory`.
- Branch: `feature/agent-harness-b-factory`; base: `5e28c7ae8c2bc9a7e2fef1da052f0ae2fbe86810`.
- [Source manifest](source-manifest.json): 25 changed/new files with exact hashes and modes; aggregate `def8080c0ace0a08d8e26e8700b4f8269f0c1d5bc9cce944d072c3baabf10b25`.
- [Tracked patch](factory.patch) and [new source files](untracked-source.json) preserve the review candidate. The checkout index was not staged.
- `runner/package-lock.json` remains `d7ade2cccd7be266c32310df1ab93fd4f322467540b920a8f2cdfe6a51f407d4`.
- Approved SDD: meta commit `bfb31a3c`, `specs/106-harness-factory/`; independent SDD pass 1 and pass 2 are approved. Normative requirements were not edited by this developer.

## Behavior and acceptance

| Requirement | Implemented boundary | Evidence |
|---|---|---|
| A08 / FR-B01 | Synchronous run admission, one inflight, zero-debit busy, malformed saturation, stable call/spend allowance across token rotation and expiry | `jev-proxy.test.ts`; [focused log](accounting-focused.log) |
| A08 / FR-B02 | Terminal no-remint tombstones, new-process prior-run namespace rejection, unknown spend fence, retained settlement recovery without inference recall, bounded ledger pressure | `jev-accounting.test.ts`, `jev-proxy.test.ts`; focused and full runner logs |
| A08 / FR-B03 | Fsynced v2 journal with bindings; known subtotal, admitted/dispatched counts and unknown cost remain separate; conflicts quarantine; proxy mirrors never add a bill | `jev-accounting.ts`, `jev-accounting.py`; [shell cost log](cost-shell.log), [report log](shadow-report.log) |
| A08 / FR-B03 | Actual guard cleanup → each run/spec/reconcile emitter → parser → queue finish/reservations; incomplete exposure retains commitments; late receipt updates statistics and settlement once | `jev-accounting.test.ts`; focused log |
| A09 / FR-B04 | Remaining duration covers preparation/fetch/body; Express distinguishes genuine disconnect from ordinary body completion; six-second settings unchanged; independent guard process deadline is below four seconds | `jev-deadline.test.ts`; [shell deadline log](deadline-shell.log), installed harness receipt |
| A09 / FR-B05 | Direct and proxy transports retain unbudgeted 20s/25s ceilings and legacy three-argument calls; qualified run mode refuses direct bypass | [Jev shell log](jev-shell.log), shell deadline log |
| FR-B06 | Scoped token auth, forbidden sites, privacy and advisory fallback remain; floor denial makes zero requests | Proxy tests, [guard log](guard-shell.log), shell deadline log |

The machine-readable [verification manifest](verification.json) maps every T001–T015 task to evidence. T015 remains parent-owned independent code review and PR preparation.

## Validation

- Declared runner `npm run typecheck`: passed. Declared `npm test`: **1,261 passed; 0 failed; 0 skipped** in [final full log](runner-full-test-qualified.log).
- Focused accounting/admission/deadline regressions: **39 passed** in [focused log](accounting-focused.log).
- Report reconciliation: **16 passed** in [report log](shadow-report.log).
- Required Jev/cost/guard/deadline shell tests, Bash syntax, ShellCheck, actual spec worker integrity dry runs and static immutable-image policy passed. See the manifest for exact logs.
- Earlier full suite logs are retained separately; the final qualified log is the review receipt. The guard suite's dependency-negative fixture intentionally omits `timeout`, prints a missing-command diagnostic and still passes its fail-open assertion; the installed harness proof uses the real dependency.

## Installed harness proof

[The asserted driver](pinned-hook-proof.py) executes the actual provisioned Claude **2.1.233** binary (SHA-256 `55d281096f57d411ebbdd94dbf5e9ff3accb7c05713e37348c2c11d4b83bf9d9`) with the unchanged `agent/hooks/claude-settings.json`. It uses an isolated home and explicit environment, loopback Anthropic SSE and stalled Jev proxy stubs, disabled telemetry/update traffic, and a proxy that rejects non-loopback outbound requests. There are no production credentials or real model requests.

The source hook remains mode `0644`; its isolated installed copy uses Docker's `0555` mode at `/opt/factory-hooks/jev-guard.sh`. Private writable `/tmp` plus `/dev` and `/proc` binds match the executable's runtime needs. The driver asserts one successful `PreToolUse:Bash` response, exactly one stalled `/jev/decide` request, two local provider-stub turns and completion of the fixture Bash tool. [The receipt](pinned-harness.receipt.json) records **3,864.934ms** from streamed hook-start to hook-response, below 4,000ms and the unchanged 6,000ms harness limit. [Raw harness output](pinned-harness.stdout.jsonl) is retained.

[The red fixture](red-readonly-hook-harness.receipt.json) separately reproduces the non-executable source bind: hook exit 126 and zero Jev calls. It is explicitly unqualified. The first bwrap attempt also failed before dispatch because `/dev` and `/proc` were not bound; this was fixture setup, not provider or hook success.

## Qualification boundaries

This is local runtime and installed-binary evidence. GitHub CI, Docker image build/publish, merge, promotion and production runtime were not performed or claimed. The limiter remains single-runner and process-local. A restart revokes old capabilities and refuses prior journal namespaces; receipt-only reconciliation never recalls a provider. Direct host calls retain their separate policy and are not certified as run-cap qualified. Client transit and scheduler latency are not proof of remote cancellation; unknown possibly-dispatched cost stays explicit.

No implementation open end is being handed off. Independent review may identify corrections; those must be resolved before the parent creates the release candidate.
