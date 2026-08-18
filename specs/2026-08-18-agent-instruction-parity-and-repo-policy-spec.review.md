---
spec: 2026-08-18-agent-instruction-parity-and-repo-policy-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-18
---

# Pass 2 correctness review

## Changes made

- Set `status: approved`, `pass: 2`, `updated: 2026-08-18`, and `verdict: approved` because all correctness defects were resolvable from the proposal, repository context, related specs, and operator memory.
- Defined the canonical fleet as the nine ids accepted by `specs/TEMPLATE.md` while retaining the six stable `minion.json` CLI keys and their explicit canonical-id/alias mappings, removing ambiguity without breaking `minion hub|site|plugins` commands.
- Limited instruction-pair conversion to the six proposal-audited child repositories and explicitly excluded `Minion Docs/` and `ai-studio/`, preventing “every repo” from silently expanding beyond the stated audit and CLI scope.
- Clarified that root `AGENTS.md`/`CLAUDE.md` already form the orchestrator pair and that factory/Base are policy consumers and routing targets, not additional instruction-rewrite targets.
- Preserved validated factory-mounted repository additions instead of allowing fleet policy to disable them, following `/memory/MINION/factory/2026-08-18-ac227e10.md`, which records that `FACTORY_REPOS_FILE` can replace built-ins and `REPO_ALIASES` is not the registry.
- Added a composed fleet-plus-extension collision rule and prohibited mounted rows from shadowing canonical ids, aliases, or policy fields so dynamic repositories remain supported without weakening canonical policy.
- Added exact migration behavior for legacy mounted files under `REPO_POLICY_V1`, preventing an opt-in rollout from silently dropping deployment-local repositories.
- Replaced the ambiguous “shared adapter” with compatible adapters over byte-identical checked-in generated artifacts, making cross-repository pinning and hash equality implementable without assuming shared runtime code.
- Defined the canonical hash as excluding its own `contentHash` member, removing a self-referential and therefore unverifiable digest requirement.
- Specified a reusable closed row schema for extension validation while keeping the exact nine-id constraint fleet-only, resolving the conflict between a closed canonical document and dynamic factory rows.
- Defined relative checkout directories and normalized `owner/repo` slugs while excluding absolute roots and secrets, reconciling the registry fields with the out-of-scope machine-local data rule.
- Defined all command keys, `null` for unsupported operations, and the current CLI-compatible non-shell grammar, replacing the ambiguous “argv-safe strings” requirement and avoiding fabricated plugin commands.
- Defined required checks as `{name, appId}` with a positive GitHub App id and permitted an evidence-backed empty array, making check identity compatible with the roadmap while supporting repositories with no required checks.
- Separated offline schema validation from remote branch/check drift verification and expanded evidence to rulesets, recent check runs, workflow triggers, and explicit empty sets, making the branch/check definition of done honest and rerunnable.
- Required branch roles to exist remotely, allowed multiple roles to name one real branch, and required `prBase` to equal a declared branch name, removing ambiguity for single-branch repositories.
- Replaced byte-faithful instruction-relocation language with semantic preservation plus resolved links, because the approved branch corrections and heading normalization necessarily change bytes.
- Scoped stale-memory detection to a leading `<claude-mem-context>` block, citing `/memory/MINION/context-bloat-management.md`, so the checker enforces the known failure class without rejecting ordinary documentation.
- Replaced whole-file literal greps with parsed, marked policy-owned fields and added a passing release-branch prose case, preventing valid `main` mentions from failing the contradiction test.
- Made the gateway policy query explicitly run from a `minion-meta` checkout, avoiding a command that references a nonexistent script from an independent product repository.
- Corrected the plugins definition of done to run only non-null verified commands and accept evidence-backed nulls, removing the invented “build-only/docs check.”
- Distinguished synchronous meta projection checks, product-PR evidence, and scheduled/manual remote auditing, removing the false claim that meta CI can gate independent repositories absent from its checkout.
- Added exact consumer artifact destinations, byte/hash checks, stale-copy refusal, and targeted legacy-map assertions while allowing generated projections, UI metadata, and extension data, making Slice 6 verifiable without impossible blanket grep rules.
- Defined `REPO_POLICY_V1_HASH` for both deployments and required hash absence/mismatch to refuse enablement, making the consumer pin and rollback pair operationally testable.
- Added the root CLI/spec-id vocabulary and mounted-repository compatibility rows to the cross-repo impact assessment, closing two direct routing impact zones omitted by pass 1.
- Replaced the undefined “one full reconciliation interval” with an exhaustive id/alias comparison, one complete scheduled factory reconciliation, and an intervening Base request with timestamped outputs.
- Expanded end-to-end verification to every non-null command, all canonical and extension aliases, exact required-check identities, extension rejection in Base, and byte-identical consumer artifacts, aligning acceptance with the corrected policy model.

## Human flags

None. The corrected spec preserves the proposal’s six-repository instruction scope, the existing nine-id planning vocabulary, and the factory’s documented mounted-repository compatibility without requiring a new product-policy decision.
