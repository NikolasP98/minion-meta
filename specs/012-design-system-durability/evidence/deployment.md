# T025/T026 — Release and deployment receipts

## Pull requests (opened 2026-10-16, America/Lima)

| Repo | PR | Base | Head commit | Scope |
|---|---|---|---|---|
| minion_hub | [#545](https://github.com/NikolasP98/minion_hub/pull/545) | master (production path) | `f9da89de` | Hub implementation + canonical archives |
| minion-meta | [#813](https://github.com/NikolasP98/minion-meta/pull/813) | dev | `0059e9fb2` | tokens/ui/packer + spec 012 evidence |
| minion-site | [#34](https://github.com/NikolasP98/minion-site/pull/34) | dev | `664bdd7` | archives + lint ratchet |
| minion-meta | [#814](https://github.com/NikolasP98/minion-meta/pull/814) | main (release) | `21de8bf2d` | scoped promotion from a clone of main |
| minion-site | [#35](https://github.com/NikolasP98/minion-site/pull/35) | master (production) | `acb0302` | scoped promotion from a clone of master |

Each branch was prepared in an isolated clone of its base; the release PRs are **not** merges of the development branches.

## CI

Recorded below as the hosted checks settle (see the PR pages for the live state).

## Merge

Merges go through the human gate required by `AGENTS.md` for security/data-tagged work: the owner runs `audits/2026-10-16-design-system-durability-handover/merge-all.sh` (meta workspace), which merges only green PRs and echoes the real PR state.

## Production verification

Filled after merge: Vercel deployment id, source SHA, production alias (`hub.minion-ai.org`, `www.minion-ai.org`), EN/ES login/locale smoke, and affected read-only UI smoke.
