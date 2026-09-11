---
phase: 11-agent-lifecycle
plan: "01"
verified: 2026-09-09T05:22:57Z
status: gaps_found
slice_status: passed
scope: "defineDrone, runDrone, and default/live unit discovery only"
score: "3/3 slice must-haves verified; global AGT-01/02 remain partial"
requirements: [AGT-01, AGT-02]
requirements_completed: []
phase_complete: false
gaps:
  - truth: "Drone definitions snapshot nested caller-owned configuration before execution."
    status: partial
    reason: "defineDrone passes; separately exported defineStreamingDrone still shallow-copies its definition and aliases model/output objects."
    artifacts:
      - path: drone/src/streaming-schema.ts
        issue: "Lines 79-83 shallow-freeze the outer record; caller mutation changes the admitted model and schema."
    missing:
      - "Plan and implement the streaming-schema admission snapshot, preserving BAML callback identity and TypeBox semantics."
      - "Add mutation-after-admission execution fixtures for the streaming-schema entry point."
  - truth: "The agent deadline contract is tested across the exported execution entry points."
    status: partial
    reason: "runDrone and paid-test isolation pass; runDroneStream and runStreamingSchemaDrone retain unbounded host awaits. A synthetic schema run invoked BAML and returned done after its deadline."
    artifacts:
      - path: drone/src/stream.ts
        issue: "Credential await at line 117 and tool await at line 277 are unbounded; manual anySignal at lines 57-69 retains listeners."
      - path: drone/src/streaming-schema.ts
        issue: "Credential await at line 132, async iterator at line 138 and final response at line 149 lack abort-aware bounds. Checks only run after a partial arrives."
    missing:
      - "Explicit streaming/schema follow-up plan with cancellation, no-new-admission and terminal-state fixtures."
      - "Qualify streaming host cancellation and iterator cleanup without claiming uncooperative effects are killed."
---

# Slice 11-01: Drone admission and caller-wait verification

**Phase goal:** An admitted agent run retains its approved definition, one owner and a recoverable outcome across harness lifecycle changes.

**Slice objective:** Make the existing Drone primitive reproducible at definition admission and bounded at asynchronous host seams without adding a framework or claiming process isolation.

**Result:** The three scoped implementation truths pass. Global AGT-01/02 remain partial because the package also exports streaming entry points outside this plan's files. The `gaps_found` status preserves those requirement-level gaps; it does not identify a failed implementation in the bounded `defineDrone/runDrone` slice.

**Re-verification:** Initial slice verification. The existing `11-VERIFICATION.md` is an open phase-wide sentinel, not a previous behavioral verification of this slice. It remains unchanged.

## Observable truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | Caller mutation cannot replace an admitted model, tool callback or schema field in `defineDrone`. | VERIFIED | `src/define.ts:48` clones before recursively freezing records/arrays. Existing mutation fixture passes. Independent execution probe mutates the original tool callback/schema/model and the real `runDrone` still invokes the original callback using the admitted schema. |
| 2 | Aborted or timed-out `runDrone` calls stop awaiting uncooperative asynchronous hosts and admit no new tools. | VERIFIED | `run.ts:28` abort-aware await is wired to credentials, model resolution, completion and tool execution; the tool loop also checks abort before each admission. Existing timeout/late-resolution tests pass. Independent active-abort/late-rejection/model-resolution probes pass. |
| 3 | Default test selection excludes paid live tests independently of credentials. | VERIFIED | Default config combines Vitest defaults with `**/*.live.test.ts`; live config throws unless `DRONE_LIVE_TESTS=1`. `package.json` maps ordinary `test` and explicit `test:live` to these configs. Root's independently reported discovery used a dummy key and returned 20 unit files, zero live files. No paid tests were run by this verifier. |

**Score:** 3/3 scoped truths. This is not 6/6 phase success criteria.

The first two roadmap criteria map to AGT-01/02. Criteria 3-6 map to Shells admission, durable outcomes, ACP conformance and governance manifests/effects. They were read and remain outside this delegated slice. Their omission here does not remove them from the phase contract; AGT-03/04/05/06 remain pending in the phase-wide verification.

