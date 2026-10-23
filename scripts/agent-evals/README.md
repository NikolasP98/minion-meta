# Agent evaluation software

This Node 22 ESM toolset implements the approved [F evaluation contract](../../specs/110-harness-evals/contracts/evaluation.md). It does not authorize inference, promote a policy, change a production gate, or deploy anything.

Run `pnpm run test:agent-evals`. CI executes that command explicitly; the root `ci` command includes it too. Tests use private disposable directories, synthetic source trees, ephemeral test Ed25519 keys and a preload that replaces only the real provider module's fetch transport. Every test transport denies external endpoints. The synthetic Hub protocol unit fixture is not A integration evidence. Real A integration requires the reviewed Hub checkout and its actual mounted fixture adapter.

## Fixture trajectory

The checked-in `audits/2026-10-22-agent-use-transcripts/spec/fixtures/smoke-manifest.json` is a preparation template: its zero Hub pins deliberately cannot run. Preparation is an explicit offline source/build probe; it accepts only `software_fixture`/`fixture` and cannot create live authority. With the reviewed A checkout:

```sh
node scripts/agent-evals/prepare.mjs --hub-root /absolute/reviewed/a-chat --template audits/2026-10-22-agent-use-transcripts/spec/fixtures/smoke-manifest.json --out /absolute/private/frozen-fixture-manifest.json
node scripts/agent-evals/run.mjs --manifest /absolute/private/frozen-fixture-manifest.json --hub-root /absolute/reviewed/a-chat --out /absolute/private/fresh-run
node scripts/agent-evals/report.mjs --run /absolute/private/fresh-run
node scripts/agent-evals/run.mjs inspect --run /absolute/private/fresh-run
```

For one owned fresh build followed immediately by the same pinned runner path, use `run.mjs prepare-fixture --template TEMPLATE --manifest /absolute/new-frozen.json --hub-root ABS --out /absolute/new-run`. This command permits only offline software fixtures; it freezes the hello identity before the first reset and cannot admit live inference.

Use a fresh output path. Source commit, lock, adapter, transitive source inventory and fresh build hashes must match. Each selected episode runs `full`, `jev`, `core_discovery` in recorded seeded order. Initial fixture hashes are independently checked against the episode and across all arms. A owns actual sending, context, callback, classifier parsing, sandbox tools and loopback denial. F persists its requests/results/observations and never implements a second tool engine. The smoke selects informational, choice callback, artifact callback and a sandbox mutation with an independent domain receipt. Fixture replies establish software behavior only.

Files/directories are 0600/0700. `events.jsonl` and `receipts.jsonl` are fsynced append-only records with explicit relations. Raw inputs, collected observations and bounded provider bodies live under `raw/`. A missing collection, domain action receipt, provider bill or network boundary makes the arm incomplete. Reports include all attempted work, including failed/canceled/indeterminate work; conflicting IDs quarantine instead of overwriting. Matched comparisons use 10,000 seeded episode-cluster draws, whole total-cost/success ratios, success differences and p95 latency ratios. Undefined zero-success draws are retained as nonfinite mass. Bounded unknown costs use adverse bounds; unbounded unknowns cannot promote. Critical failures veto averages. Human corpus readiness and preregistration are required for quality recommendations.

`inspect` reads local evidence only. `redact --run ABS [--deletion-ref REF]` deletes only listed raw files after retention expiry or an explicit deletion reference; it refuses active writers and retains manifest/receipt/admission/hash/unknown tombstones. It never calls a provider. Registry retention is independent of raw payload retention.

## Corpus and independent labels

```sh
node scripts/agent-evals/corpus.mjs validate --input audits/2026-10-22-agent-use-transcripts/spec/fixtures/corpus
node scripts/agent-evals/corpus.mjs readiness --input audits/2026-10-22-agent-use-transcripts/spec/fixtures/corpus
node scripts/agent-evals/corpus.mjs import --input /absolute/corpus --episode EPISODE --label /absolute/correction.json
```

The 24 examples cover twelve families in English and Spanish and are all `synthetic_software`. Their labels never count toward the governed target of 60 development, 240 holdout, twelve bilingual families and 40 consequential cases. Source-backed human labels require matching episode hash, independent actor/reviewer, rubric, adjudication reference/time and blind-to-screen provenance. Corrections append a revisioned output file and require a new split revision; they never overwrite frozen labels or silently upgrade provenance.

