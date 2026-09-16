# Required durable wire/profile: independent verification

Root independently passed114 canonical tests, including all46 original cases, with zero skips/unhandled failures, and the strict native package TypeScript check. Root reviewed the additive method, strict response normalizer, nested frozen profile and complete escaped aggregate tests. The independent plan review passed before implementation. No existing validator behavior, input parser, route, store or sender was replaced.

After verifying exact before-images, root adopted only the two qualified canonical source/test files into packages/shared. Active emitted dist, installed dependencies, package metadata and locks remain unchanged. A new complete private artifact must qualify these runtime/declaration additions before any consumer uses them.

`shells.invoke_durable` names an explicit request. The strict response validates version1, required durability, run identity and original timestamp; it does not prove execution or live storage readiness. Input64KiB and outcome-text4KiB policies are separate frozen objects. The aggregate64KiB outcome/receipt wrapper and16KiB admission metadata produce an80KiB logical reservation; receiver transactions have not yet implemented that reservation. Exact worst-escaped query63540bytes fits the selected profile.

Author baseline68failures/46controls is preserved, followed by114green. Accessor/coercion and inherited-field negatives, UTF-8/surrogate limits, safe integer normalization, readonly typing and runtime mutation denial pass. No database, provider, browser or package emission was executed by this child. Exact-site handoffs and D360-16's proposal entry retain receiver/caller/sender/adoption gaps. SDK-01 and AGT-04 remain open.

| Source | SHA-256 |
|---|---|
| `src/gateway/shells.ts` | `c6c9397b63bdaf6a6d61ac868286bd4f59fcd3c0a8b32212ac4eb228564e7fcb` |
| `src/gateway/shells-outcome.test.ts` | `4cc2a9176fc2de80c2e908fa27a317cf01edca6303d17bf1075cd9897f2ba75e` |

Evidence: `/tmp/minion-14-16-2imdqkr6/checks/freeze.json`, `root-tests.log`, `root-types.log`, and `root-adoption.json`.