## Required artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `drone/src/define.ts` | Definition snapshot and immutable metadata | VERIFIED | Installed TypeBox `Clone` copies own names/symbols recursively, preserves function identity, and copies Date/RegExp/Uint8Array values. The application freezes copied record/array metadata. |
| `drone/src/define.test.ts` | Mutation and schema compatibility coverage | VERIFIED | Model, fallback, tool callback, parameter schema, output schema and skill arrays are checked against post-admission mutations; original objects remain mutable. |
| `drone/src/run.ts` | Guarded asynchronous admission and wait | VERIFIED | Real implementation exercised with synthetic provider/host seams, without provider transport. |
| `drone/src/run.test.ts` | Async deadline and no-new-tool fixtures | VERIFIED | Credential stall, provider stall, stalled tool with late resolution and pre-aborted admission are behavioral assertions. |
| `drone/vitest.config.ts` | Default paid-test exclusion | VERIFIED | Uses `configDefaults.exclude` plus explicit live-file exclusion. |
| `drone/vitest.live.config.ts` | Deliberate live admission | VERIFIED | Requires exact opt-in before loading live tests. |
| `drone/src/types.ts`, `drone/README.md` | Honest host responsibility | VERIFIED, scoped | Root qualified the docs during review to name `runDrone`. They separate bounded caller waiting, cooperative effect termination and synchronous process isolation. |

The installed GSD artifact verifier returned 3/3 for the plan's listed artifact subset. Those structural checks were supplemented by source and behavioral verification above.

## Key link verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `defineDrone` | `runDrone` | Returned handle's `definition` | WIRED | Execution reads `drone.definition`, then uses its model, schemas and tool map. Independent mutation/execution probe confirms the link. |
| `defineDrone` | TypeBox validation | Cloned schema symbols and nested records | WIRED | Existing `Value.Check` assertions pass. Independent Transform probe preserves `Kind`, Transform Decode callback identity and `Value.Decode("42") === 42`. |
| `runDrone` | Host/provider/tool functions | `awaitWithAbort(() => operation(), signal)` | WIRED | All four asynchronous seams use the helper. A pre-aborted signal prevents the operation callback from starting. |
| `runDrone` | `types.ts` | Imported host/definition/result types and documented guarantee | WIRED, manually verified | GSD's simple key-link parser reported “Target not referenced in source” for the full target path. The actual `./types.js` type import is at lines 13-22. This is a parser false negative, not a missing runtime connection. |
| `package.json:test` | Default config | `vitest run` default discovery | WIRED | Live files are excluded independent of key presence. |
| `package.json:test:live` | Live config | Explicit `--config vitest.live.config.ts` | WIRED | The config itself enforces opt-in. |

Plan-check warning W5 remains useful: the plan's declared key links should include definition admission and default/live discovery, not only runtime-to-types. Actual implementation wiring is present.

## Data-flow trace

Level 4 dynamic-UI tracing is not applicable: this slice supplies library functions and test configuration, not a rendered component. The equivalent value flow was exercised: caller definition → cloned handle → real tool selection/schema validation → original callback → synthetic final assistant result. The result is produced through the actual execution loop, not a static replacement for `runDrone`.

## Behavioral checks

| Behavior | Command or fixture | Observed result |
|---|---|---|
| Focused existing admission/deadline tests | From `drone/`: `node node_modules/vitest/vitest.mjs run src/define.test.ts src/run.test.ts --testNamePattern 'snapshots\|uncooperative\|admits no later\|already aborted'` | 2 files passed; 5 tests passed, 24 intentionally skipped by name filter; Vitest 4.1.8; 760 ms. |
| Actual callback/schema execution after caller mutation | Reproducible probe below | PASS; original callback executes once, replacement never executes. |
| TypeBox transforms/non-JSON boundary | Same probe | PASS; symbol metadata and Decode callback survive; Date copied independently. No claim that internal slots become immutable. |
| External abort during a running tool, then late rejection | Same probe | PASS; result ABORTED, no next tool, no unhandled rejection, zero helper abort listeners after abort. |
| Caller-signal listener cleanup | Same probe | PASS; no manually registered abort listeners remain on the caller signal. Native `AbortSignal.any` handles composition. |
| Uncooperative model resolution | Same probe | PASS; TIMEOUT, zero completion calls. |
| Streaming definition alias and late schema execution | Boundary probe below | CONFIRMED GAP; admitted values follow caller mutation; a 5 ms schema deadline remained pending at 20 ms, then invoked BAML and returned done after credential release. |