Freeze `split.json` with body/label/content hashes, cluster and leakage-group identities before evaluation. Exact normalized truth/turn hashes detect exact duplicates; curators assign translation/rephrasing groups because hashes cannot detect semantic near-duplicates. Development validation, imports and runs inspect only development bodies/labels. Holdout index metadata is safe to count, but does not certify human labels. Holdout access requires `--holdout --split-sha256 HASH --unblinding FILE` with the frozen split binding and explicit operator/purpose/approval/time record before any holdout body is opened. Record every unblinding; inspected holdout cannot be reused silently for tuning. Readiness of both splits requires separate authorized loading and joint assessment; the development CLI does not open sealed labels to improve its count.

## Screening and complaint reports

`screen.mjs --input FILE --labels FILE` scores deterministic faults and separately typed semantic outcomes before reading gold labels. It preserves semantic abstention. The preregistration fixes review budget, apparently-good controls, seed, severity miss bounds, label revision and stratified uncertainty procedure. Random and priority-plus-control selection record inclusion probabilities. Weighted miss estimates do not label unreviewed/unknown traces good. Independent labels bind the trace source hash, frozen revision, actor/reviewer, adjudication reference/time and independent rubric. `--run` extracts actual receipt-backed traces and raw episode permissions without opening corpus labels; `--semantic FILE` optionally imports frozen source-bound semantic outputs before gold labels are read. Independent labels are supplied afterward; missing controls, labels, provenance or sufficient severity confidence makes the experiment inconclusive. `--feedback FILE` is an explicit optional revisioned E export; it separates factual errors from preference/relevance and never calls Hub.

`complaint.mjs --input FILE --manifest FILE --gateway-root ABS [--labels FILE]` loads C's exact pinned schema from an explicit Gateway checkout or frozen producer artifact. A frozen artifact's commit, lock, schema, exporter and fixture hashes must match the caller's independent manifest pins. C alone owns eligibility. Monotonic revisions extend admitted work; known bills/terminal facts and immutable input/policy/model bindings cannot be replaced. Logical sources and actual attempt IDs deduplicate independently. All actual shadow baseline/gate/suggestion bills remain visible. Forwarded-subset costs are hypothetical and separately labeled; they never count as realized shadow savings. No eligible traffic means `do_not_pilot:no_eligible_traffic`. Missing baseline, unknown cost, independent severity labels, development-selected threshold or sample-supported severity bounds makes conclusions inconclusive. `report.mjs --complaint FILE --manifest FILE --gateway-root ABS` exposes the same complaint summary. No command activates/suppresses delivery.

## Explicit live authority and accounting

Live mode changes inference transport only. Tools remain the same A disposable fixtures. The runner accepts no arbitrary process/JavaScript/business endpoint from a manifest. Profiles use fixed OpenRouter chat/decisions URLs, reject redirects, and make one fetch per admitted attempt with no retry/fallback/replay. Approved versioned input/output prices and the conservative `utf8-bytes-v1` rule bound the exact serialized request (one input token per UTF-8 byte plus 1,024 overhead tokens), output tokens, response bytes and deadline. Unknown/unsupported/zero live exposure rejects before dispatch. Operator prices are assertions under the approved provider contract, not claims of current pricing.

An operator first initializes a **new disposable/local registry** offline:

```sh
node scripts/agent-evals/run.mjs init-budget-registry --root /absolute/new-registry --registry-id UUID --scope-id UUID --owner-ref OWNER --purpose router
```

This exclusively creates `registry.json`, a genesis `budget.jsonl` and prints filesystem identity information. It creates no key, trusted configuration or approval, and cannot overwrite an existing root. Operational initialization is not part of this implementation run.

The operator separately installs a read-only `TrustedOperatorConfigV1` containing that inspected identity, owner, trusted Ed25519 public-key fingerprint, canonical root/metadata/journal paths, genesis digest and permitted immutable scope bindings. A detached approval signs canonical manifest/scope/budget/config hashes, registry/scope IDs, owner, validity interval, approval reference and namespace. Approval/signing tooling is deliberately absent. A manifest's key, `approved:true`, namespace, output directory or new run ID grants no authority.

Only after that separate authorization:

```sh
node scripts/agent-evals/run.mjs --live --manifest /absolute/frozen-live.json --approval /absolute/detached-approval.json --operator-config /absolute/trusted-operator.json --trusted-key /absolute/operator-public.pem --owner-ref OWNER --credential-file /absolute/private/provider-credential --hub-root /absolute/reviewed/a-chat --out /absolute/private/fresh-live-run
```

