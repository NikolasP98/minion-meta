# Repository policy baseline — 2026-08-18

This is the Slice 0 evidence lock for
`2026-08-18-agent-instruction-parity-and-repo-policy-spec`. It was collected read-only from GitHub
on 2026-08-18 UTC. The Hub policy owner decision and the authoritative empty-check evidence obtained
during review-fix are recorded below; the resulting Slice 1 registry contains no guessed policy.

## Reproduction commands

All repository observations use the authenticated GitHub CLI and can be rerun without a checkout:

```sh
gh api repos/OWNER/REPO
gh api 'repos/OWNER/REPO/branches?per_page=100' --paginate
gh api repos/OWNER/REPO/commits/BRANCH
gh api repos/OWNER/REPO/git/trees/BRANCH?recursive=1
gh api repos/OWNER/REPO/contents/PATH?ref=BRANCH
gh api repos/OWNER/REPO/actions/workflows?per_page=100
gh api repos/OWNER/REPO/branches/BRANCH/protection
gh api 'repos/OWNER/REPO/rulesets?includes_parents=true'
gh api repos/OWNER/REPO/commits/SHA/check-runs?per_page=100
gh api 'repos/OWNER/REPO/pulls?state=all&per_page=100'
gh api graphql -f owner=OWNER -f name=REPO -f query='query($owner:String!,$name:String!){repository(owner:$owner,name:$name){branchProtectionRules(first:100){nodes{pattern requiresStatusChecks requiredStatusCheckContexts}} rulesets(first:100){nodes{name enforcement rules(first:100){nodes{type parameters{... on RequiredStatusChecksParameters{requiredStatusChecks{context integrationId}}}}}}}}}'
```

For content anchors, the `contents` response's `sha` is recorded below. For branch anchors, the full
commit SHA is recorded. A `404 Branch not protected` plus an accessible empty ruleset response, an
accessible `required_status_checks: null`, or an owner-authenticated GraphQL
`branchProtectionRules.nodes: []` plus `rulesets.nodes: []` is proof of an empty required-check set. A REST `403` is recorded
only as inaccessible and is never itself treated as empty. For the four private repositories affected
by that REST response, the authenticated account is repository owner `NikolasP98` and the GraphQL
query above returned empty nodes for both surfaces. Recent check runs are supporting observations, not substitutes for
protection/ruleset configuration. The Slice 1 remote verifier fails closed whenever its policy surface
is inaccessible rather than converting that condition to `requiredChecks: []`.

## Fleet evidence