Root reported the complete 175-test/20-file unit suite and TypeScript check passed. This verifier did not rerun those broad checks. The independent probes use current source transpiled in memory, the installed TypeBox implementation and synthetic provider/BAML/credential callbacks. They do not make network calls, install dependencies, start services or modify production data.

## Standards and spec review

**Standards:** Pass for the scoped implementation. It reuses the installed schema utility, preserves callback identity, does not add a framework, separates host effects from caller wait, and handles late promise rejection. No new `any`, `@ts-nocheck`, placeholder execution or fake success path was found in the changed slice. The helper removes listeners on synchronous failure and either asynchronous settlement; its once-only abort listener removes itself when aborted.

**Spec:** The three explicit plan truths pass for `defineDrone/runDrone`. Global requirement closure is blocked by the separately exported streaming APIs. Whole Phase 11 remains unverified. Repository and plan chronology concerns recorded in `GSD-PLAN-REVIEW.md` are not repaired by a passing source test.

**Accepted host responsibilities:** Callback closure state is not frozen. Non-JSON schema internals are not a same-process isolation boundary. A tool already executing may continue effects after caller timeout. Synchronous blocking code requires process isolation. These are documented limits, not failed promises of this slice. The credential resolver receives no cancellation signal argument, so it must bound its own work; a returned timeout proves only the caller stopped waiting.

## Requirement coverage and pending scope

| Requirement | Source plan | Status | Evidence or missing boundary |
|---|---|---|---|
| AGT-01 | 11-01 | PARTIAL globally; scoped admission verified | `defineDrone` passes; `defineStreamingDrone` still aliases model/output. |
| AGT-02 | 11-01 | PARTIAL globally; default discovery and `runDrone` wait verified | Streaming generators have not acquired or proved the same deadline/admission guarantees. |
| AGT-03/04/05/06 | Phase 11 roadmap | NOT VERIFIED in this slice | Shells ownership, recoverable outcomes, real pinned ACP and governance/effect fixtures remain phase gates. Do not infer their completion from 11-01. |

No later-phase roadmap criterion specifically covers these streaming gaps at verification time, so they are not filtered out as deferred. The orchestrator is arranging explicit follow-up plans within the agent lifecycle work. A planned follow-up does not make current global AGT-01/02 complete.

## Anti-patterns and exact remaining triggers

| File | Line at verified candidate | Trigger | Severity | Impact |
|---|---:|---|---|---|
| `drone/src/streaming-schema.ts` | 82 | Caller changes model or output after `defineStreamingDrone`. | Requirement blocker | The admitted streaming definition changes. |
| `drone/src/streaming-schema.ts` | 132, 136, 138, 149 | Credentials or iterator/final promise does not settle; credentials later resolve after deadline. | Requirement blocker | Caller wait remains pending; BAML can start after deadline. Empty iterator skips both abort checks and can return done. |
| `drone/src/stream.ts` | 57-69, 117, 277 | Long-lived caller signal or uncooperative credential/tool host. | Requirement blocker | Manual composed-signal listeners and unbounded streaming waits remain outside the repaired helper. |

These paths were sent to the orchestrator for source/proposal handoff coverage. This verifier owns only this report and made no source changes.

## Human verification

None required for the bounded in-process fixture claims. No external provider, real streaming transport, host process termination, deployed package adoption, persisted terminal delivery or production runtime is certified. Those checks belong to explicitly planned acceptance scopes, not a human sign-off invented for these deterministic unit behaviors.

## Candidate identity

Drone HEAD: `0cdf5e6c127cc21c006ad33abf65ba8b9a112171`, dirty shared checkout. HEAD alone does not identify the verified source.

