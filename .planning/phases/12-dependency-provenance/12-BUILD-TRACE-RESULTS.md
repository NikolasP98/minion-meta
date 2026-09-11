# Hub build trace results

Status: bounded diagnostic completed; full graph and packaging cause unresolved. No repair or dependency candidate admission. Recorded 2026-09-09.

## Outcome

The generated translation module costs substantial CPU to trace, but its isolated dependency closure completes at about 218 MiB sampled RSS. This experiment does **not** reproduce its suspected role as the cause of the whole-build OOM. The manifest and complete entry both attempt outside-root metadata probes and stop before those probes are performed. Neither has a complete trace, so graph-wide memory growth, glob expansion and IO concurrency remain unresolved hypotheses.

Original-lock and candidate full builds previously both reached Vercel packaging and exhausted the default heap; the candidate 8 GiB diagnostic was interrupted, with its unbounded outcome unknown. Those full-build facts remain in [12-ADVISORIES.md](12-ADVISORIES.md). These small traces neither replace that gate nor justify shipping the security candidate.

## Executed traces

All runs used the installed nft 1.10.2, filesystem-root `base` and `processCwd`, default analysis, and IO concurrency 1024. Each had a parent-enforced 60-second deadline and 2048 MiB Node heap ceiling. CPU is the child's cumulative resource usage; RSS is the parent's sampled Linux VmHWM and can differ slightly from the child's self-reported maxRSS. Counts are logical successful read-hook calls, including cached repeats, not physical disk IO.

| Entry and output directory | Outcome | Parent elapsed | Sampled peak RSS | CPU user / system | Read calls / bytes | Completed file closure |
|---|---|---:|---:|---:|---:|---|
| messages.js, `messages-cached-01` | complete | 53.878 s | 223,556 KiB | 47.308 / 7.241 s | 3 / 5,811,841 | 4 files, 5,818,842 bytes |
| manifest.js, `manifest-cached-stop-01` | blocked before outside stat | 2.278 s | 156,952 KiB | 3.391 / 0.353 s | 1,583 / 8,140,614 | unknown |
| index.js, `entry-cached-01` | blocked before outside stat | 0.465 s | 76,136 KiB | 0.359 / 0.161 s | 1 / 1,206 | unknown |

The messages closure contains `messages.js`, `runtime.js`, `rolldown-runtime.js` and the artifact's package.json. nft records initial/dependency/resolve reasons and zero warnings. The generated messages chunk is byte-identical in the baseline and candidate build copies: SHA-256 `a9d9bcff5797ad43acc3273a6f21534eb0e8e94cea57e2b6403ff35342c79334`. Only the candidate artifact was traced; do not describe this as two independently traced graphs.

The successful messages run used the cached-IO implementation before the final guard-stop and hash-journaling refinement. Its artifact/input/result hashes are retained below, but that run did not embed a contemporaneous harness digest. This limits exact final-harness replication evidence. The final manifest and entry runs embed the final harness and manifest digests. A later admitted rerun can refresh the single-module result without altering product code.

## Boundary evidence

The manifest stops on the SHA-256 of `/minion/setup/setup.sh`, `78507898a2454442eeb196ebe1900604f6f3355f58990661b00f82693b2880d5`. The compiled provision service contains `path.resolve(process.cwd(), '../minion/setup/setup.sh')`; with the adapter's filesystem-root processCwd this resolves to that exact string. This is consistent with the setup-script fallback being the probe source. The journal's last event is the blocked stat; no outside file content or metadata is read by that hook. 771 distinct inside-root files had successful reads before the stop.

The full entry stops on SHA-256 `3d6b698f481b20b4dd2087c5b48c8987b65fddf54e054d74620b7d63d976e003`, exactly matching `/__data.json`. That literal is the `DATA_SUFFIX` URL string in the adapter-generated entry. Installed nft's `emitAssetPath` probes stat before deciding whether a potential asset exists. This is an asset-analysis false lead for a URL string, not evidence of a real runtime file dependency. It does not establish a security vulnerability or the OOM cause. No filesystem access was made to resolve either hash; hashes were compared against these public source literals.

## Harness fidelity and verification

The wrapper uses the exact installed nft `CachedFileSystem` class to preserve its caching and concurrency limiter. It instruments hooks without editing node_modules. Symlinks are preflighted; ancestor directory metadata needed for resolution is permitted, while outside content and non-ancestor paths stop the isolated child. The child environment contains only PATH, LANG and TMPDIR. Input manifests require a marked canonical temporary root, exact package/lock/entry and engine hashes, and an empty task output directory. The manifest supports more input hashes where stronger artifact freezing is needed.

Final verification: `node --test scripts/qc/trace-build-graph.test.mjs` passed 8/8 tests, exit 0, 1.996 seconds. Tests exercise actual nft imported assets and dynamic asset reasons, identity/path/marker/output refusal, symlink and private-root-env rejection, immediate containment stop, and SIGTERM-resistant child cleanup using SIGKILL. There is no missing-runtime skip. The containment fixture asserts exit 2, no timeout, exactly one boundary event and no journal event after it. Formatting passed for both script files.