| Canonical id | Remote and observed source head | Branch-role evidence | Package/command anchor | Deployment/workflow anchor | Required checks on planned PR base |
|---|---|---|---|---|---|
| `minion-meta` | `NikolasP98/minion-meta`; `dev` at `d5c5d6999505423dc456644cabddcf896072d22a`; remote default `main`; heads `dev`, `main` exist | planned development/PR base `dev`; default/release `main` | `package.json` at `dev`; pnpm 10.15; install `pnpm install`; `dev` unsupported; build/test/check/typecheck projections are `pnpm run build-all`, `pnpm run test-all`, `pnpm run lint-all`, `pnpm run typecheck-all` | `.github/workflows/ci.yml` is PR/push `main`; `.github/workflows/release.yml` is push `main` | empty: `dev` returns `404 Branch not protected`; no repository rulesets; no check runs on the observed head |
| `minion` | `NikolasP98/minion-ai`; `DEV` at `02df8953a920217a2ddede63109d036f23057c29`; remote default `main`; heads `DEV`, `main`, `prd` exist | development/PR base `DEV`; default/release `main`; `prd` is a deployment channel branch, not the package release branch | `package.json` at `DEV`; pnpm 10.29.3; `pnpm install`, `pnpm dev`, `pnpm build`, `pnpm test`, `pnpm check`, `pnpm tsgo` | Docker Release pushes `DEV` and `main`; Deploy Gateway maps `DEV` to dev and `main` to prd; npm publish is a separate release workflow | empty: REST policy surfaces return plan `403`, while the owner-authenticated GraphQL branch-protection query returns `nodes: []`; recent Actions checks use app id `15368` but are not required |
| `minion_hub` | `NikolasP98/minion_hub`; `master` at `7fdc291f88f87c5448a72240af8c8891346d1bff`; remote default `master`; `master` exists and `dev` does not | owner decision: development/default/release/PR base are all `master`; the instruction and dual CI trigger references to deleted `dev` are stale inputs for the later parity slice | `package.json` at `master`; Bun lockfile; `bun install`, `bun run dev`, `bun run build`, `bun run test`, `bun run check`; no separate typecheck script | `.github/workflows/ci.yml` triggers PR/push on `[dev, master]`; deployment is Vercel and current promotion practice lands on `master` | empty: `master` protection has PR reviews but `required_status_checks: null`; no rulesets. Recent checks include `test` and `check-and-build`, app id `15368`, but neither is required by protection |
| `minion_site` | `NikolasP98/minion-site`; `dev` at `c2285b6b0be6d65dd7f10b9c2c86620f8ed5d5ae`; remote default `master`; heads `dev`, `master` exist | development/PR base `dev`; default/release `master`; recent PRs include 6 to `dev` and 10 to `master` | `package.json` at `dev`; Bun lockfile; `bun install`, `bun run dev`, `bun run build`, `bun run test`, `bun run check`; typecheck is represented by `bun run check` | CI triggers only `master`/`main`, not `dev`; Factory Notify exists; Vercel deployment configuration is external to the repository | empty: REST policy surfaces return plan `403`, while the owner-authenticated GraphQL branch-protection query returns `nodes: []`; recent `dev` checks are Vercel Preview Comments (app id `8329`) and `poke` (`15368`) |
| `minion_plugins` | `NikolasP98/minion_plugins`; `main` at `0029b79eadc45d99e742e0d9e1a490d332e9097d`; remote default/head `main` | development/default/release/PR base `main` | no root `package.json` or package-manager lockfile; all command fields unsupported (`null`) | no GitHub Actions workflows | empty: protection requires reviews but has `required_status_checks: null`; no rulesets or recent checks |
| `paperclip` | `NikolasP98/paperclip`; `minion-integration` at `2abd5f7d5c63f8850f6aee989675c0b93e2bd865`; remote default `master`; heads `minion-integration`, `master` exist | development/PR base `minion-integration`; default/release `master`; two observed PRs use `minion-integration` | `package.json` at `minion-integration`; pnpm 9.15.4; `pnpm install`, `pnpm dev`, `pnpm build`, `pnpm test:run`, `pnpm typecheck`; check maps to typecheck | `.github/workflows/pr.yml` triggers only PRs to `master`; release workflows are anchored under `.github/workflows/release*.yml` | empty: `minion-integration` returns `404 Branch not protected`; no rulesets or recent checks |
| `pixel-agents` | `pablodelucca/pixel-agents`; `main` at `3537e140c2094761beae748592aeb92ece8edfdd`; remote default/head `main` | development/default/release/PR base `main` | `package.json` and `package-lock.json` at `main`; `npm install`, `npm run watch`, `npm run build`, `npm test`, `npm run lint`, `npm run check-types` | CI is PR/push `main`; Publish Extension requires a release commit on `main` | `Required Checks`, GitHub Actions app id `15368`; ruleset `13461083` applies to default/main/dev and names that exact context/integration id |
| `minion-factory` | `NikolasP98/minion-factory`; `main` at `a45b225b476db9efffd481dff6bd962be457b549`; remote default/head `main` | development/default/release/PR base `main` | no root package; `runner/package.json` and lockfile; install `npm install`; dev `npm run start`, test `npm test`, typecheck/check `npm run typecheck`; build unsupported | workflow API lists active `ci` at `.github/workflows/ci.yml`, while contents at the anchored commit returns 404; production deploy is host-managed and no additional branch role is declared | empty: REST policy surfaces return plan `403`, while the owner-authenticated GraphQL branch-protection query returns `nodes: []`; no recent checks on the anchored head |
| `minion-base` | `NikolasP98/minion-base`; `main` at `ccc5db78cd7f07ee832ab5cfe04c3b78ad01c4e9`; remote default/head `main` | development/default/release/PR base `main` | `package.json` and Bun lockfile; `bun install`, `bun run dev`, `bun run build`, `bun test`, `bun run check`; check doubles as typecheck | Factory Notify triggers push `main`; deployment is Vercel and its configuration is external to the repository | empty: REST policy surfaces return plan `403`, while the owner-authenticated GraphQL branch-protection query returns `nodes: []`; recent `poke` check uses app id `15368` but is not required |