| Path | SHA-256 at verification |
|---|---|
| `src/define.ts` | `565c0e0e0eae131315c73f9b4acb0d8bc408d70043075f63749f302fbb11c9d6` |
| `src/run.ts` | `f0a592bfe0a771fa9936ca1b9379d29a73c9a38c857de83cde7ae910b0b2bdcb` |
| `src/define.test.ts` | `cea340f3a1aee669ce41f0cfb92e9a14cab4b8806c6352b3d373acf73beb58c4` |
| `src/run.test.ts` | `43a9630986045d09d7f1f6790ffc54f17477dc766a644285f45e1cc22928b8d4` |
| `vitest.config.ts` | `5dc0f7c4a54c6d4802d57a04ceb805654f946031cf3ae7dcc4ee3b9e13754d87` |
| `vitest.live.config.ts` | `4ace2ab4687ae781f0131c8d71f43b0a3477934e74208da77c81aec4e72668ca` |
| `src/stream.ts` | `9648021cbad0f04ee8fd89762a7be7b56dc78b53839b8dd95932f8ecabc3d884` |
| `src/streaming-schema.ts` | `0f9ca8eacb8ce074ff79622b2b0d1d341587630d84171bdd85e784b252b30c33` |

## Reproducible independent probe

From the meta-repo root, extract the marked JavaScript block and feed it to Node with cwd `drone/`. It transpiles the actual files in memory and substitutes only external provider/host seams. Its final two assertions intentionally demonstrate current gaps; after repairing those gaps, replace those expectations with rejection/no-admission regressions.

```bash
python3 -c 'from pathlib import Path; t=Path(".planning/phases/11-agent-lifecycle/11-01-VERIFICATION.md").read_text(); print(t.split("<!-- drone-verification-probe -->\n" + "```javascript\n",1)[1].split("\n```",1)[0])' | (cd drone && node)
```