The credential file is explicit, private and never copied into receipts/stdout. No secret discovery exists. `--budget-journal ABS`, if supplied, only asserts the already configured exact canonical path; it never selects a ledger. Reopen validates existing inode/device identities, genesis/hash chain, private modes and authority, then holds one fixed registry-wide writer lock through settlement. Missing/replaced/truncated/copied/symlinked state rejects without initialization. Namespace aliases share one scope's known spend, outstanding reservations and irreversible retirement marker.

Reservations are fsynced before dispatch. Known bounded response/body/bill evidence is persisted before interpretation; malformed/model-drift replies retain known charges. Lost response, partial body, abort or crash without complete evidence retains unknown exposure and prevents further admission under every alias/run/day. Persisted known responses can settle locally on reopen, without inference recall. Crash locks are never automatically deleted. Overshoots are retained and fence admission. This is a single-host POSIX journal boundary; it cannot protect against an operator who rewrites the trust root and ledger together.

`retire-namespace --operator-config FILE --namespace ID` validates the same identity and fixed lock, resolves an already recorded alias, and appends a permanent scope retirement marker. It cannot create an unknown namespace, erase unresolved spend or reset an alias. There is no unretire, relocation, stale-lock deletion or unfencing CLI. Reconciliation/relocation requires confirming all writers stopped, preserving the entire journal/unknown/retirement records, recording old/new identities and journal digest, and separately installing revised trusted configuration with new approval. Deleting raw runs never resets accounting.

Software tests, exact A/C integration, governed corpus, paid smoke, held-out evaluation, human promotion review, merge and deployment remain separate evidence classes. Implementation/CI performs zero paid requests.

## Revision-1 boundary semantics

`single` means one trial with repeat ID 0 per arm/episode. `all_repeats` means `matched_repeated_trials_v1`: every repeat has its own outcome, bill and latency; the denominator counts successful trials. All repeated trials stay in their episode bootstrap cluster. Matching requires equal repeat IDs, and unsupported estimands reject. Unmatched billed trials remain in arm totals but cannot produce a matched promotion comparison.

Run reports and run-based screening share typed evidence reconciliation. Run, episode, cluster, arm, root, submission, parent and attempt bindings must agree. Financial status comes from durable receipts, never cached result fields. A confirmed successful task may have an unknown bill: execution and billing coverage remain separate, and financial uncertainty blocks a recommendation. Foreign execution lineage cannot prove success. Screen populations deduplicate exact trace IDs, quarantine conflicts, and use unique units for budget, inclusion probability and uncertainty.

Each trial requires one reset and one terminal collection after identical record IDs are deduplicated. Distinct record IDs cannot supersede lifecycle evidence: additional reset/collection records quarantine execution even when their payloads agree. Contradictory failure/cancellation events and provider terminal evidence cannot coexist with qualified success. Multiple provider received or settlement records are also ambiguous. Reports retain independently known bills, use conservative order-independent exposure bounds, and retain critical actions from every valid collection while refusing an ambiguous terminal outcome. The receipt format has no lifecycle revision protocol.

Signed approval is checked before each reservation and after durable admission/dispatch-intent writes, immediately before transport entry. If authorization expires while fsync runs and the transport was provably never entered, a durable `not_dispatched` record retains the reservation history with a zero bill. A possible wire entry retains the conservative unknown fence. Approval renewal and replay never happen automatically.

Raw collection filenames hash opaque episode/arm identities; external IDs never form path components. Every created raw destination is checked against the private raw directory and appears in the retention inventory.

C's enabled/matched/current eligibility observations can evolve at a higher receipt revision. Original source, input, policy, model, attempt and known-bill bindings stay immutable. Accepted historical eligibility fixes the census cohort; current eligibility is reported separately, and current ineligibility blocks a pilot recommendation. Revocation cannot erase the historical logical-source denominator or paid evidence. A known zero bill supersedes an admitted unknown bill without adding a second attempt.

Revision 2 requires pinned global adapter/prepared evidence before execution qualification and rejects contradictory collection completeness. Known billing stays separate from execution. Complaint billing follows monotonic coverage revisions, including equal known amounts and zero, with conservative accounting for conflicts. See `CORRECTIONS-REVISION-2.md` for public CLI red/green evidence and qualification limits.
