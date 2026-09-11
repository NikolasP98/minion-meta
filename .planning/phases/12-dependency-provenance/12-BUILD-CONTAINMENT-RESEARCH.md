# Contained build-trace research

Status: capability research completed; implementation plan 12-06 is a draft awaiting independent admission. No application artifact was mounted, traced or built in this research. Recorded 2026-09-09.

## Why another diagnostic is needed

12-05 correctly stopped before nft could stat outside its selected artifact root. The first paths matched `/__data.json` in the adapter's URL suffix and `/minion/setup/setup.sh` in a provision-service fallback. These probes do not establish existing dependencies or the packaging OOM cause. Allowing host-tree metadata exceptions would weaken containment. Instead, an OS filesystem namespace can make ordinary absent-path probes faithful to a deliberately empty deployment environment without exposing the host tree.

This is a local diagnostic environment, not a replacement production tracer or a selected build repair. The emitted closure must retain everything that nft finds; a smaller graph caused by a missing required input is incomplete evidence.

## Verified local capabilities

| Check | Observed result |
|---|---|
| Kernel | Linux 7.1.9-arch1-2 |
| User namespaces | `kernel.unprivileged_userns_clone = 1`; `user.max_user_namespaces = 92941` |
| Caller | Effective capabilities zero; no privilege escalation requested |
| Tools | `/usr/bin/bwrap` 0.12.0; `/usr/bin/unshare` util-linux 2.42.3; readelf, ldd and timeout installed; proot absent from PATH |
| Bubblewrap binary | Regular root-owned mode 0755, no setuid bit; SHA-256 `7c44fa8e7326e62e81ab3f70ff682bfc0eb3b447b39cf9fbb779a31948364762` |
| Trace runtime | `/usr/bin/node` v22.23.2; SHA-256 `45b7e2ad792e6968e3f69c85864d19d29f010b39c55b33e0b0c27e2f22d8ddda` |
| Namespace primitive | `timeout 5s unshare --user --map-root-user --net --pid --fork /usr/bin/true` exited 0 |

A second five-second capability probe constructed an empty Bubblewrap root, binding only the Node executable and individual dynamic runtime files. It used `--unshare-all --unshare-user --disable-userns --assert-userns-disabled --die-with-parent --new-session --cap-drop ALL --clearenv`, a private proc filesystem, a minimal generated dev filesystem, and an empty temporary directory. It ran an inline Node builtin-only inspection with cwd `/` and exited 0.

The child reported:

- Node v22.23.2, cwd `/`, environment containing only Bubblewrap's `PWD`.
- Root entries `dev`, `lib64`, `proc`, `tmp`, `usr`.
- A different network namespace from the parent and only the loopback interface.
- `NoNewPrivs: 1` and zero effective capabilities.
- No `/home` or `/etc/os-release` in its root.
- Normal absent-path results for `/__data.json` and `/minion/setup/setup.sh`.

The first Bubblewrap invocation rejected `--disable-userns` without an explicit `--unshare-user`, even with `--unshare-all`. The corrected invocation added the required namespace argument and retained both disable/assert controls. There was no policy refusal bypass or fallback to a weaker mode. All probe children exited; no host files, system settings, packages or application data were changed.

This proves capability, not the final launcher policy. No hostile fixture, parent-loopback connection attempt, descriptor-escape test, read-only mutation test or full mount audit has yet qualified an application trace. Those are mandatory 12-06 implementation gates.

## Runtime exposure

`readelf -l /usr/bin/node` reports interpreter `/lib64/ld-linux-x86-64.so.2`. `ldd` was used only on this trusted installed Node executable, never on an artifact-supplied executable. The probe bound canonical file contents read-only at these exact loader paths:

```text
/lib64/ld-linux-x86-64.so.2
/usr/lib64/ld-linux-x86-64.so.2
/usr/lib/libbrotlicommon.so.1
/usr/lib/libbrotlidec.so.1
/usr/lib/libbrotlienc.so.1
/usr/lib/libc.so.6
/usr/lib/libcares.so.2
/usr/lib/libcrypto.so.3
/usr/lib/libgcc_s.so.1
/usr/lib/libicudata.so.78
/usr/lib/libicui18n.so.78
/usr/lib/libicuuc.so.78
/usr/lib/libm.so.6
/usr/lib/libnghttp2.so.14
/usr/lib/libssl.so.3
/usr/lib/libstdc++.so.6
/usr/lib/libuv.so.1
/usr/lib/libz.so.1
/usr/lib/libzstd.so.1
```

No whole `/usr`, `/lib`, `/etc`, home, working checkout or host temporary directory was bound. The implementation must record content digests and logical/canonical path mappings for every exposed runtime file; this preliminary probe records their names and Node identity only. Reject an unresolved loader entry rather than automatically mounting a parent directory. The two interpreter paths can resolve to the same canonical host file; preserve required aliases explicitly.

## Supported-tool basis

[Bubblewrap's upstream README](https://github.com/containers/bubblewrap/blob/main/README.md) describes constructing an initially empty filesystem namespace and exposing selected paths. It also makes the caller responsible for the resulting security policy. Its namespace support and new-session guidance support using a carefully bounded local diagnostic; they do not certify arbitrary launcher arguments.

The [upstream option reference](https://github.com/containers/bubblewrap/blob/main/bwrap.xml) and installed 0.12.0 help define read-only binds, explicit namespace controls, child-lifecycle controls and user-namespace disabling. Use mandatory flags; never use `--unshare-user-try`, `--share-net` or `--not-a-security-boundary` to make a failed qualification pass.

The installed nft 1.10.2 remains the tracing implementation. Its [documented hooks and path semantics](https://github.com/vercel/nft/blob/main/readme.md) can observe calls inside the namespace without returning invented absence or suppressing assets. Keep filesystem-root `base` and `processCwd`, default analysis and the pinned cached IO behavior. No product adapter or node_modules patch is justified here.

Primary sources were reviewed on 2026-09-09. This selects a diagnostic mechanism available locally, not a new application dependency or a claim that future versions preserve identical behavior.

## Proposed boundary

Expose the immutable credential-free artifact read-only at its same absolute temporary path, the exact runtime file closure, the hash-pinned diagnostic worker, private proc/dev support, and one empty owned writable output mount. Hide everything else through the mount namespace. Start a new PID/network/user/IPC/UTS namespace; disable further user namespaces, drop capabilities, clear environment and inherited descriptors, and retain parent-enforced cleanup.

A preflight synthetic probe inside each actual launch must prove the intended mount/runtime identity and isolation before loading nft or any artifact module. A small parent-owned loopback listener plus a host sentinel supplies observable network/filesystem denial tests without external traffic or real secrets. Reject sockets, devices and escaped symlinks in the artifact. Freeze a complete input-file inventory and check it again after execution; a read-only child mount alone does not prevent a different host process from changing the source tree.

The first admitted application traces should remain sequential and capped at 60 seconds/2 GiB each. No full build, raised heap policy, product configuration change, network, dependency installation or deployment belongs to this plan. A timeout, OOM, isolation failure, unreadable required asset or nft warning remains explicit incomplete evidence. Complete closure here would apply only to the enumerated isolated artifact and runtime, not automatically to a Vercel deployment.