<!-- drone-verification-probe -->
```javascript

const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const assert = require("node:assert/strict");
const { getEventListeners } = require("node:events");
const root = process.cwd();
const realRequire = createRequire(path.join(root, "package.json"));
const ts = realRequire("typescript");
const { Type, Kind, TransformKind } = realRequire("@sinclair/typebox");
const { Value } = realRequire("@sinclair/typebox/value");
let provider = async () => ({});
let completion;
function load(file) {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  const js = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const mod = {exports:{}};
  new Function("require","module","exports",js)((id) => {
    if (id === "@earendil-works/pi-ai") return { complete: (...a) => completion(...a) };
    if (id === "./openrouter-models.js") return {resolveProviderModel:(...a)=>provider(...a)};
    if (id.startsWith(".")) return load(path.join(path.dirname(file),id.replace(/\.js$/, ".ts")));
    return realRequire(id);
  },mod,mod.exports);
  return mod.exports;
}
const { defineDrone } = load("src/define.ts");
const { runDrone } = load("src/run.ts");
const base = {id:"verify-drone",systemPrompt:"fixture",model:{provider:"test",model:"fixture"},timeoutMs:1000};
const host = () => ({resolveApiKey: async()=>({apiKey:"synthetic",source:"test"}),resolveSkillsPrompt:()=>""});
const msg = (content)=>({role:"assistant",content,stopReason:"stop",usage:{input:0,output:0,cacheRead:0,cacheWrite:0}});
const tick = () => new Promise(resolve => setImmediate(resolve));

async function scopedChecks(){
  const decode = value => Number(value);
  const schema = Type.Transform(Type.String()).Decode(decode).Encode(String);
  const ownDate = new Date(1000);
  schema.example = ownDate;
  const toolSchema = Type.Object({input:Type.String()});
  let originalCalls=0,replacementCalls=0,step=0;
  const callback = () => {originalCalls++;return "original";};
  const tool = {name:"fixture",description:"fixture",parameters:toolSchema,execute:callback};
  const def = {...base,tools:[tool],output:undefined};
  const drone = defineDrone(def);
  tool.execute = ()=>{replacementCalls++;return "wrong";};
  toolSchema.properties.input.type = "number";
  def.model.model="mutated";
  completion = async(_m,_ctx,opts) => {
    assert.equal(opts.signal.aborted,false);
    return ++step===1 ? msg([{type:"toolCall",id:"1",name:"fixture",arguments:{input:"value"}}]) : msg([{type:"text",text:"done"}]);
  };
  const result = await runDrone(drone,{prompt:"fixture"},host());
  assert.equal(result.ok,true); assert.equal(originalCalls,1); assert.equal(replacementCalls,0);
  assert.equal(drone.definition.model.model,"fixture");
  const schemaDrone = defineDrone({...base,output:schema});
  ownDate.setTime(2000);
  assert.equal(schemaDrone.definition.output[Kind],"String");
  assert.equal(schemaDrone.definition.output[TransformKind].Decode,decode);
  assert.equal(Value.Decode(schemaDrone.definition.output,"42"),42);
  assert.equal(schemaDrone.definition.output.example.getTime(),1000);
  assert.equal(Object.isFrozen(schema),false);
  console.log("PASS real run uses snapshotted callback/schema; TypeBox transform symbols preserved; Date copied");

  let rejectLate, entered, capturedSignal;
  const enteredPromise = new Promise(resolve=>{entered=resolve;});
  const controller = new AbortController();
  let secondCalls=0;
  completion=async()=>msg([{type:"toolCall",id:"1",name:"first",arguments:{}},{type:"toolCall",id:"2",name:"second",arguments:{}}]);
  const cancellationDrone=defineDrone({...base,tools:[
    {name:"first",description:"",parameters:Type.Object({}),execute:(_args,ctx)=>{capturedSignal=ctx.abortSignal;entered();return new Promise((_r,reject)=>{rejectLate=reject;});}},
    {name:"second",description:"",parameters:Type.Object({}),execute:()=>{secondCalls++;}}
  ]});
  const unhandled=[]; const onUnhandled=e=>unhandled.push(e);
  process.on("unhandledRejection",onUnhandled);
  const running=runDrone(cancellationDrone,{prompt:"",abortSignal:controller.signal},host());
  await enteredPromise;
  controller.abort();
  assert.deepEqual((await running).error.code,"ABORTED");
  assert.equal(getEventListeners(capturedSignal,"abort").length,0);
  rejectLate(new Error("synthetic late rejection")); await tick();
  assert.equal(secondCalls,0); assert.deepEqual(unhandled,[]);
  process.removeListener("unhandledRejection",onUnhandled);
  assert.equal(getEventListeners(controller.signal,"abort").length,0);
  console.log("PASS active external abort returns ABORTED; late rejection absorbed; no next tool; abort listeners removed");

  let resolving;
  const providerEntered=new Promise(resolve=>{resolving=resolve;});
  let completeCalls=0;
  provider=()=>{resolving();return new Promise(()=>{});};
  completion=async()=>{completeCalls++;return msg([]);};
  const waitRun=runDrone(defineDrone({...base,timeoutMs:5}),{prompt:""},host());
  await providerEntered;
  assert.equal((await waitRun).error.code,"TIMEOUT");
  assert.equal(completeCalls,0);
  console.log("PASS stalled model resolver returns TIMEOUT without completing model");

}
async function remainingBoundaryChecks(){
  const {defineStreamingDrone,runStreamingSchemaDrone}=load("src/streaming-schema.ts");
  const model={provider:"test",model:"before"};
  const output=Type.Object({value:Type.String()});
  let invoked=0;
  const streaming=defineStreamingDrone({
    id:"stream-fixture",model,output,timeoutMs:5,
    clientRegistry:()=>({addLlmClient(){},setPrimary(){}}),
    callBaml:()=>{invoked++;return {[Symbol.asyncIterator]:async function*(){},getFinalResponse:async()=>({value:"ok"})};}
  });
  model.model="after"; output.properties.value.type="number";
  assert.equal(streaming.definition.model.model,"after");
  assert.equal(streaming.definition.output.properties.value.type,"number");
  console.log("CONFIRMED GAP defineStreamingDrone aliases caller model and output schema");
  let release;
  const delayedHost=host(); delayedHost.resolveApiKey=()=>new Promise(resolve=>{release=resolve;});
  const iterator=runStreamingSchemaDrone(streaming,{args:{}},delayedHost)[Symbol.asyncIterator]();
  const next=iterator.next();
  const winner=await Promise.race([next.then(()=>"settled"),new Promise(resolve=>setTimeout(()=>resolve("still pending"),20))]);
  assert.equal(winner,"still pending");
  release({apiKey:"synthetic",source:"test"});
  const event=await next;
  assert.equal(invoked,1); console.log(JSON.stringify(event.value)); assert.equal(event.value.type,"done");
  await iterator.return();
  console.log("CONFIRMED GAP streaming-schema exceeds credential deadline, starts BAML afterward and returns done with empty iterator");

}
scopedChecks().then(remainingBoundaryChecks).catch(e=>{console.error(e);process.exitCode=1;});
```

_Verified: 2026-09-09T05:22:57Z_  
_Verifier: Codex (gsd-verifier), independently scoped to 11-01_