The intended six legacy CLI projections, to be asserted after the blocker is resolved, are
`minion→minion`, `hub→minion_hub`, `site→minion_site`, `paperclip→paperclip`,
`pixel-agents→pixel-agents`, and `plugins→minion_plugins`.

## Instruction-pair evidence

| Repository | `AGENTS.md` | `CLAUDE.md` | Observation |
|---|---|---|---|
| `minion` | blob `1ceee9319c7e8537267c835081f22f88fcbe2267`, 25,546 bytes | absent at root | canonical content exists; compatibility include is missing |
| `minion_hub` | absent | blob `2b227cebe259661615b865741cad9ef836d0bba4`, 15,263 bytes | provider-specific canonical file names deleted `dev` as policy |
| `minion_site` | absent | blob `b99ffa63bba89e9f9bcc0c2aefce34e26d4fd397`, 5,638 bytes | provider-specific canonical file only |
| `minion_plugins` | absent | absent | both files must be introduced from verified repository facts |
| `paperclip` | blob `52bc6c0a571ad80c4579d6038e63315ff28aa071`, 9,101 bytes | absent | canonical content exists; compatibility include is missing |
| `pixel-agents` | absent | blob `e0b2e05cdc3c51c7ac40b0c1e2a4e34062ed8677`, 69,627 bytes | provider-specific canonical file only |

For comparison, meta's already-correct pair at `dev` is `AGENTS.md` blob
`abcf075b32fdbaf77dea52d572c215ee676f2359` and eleven-byte `CLAUDE.md` blob
`43c994c2d3617f947bcb5adf1933e21dabe46bb5` (`@AGENTS.md` plus newline).

## Contradiction ledger

1. `minion_hub/CLAUDE.md` lines 11–21 say feature branches start from and merge to `dev`, then
   `dev` merges to `master`. The remote has no `dev` head, defaults to `master`, and current factory
   work targets `master`; `.github/workflows/ci.yml` nevertheless still names both branches.
2. `minion/.agents/skills/PR_WORKFLOW.md` exists at blob
   `7e742b8aae410b17c259fe91ae15c034b4b46943`. Lines 98–104, 142–147, 192, 228, and 237 make
   `main` the rebase/landing base even though `minion/AGENTS.md` lines 83–89 define feature work as
   feature branch → `DEV` → `main`. Review precedes prepare/rebase in the named pipeline at lines
   17–18.
3. `minion/AGENTS.md` lines 124–140 identify pnpm as the workspace command path but line 130 also
   calls `bun install` supported. The registry must encode the lockfile/package-manager contract,
   not the alternate prose path.
4. `minion/AGENTS.md` lines 169–170 exempt internal/meta and normally pure-test work from changelog
   entries, while `.agents/skills/PR_WORKFLOW.md` lines 106–115 says a changelog is always required,
   including internal/test-only work.
5. No leading `<claude-mem-context>` block was observed in the fetched root files. The stale-memory
   concern remains a checker requirement for later slices, not a current content finding in this
   anchored set.

## Owner decision

The branch-policy owner chose the observable current Hub contract: `master` is the single
development/default/release/PR-base branch. This agrees with the owner-controlled default branch,
the sole live remote head, current factory routing, and 66 of the latest 100 PR bases. The deleted
`dev` branch is not restored. The stale `dev` clauses in Hub instructions and the redundant CI trigger
are recorded contradiction locations for the later Hub parity slice; they do not redefine Slice 1's
registry. No contradiction remains in the nine rows encoded by `repo-policy.yaml`.