Two exploratory results are superseded: the first messages trace used raw filesystem hooks that bypassed nft's cache; the first cached manifest trace timed out at 60.048 seconds after a hook error had been swallowed by nft. The latter exposed an instrumentation bug: throwing alone does not enforce stopping because nft treats optional-asset stat exceptions as missing assets. The final harness writes blocked metadata synchronously and exits its isolated child immediately. Neither superseded trace qualifies graph closure or supplies memory-cause evidence.

The harness is a local diagnostic for an immutable credential-free build copy, not a sandbox for hostile code or a product tracing implementation. Its hash manifest pins selected inputs rather than every transitive source file. It does not invoke application handlers. Temporary evidence is local and must be retained or copied before removing the artifact trees.

## Identities

Candidate package: `c219b672919ba9a2551f8f149af419c9d4d96437f7862b662dfd52ac7d7d0925`.
Candidate lock: `f58b2806a860136fa4158c9158d057ad9afea4cca0207989f355177f627a167d`.
Final harness: `15bac7bac8460900f925bb197cb95d61465c06d8d59414ccbd6f55bb8c966c1f`.
Final harness tests: `e172333a943e7587809528731a3be3b3eac4130899589d11fc75c36d7af112fd`.

Evidence root: `/tmp/minion-360-12-01/clean`.

| Relative evidence file | SHA-256 |
|---|---|
| `trace-input-messages-cached.json` | `35e7331521e744e04e72e7bf883ea8d0e352028b2701faf89513cc1e3962a89a` |
| `trace-results/messages-cached-01/process.json` | `8794457253caa496d3c8721acc76692ba2627ca348f7300d3a75eb740290c7b6` |
| `trace-results/messages-cached-01/trace.json` | `3680bdbf4b82df10a478a4be90cd712cbeae41d081b81c9a4502fdff4808caac` |
| `trace-results/messages-cached-01/events.jsonl` | `df93a5b35f5327e1f880fc3f80285585adeb3803109168c08692a030239d2611` |
| `trace-input-manifest-cached-stop.json` | `e198cb282a9ed5e2252e47fa4d1de3ab42fddaec5a4c8b4ba574bc0a9703947b` |
| `trace-results/manifest-cached-stop-01/process.json` | `3650e8f2d0b58a45828a27cf05564e341336fd5b2064cb2fcd067e50badc9f57` |
| `trace-results/manifest-cached-stop-01/trace.json` | `b9cdf981a23dcd5940df244439f6e1744ede63b0a461fa6b85f75af910c0eaa6` |
| `trace-results/manifest-cached-stop-01/events.jsonl` | `7402e4b5f954e3c5e8447c1f10242510389d69a7bd9c5d74be034369622f01ca` |
| `trace-input-entry-cached.json` | `ea6a5fa8be5139ea9fc1b4bcef050a11f67426f65be7c36800a6f387a871bd3f` |
| `trace-results/entry-cached-01/process.json` | `8c9aba0df762a63773201a077d4eab0c339af9f4462dccd318cce1a498f2e895` |
| `trace-results/entry-cached-01/trace.json` | `234f0d19e3f84d7bd4ce2c72959367d86d3a633d251b4f4a2ac09e02be528647` |
| `trace-results/entry-cached-01/events.jsonl` | `324d82999bcbf68120b91ab621dfa2d83204019f2c21719641b762cf25f73569` |

## Next decision and limits

Do not select a product repair from these results. The next bounded diagnostic should first determine whether an unprivileged OS filesystem namespace can expose only the marked build artifact plus the exact runtime dependencies, preserving nft's filesystem-root path semantics and allowing absent-path probes without consulting the host tree. Perform capability checks before any new dependency or container change; Docker access was unavailable earlier. An alternative narrowly defined metadata-only policy requires independent admission and must never silently exclude assets or claim full closure after suppression.

After a faithful contained graph is available, repeat baseline/candidate full-entry traces under the same bounded budget, then use one lower-IO-concurrency comparison if memory growth is reproduced. Preserve complete emitted-file/reason lists. Only a discriminating result should select a repair. Paraglide's supported migration is already scoped by 12-02, but these traces do not establish that it fixes packaging; adapter 6.3.4 already includes the cited upstream system-file repair. Primary upstream links and their scope are in [12-BUILD-TRACE-RESEARCH.md](12-BUILD-TRACE-RESEARCH.md).

Parent-owned follow-up: record the unresolved full-graph containment/cause and default-build gate in the QC proposal, independently review the harness, and admit any next diagnostic or repair PLAN. Full deployment still requires complete packaging with assets/dependencies, EN/ES direct routes and redirects, request locale isolation, SSR/hydration and localized links. DEP-01, DEP-02 and the 12-01 candidate build gate remain open. Product manifests/lockfiles, application configuration and source were not changed by 12-05.
