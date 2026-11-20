---
status: shipped
updated: 2026-11-16
overallComplete: true
scopedSoftwareReleaseLive: true
productionGateway: live
---

# Agent-chat fixes — verified live release

**The scoped Hub and Gateway software fixes are live.** Both production gateways run main `834ddc4a6b06433ed1b1c632b5eb3830db595209` on the exact released image, with health passing. The November16 refresh confirms Hub production source `16def9eb10a9c1c7a75c26a11a30733e11e93239` retains the original Hub651 fixes and passes all five bounded read contracts. WhatsApp remains stopped/disconnected on both gateways; this release does not claim universal channel availability.

The released software includes acknowledged memory writes with trusted provenance, cancellation/output guards that prevent replaying a prior answer, booking reschedule/count/reference contracts, stock-entry currency and unit/total parity, and interrupted-effect recovery notices. [release.json](release.json) records exact identities and verification bounds. [The frozen receipt index](release-receipts.json) and `RELEASE-SHA256SUMS` bind the evidence without publishing raw chats, credentials, identities or business rows/counts.

## Production identity and runtime proof

| Boundary | Verified result |
|---|---|
| Normal [PR369 merge](https://github.com/NikolasP98/minion-ai/pull/369) | Main834 at23:04:35Z, ordered parents `[d5856c3dac3f804b9f0b178848971cf8255d9171,5b8ddf031f11f5e6e0a5951f14cc5bd96af92421]`, tree `662144c2d13ce0ffa95ab4b2422fc77c9bacf1dd`. Actual tested virtual merge225 has matching ordered parents and tree. |
| [Production Docker43524329164](https://github.com/NikolasP98/minion-ai/actions/runs/43524329164) | SUCCESS, branch `main`, channel **`prd`**, source834, attempt1, both amd64/arm64 builds. Digest-verified artifact14085350300 and the authenticated manifest consumer bind both child digests to the immutable image below. |
| [Production deploy43525460326](https://github.com/NikolasP98/minion-ai/actions/runs/43525460326) | SUCCESS in all four jobs. The actual workflow-run trigger binds Docker43524329164/attempt1, source834 and channel prd. Digest-verified Swarm artifact14085700896 reports completed update, revision834, exact image, both services1/1, completed update state and matching running digests. |
| Independent SSH runtime | At **2026-11-13T23:22:59Z**, default and FACES each have one container, exact OCI revision834, service image and local RepoDigest matching the release, delivery floor1, core health exit0 and `ok:true`. Container IDs are withheld. |
| Native read-only RPC | At **23:23:24Z**, `channels.status` with `probe:false`, `artifacts.catalog`, `artifacts.mcpTools` and `tools.status` all return exit0 without errors on both gateways. The catalog shows163 methods; that is visibility, not execution of every method or proof of every effective permission. |
| [Install Smoke43524329077](https://github.com/NikolasP98/minion-ai/actions/runs/43524329077) | SUCCESS at source834. The actual `Run installer docker smoke (root + non-root)` step executed successfully. It proves installer Docker contracts, not a newly published core `latest` package. |

The exact production image is:

`ghcr.io/nikolasp98/minion-ai@sha256:de25b7b2e2a9ff87ead09026a8725baf21ca1b3309f36104ec0759f1e0f0659c`

The deployment/controller artifact and independent runtime inspection agree. The anonymous registry request returned401; the private registry's authenticated CI manifest checks and digest-verified release receipt supply publication proof. `production-release-deploy-independent.json` is frozen at SHA256 `f65a420c58477676dad40a78d404b1ef4e6dad62440962b98aca8668709d2067`; the independent runtime and RPC receipts are separate evidence.

Default Telegram and Discord are running. WhatsApp is configured and has a linked flag, but is stopped/disconnected on both services, as observed before this update. Its cause was not re-diagnosed; no QR-relink claim, account reset or relink occurred. Artifact methods are directly callable while not self-advertised in the catalog, matching the pre-update state; this is not evidence of a new catalog regression. No live model/provider call, actual tool mutation, message or business write was used for runtime qualification.

## Source and CI qualification

Normally signed source375 headbdcc, tree 69ad and content set `29e114902c32d77b17f543a7a29203d9eef1218b1135a0f93395b47d10403007` normally merged into DEV as533, ordered parents388/bdcc, matching the reviewed and actual tested virtual tree. Its canonical PR375 head and unique normal-merge graph proof were independently verified. Only four existing proof files changed; six runtime/regression blobs, the retained fixture, ED4/A0c, DEV874, productionB176/EB164, the 21-workflow restoration table and prior native history remain exact. The postEB fence remains thirteen paths, with twelve actual changes.

| Actual full run | Scope and result |
|---|---|
| [DEV43517703754](https://github.com/NikolasP98/minion-ai/actions/runs/43517703754), source533 | Both complete Node partitions:14,119 passed,17 pending, zero failures across 1,440 reported files. Digest-verified reports prove current 88 audit, runtime4 and DEV-workflow52, with zero skips/failures in those groups. Required non-Node jobs, including Android, passed. |
| [Production43522072594](https://github.com/NikolasP98/minion-ai/actions/runs/43522072594), head5b8 | SUCCESS:14 jobs passed,12 scope skips. Both complete Node partitions:14,085 passed,17 pending, zero failures across 1,437 reported files. Current88 audit, runtime4 and main-workflow84 passed with zero skips/failures in those groups. |

The actual B3-to-ED4 transition passed under existing Actions read, Contents read and Metadata read permissions. No Pull requests read permission was added. BAML model steps and the dynamic dependency-audit step remained conditionally skipped; passing CI does not imply coverage of every provider or platform. The source PR's earlier CI-only lane—89 workflow,26 diagnostics and 55 Node script tests—was recorded separately and did not substitute for full DEV qualification.

The normally signed production adoption5b8 preserves parent82be and all history, with exact eleven frozen source blobs. Fresh No Mistakes run `01M7BGSZM6FTXH8RVNRZD1GPWY` passed unchanged5b8, zero findings and 176/176 focused tests; five permanent evidence-file hashes are retained. Its forge PR/CI steps were skipped, so the separate actual GitHub run above provides that proof.

Earlier production CI43513561794 at82be remains a historical overall security/aggregate failure despite passing Node/build/check/protocol subchecks. The helper hid its actual HTTP status; restricted/authenticated real-Git replays diagnosed the transport boundary. New source375 and the fresh production run establish canonical contents-read admission with unchanged permissions. Earlier source373 qualification and publication remain separate retained history.

## Hub and bounded live contracts

At **2026-11-13T23:20:51Z**, `hub.minion-ai.org` resolves to READY production source218; alias, repository/ref and commit metadata agree. Actual Git proof contains original Hub651 merge523 plus44 commits:35 of its original 40 scoped paths are byte-identical, and inspection confirms retention of the fixes in the five later-changed paths. The original 18 checks and tested/actual tree proof remain retained history.

At **23:23:09Z**, after the new Gateway runtime was active, the helper reverified Hub source218 and used the same assigned owner/server/agent/organization identities as before the update. Permissions, catalog, booking options and booking count return200; invalid finance-calendar input returns400. All five bounded contracts pass, including same-statement count/status consistency. Raw and hashed business identities, rows and counts are not published.

These checks qualify actual image/source/health, native WebSocket metadata and authenticated Hub GET contracts. They do not prove a live model conversation, booking mutation, durable memory ingestion, every principal/organization, forced-disconnect UI composition or all effective per-turn permissions. No such business/model actions were performed. The software-live conclusion is bounded accordingly.

## Read-only refresh — 16 November 2026

At **05:09:02Z**, both production gateways still have one replica on the exact834/de25 source/image/RepoDigest, delivery floor1 and passing core health. At **05:11:11Z**, all four native read-only RPCs per service pass. Default Telegram/Discord remain running; WhatsApp remains stopped/disconnected on both services. No channel reset or relink occurred.

Hub READY production source **`16def9eb10a9c1c7a75c26a11a30733e11e93239`** contains original651 plus77 commits, including33 since the previously qualified218. Full Git comparison covers446 changed paths:32 of the original40 scoped files remain byte-identical. Inspection confirms retention of interruption UI/translations, the native contract entry, bypass removal, strict assistant reschedule transaction/guards and booking count query. Later reschedule route changes add masked-principal PII probe denial; other scheduling changes concern accrual/status/general patch bookkeeping. This is scoped retention proof, not an audit of all later Hub work.

At **05:10:48Z**, all five authenticated Hub GET contracts pass on that current source using the same assigned identities. The bounded count read uses **November15 in America/Lima**, with same-statement count/status consistency. No business identities, rows or counts are published. This refresh adds read-only runtime and source-retention evidence; the full source CI runs above remain the dated release qualification. No live model or business-write test was performed.

## Automatic publication and ancillary limit

Normal DEV npm43517703749 published `@nikolasp98/minion@2026.8.7-dev.20261113221619`, tag `dev`. DEV Docker43517703858 succeeded for source533/channeldev/imagebbf0. Main npm43524329040 also succeeded as an automatic job, but its core `Publish(main → latest)` step was **SKIPPED** under the existing version gate for source version `2026.8.7-dev`. No new core latest package or manual version bump is claimed. The owner explicitly authorized normal existing automatic publication; no suppression flag or permission expansion was introduced.

Ancillary [Cloudflare Workers43524329080](https://github.com/NikolasP98/minion-ai/actions/runs/43524329080), source834, failed before deployment:Node20.20.2 versus Wrangler requiring22.12 or newer, with empty account/token bindings in that job. This does not establish that stored configuration is globally absent. The before-benchmark echoes static 42/110 and the after-benchmark was skipped; no live HTTP/model measurement or latency improvement is claimed. This restored old50 workflow is independent of Gateway Docker/Swarm.

[The worker readiness proposal](../../proposals/2026-11-13-cloudflare-worker-deploy-readiness.md) and normally signed [draft PR376](https://github.com/NikolasP98/minion-ai/pull/376), head `1209ac30642d801686a6b2ee825a47ef44f3cac9`, track that separate limit. The draft adds nine handoff comment lines only, preserving executable lines and parsed YAML semantics. It is unmerged and implements no Node, credential, behavior or worker deployment fix. Owner-approved Cloudflare configuration remains separate.

## Immutable history and record publication

The original [README.md](README.md), [qualification.json](qualification.json) and original `SHA256SUMS` remain byte-exact, including their historical pending states. Initial audit figures—24 snapshots,46 classified tuples,162 occurrences,1,781 preserved records and 1,827 resulting records—are historical, not live conversation-quality or current-CI scores. The bounded conversation sample ends November9:three sessions,70 events and five direct candidates. Raw chats/identities remain private; offline guard replay does not establish credential validity, live SDK egress or model quality.

All four signed contracts remain exact:50bf portability, R8cccf current-attempt output,8e95 runner restoration and [19b3 contents-read proof](../../specs/2026-11-13-agent-audit-contents-read-proof-spec.md). Their frontmatter and bytes are not rewritten for release bookkeeping. Prior signed metadata integratione82 and its 19-step CI remain dated integration evidence. [PR998](https://github.com/NikolasP98/minion-meta/pull/998) is the authority for this record's publication and CI; its final delivery receipt is tracked externally, without asserting this record's own future commit or merge.

The bounded Hub/Gateway software release is complete. WhatsApp account availability, the ancillary Cloudflare proposal, business-only mapping, broader calendar-writer policy, remote KG deletion mirroring, historical credential remediation and live model evaluation remain separately tracked. Keep PR375's one-time proof and exact-site `TODO(handoff)` until the independent `fixture-audit-retirement` review under [the existing ledger](../../proposals/2026-11-06-agent-transcript-evals-and-runtime-improvements.md#fixed-d585-runner-restoration).
