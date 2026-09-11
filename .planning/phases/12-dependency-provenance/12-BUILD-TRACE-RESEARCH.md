# Hub packaging trace investigation

Status: bounded diagnostics executed; full graph and memory cause unresolved. See [12-BUILD-TRACE-RESULTS.md](12-BUILD-TRACE-RESULTS.md). No build repair admitted. Investigated 2026-09-09 with Node 22.23.2, Bun 1.3.4, adapter-vercel 6.3.4 and nft 1.10.2.

## Verified local evidence

The original Hub dependency lock and the isolated security candidate both compile the application, then fail during Vercel packaging with a default Node heap OOM. This establishes that the original dependency set also fails on the matched source snapshot. It does not prove identical root causes, eliminate every candidate regression, or qualify a release.

| Run | Outcome | Resource evidence |
|---|---|---|
| Candidate, default heap | V8 heap OOM; process exit -6 | Approximately 4 GB V8 heap; log records fatal failure around 412 seconds |
| Candidate, explicit 8 GB heap | Interrupted diagnostic; no OOM reported | SIGTERM at 603 seconds, forced cleanup, exit -9 after 621.3 seconds; observed peak RSS 6,912,072 KiB. A concurrent typecheck affected resource conditions. |
| Original lock, default heap | V8 heap OOM; process exit -6 without cutoff | Fatal OOM around 307.8 seconds; process completed after 394.4 seconds; peak child RSS 5,672,356 KiB; user/system CPU 402.9/111.2 seconds. No concurrent heavy project check was scheduled. |

Both copies left 52 MiB of SvelteKit output and 29 MiB of partial Vercel static output. There is no complete function artifact. The two copies match 2,390 source input files after excluding generated Paraglide output, with digest `35b56b7ba3a37c4124335e78db3c716871270532a85519a62333bb05057b3ba4`. Package/lock identities and the frozen dependency patch are recorded in 12-ADVISORIES.md. Logs and resource JSON are at `/tmp/minion-360-12-01/`; preserve hashes in durable results before removing those temporary artifacts.

Current build is plain `vite build`; CI invokes `bun run build` without a heap override. The application deliberately uses one Vercel function because earlier splitting broke locale-prefixed catchall routing. That comment is a constraint to test, not sufficient proof of current routing behavior.

The installed adapter traces `.svelte-kit/vercel-tmp/index.js` with filesystem-root base. Its manifest is about 151 KiB; the largest generated server chunk, `messages.js`, is about 5.6 MiB and imports `runtime.js`. Installed nft uses the base as its default processCwd, file IO concurrency 1024, glob analysis and unlimited depth. These facts do not prove that the whole filesystem was scanned or that translations caused the OOM.

## Primary upstream evidence

- [nft documentation](https://github.com/vercel/nft/blob/main/readme.md) describes instrumentation hooks, trace reasons, path semantics and diagnostic depth. It also warns that high concurrent IO can contribute to memory exhaustion. Reduced analysis changes what is included; a shorter trace is not automatically a complete deployment.
- [Paraglide issue 104](https://github.com/opral/paraglide-js/issues/104) explains an older limitation of a monolithic message module and discusses emitting separate message modules.
- [Paraglide issue 668](https://github.com/opral/paraglide-js/issues/668) reports shared message chunks across multiple Vite/Rolldown entries. The [2.20.0 changelog](https://github.com/opral/paraglide-js/blob/main/CHANGELOG.md) records generated message-module metadata intended to let Vite 8 remove unused re-exports. This is a reason to investigate the supported migration already scoped in 12-02, not proof it fixes this trace.
- [Adapter changelog](https://github.com/sveltejs/kit/blob/main/packages/adapter-vercel/CHANGELOG.md) records the system-file inclusion repair in 6.3.3 and an immutable-asset cache repair in 6.3.4. [Merged change 15400](https://github.com/sveltejs/kit/pull/15400) identifies the nft upgrade for the former. The installed 6.3.4 is already beyond that change; blindly repeating that upgrade is not a supported diagnosis of this failure.

Upstream pages were reviewed on 2026-09-09. Refresh exact release identities when selecting a repair. No unreleased branch, transitive override, source patch or broad dependency refresh is selected by this research.

## Discriminating experiments

First trace the actual generated `messages.js` with its runtime dependency under a small, bounded child process. Separately trace the generated manifest, then the full function entry. Use the installed library without monkeypatching it. Record input digests, imports, read/resolve categories, trace reasons, file/byte counts, elapsed time, peak RSS and exit/timeout state. Do not execute application handlers or supply real environment values.

A single-module memory failure supports a generated-code/static-analysis investigation. Cheap individual modules followed by graph-wide growth supports an import/glob/concurrency investigation. If neither discriminates, report the uncertainty and request an exact next diagnostic scope. Optional reduced IO concurrency may compare resource behavior while preserving trace semantics; any reduced depth, disabled analysis or excluded path is diagnostic-only and cannot pass the packaging gate.

The child plan must stop before a product repair. A later admitted repair must preserve the emitted dependency/assets closure, EN/ES direct URLs and redirects, locale isolation, SSR/hydration, localized links and static-asset behavior. It must pass full packaging under an explicit supported CI environment. Merely increasing heap, ignoring an input, changing adapters or splitting routes is not evidence of a complete deployment.
