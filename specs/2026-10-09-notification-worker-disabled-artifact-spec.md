---
id: 2026-10-09-notification-worker-disabled-artifact-spec
title: Stage an immutable disabled notification worker artifact
stage: dev
status: implementing
pass: 2
verdict: approved
created: 2026-10-09
updated: 2026-10-09
repos: [minion_hub, minion-meta]
proposal: 2026-10-09-hub-notification-worker-production-activation
relationship: extends
related: [2026-10-09-hub-notification-worker-production-activation]
tags: [infra, security, data, test]
type: infra
---

# Stage an immutable disabled notification worker artifact

## 0. Product

The Hub has a durable notification worker in source but no separately owned production runtime.
This slice produces and installs a reviewable Node artifact without starting it. Operators can
therefore verify the exact code, unit, declared listener configuration and rollback material before any process
receives production credentials or can acquire a database lease.

This spec extends `2026-10-09-hub-notification-worker-production-activation`. It deliberately stops
before worker activation. A later approved spec must qualify credentials, database compatibility,
singleton admission, provider effects, health reporting and the first enabled start.

## 1. AS-IS at qualification start

- `svelte.config.js:7-12,34-38` selects `@sveltejs/adapter-node` only when `DESKTOP=1`; the normal
  Vercel build uses `@sveltejs/adapter-vercel`.
- `src/hooks.server.ts:59-64` installs the owned Node lifecycle in DESKTOP mode.
  `src/hooks.server.ts:460` also bypasses the normal Hub request-authentication sequence in that
  mode. Any future listener must remain on loopback unless a separate reviewed auth boundary is
  added.
- `src/server/services/notifications/worker-bootstrap.ts:8-13` starts the persistent scheduler only
  when `DESKTOP=1` and `NOTIFICATION_WORKER=1`. Build and Vercel imports start no worker.
- `src/server/worker-lifecycle.ts:42-112` quiesces admission and drains tracked work before closing
  cache and PostgreSQL pools. It intentionally has no forced deadline.
- `package.json:179-180` has developer `desktop:build` and `desktop:serve` commands. The serve
  command contains local defaults and is not an artifact publisher or production service contract.
- `scripts/qc/worker-runtime-qualification.mjs:44-101` starts a compiled adapter against a marked
  disposable database. Its initial HTTP 401 is only a cron-auth assertion; it is not proof that a
  production worker is healthy.
- No committed immutable worker manifest, publisher, disabled systemd unit, root-owned installer or
  production deployment controller exists. Vercel does not start the worker. Production runtime
  metadata at the 9 October checkpoint showed no prior singleton start.
- Starting the adapter-node server, even with `NOTIFICATION_WORKER=0`, loads the full Hub server.
  Its minimum production database/cache/auth credential set has not been qualified. This slice must
  not invent credentials merely to make a disabled smoke test start the server.

## 2. TO-BE and invariants

1. A clean Linux builder creates the artifact from an exact 40-character Hub commit and frozen
   `bun.lock`. The workflow pins separate dependency and build images by OCI digest and its Node patch, ABI and Bun
   version. Dependency acquisition uses the pinned Bun image with network access; compilation uses the pinned Node image with network access disabled. The manifest records schema version, source commit and tree, target OS/architecture,
   exact runtime and ABI, lock hash, builder digest, archive SHA-256, build command, workflow path,
   repository, run id/attempt and worker contract version. Timestamps, owner ids, permissions and
   archive ordering are normalized so rebuilding the same tree with the declared toolchain yields
   the same payload hash.
2. The archive contains the adapter-node `build/` output and its exact packaged dependency inventory.
   This is an inventory/containment claim only, not proof that the closure can cold-load or run. It
   never reads runtime dependencies from the destination host checkout. The destination requires only
   the manifest-declared Node runtime and system service manager.
3. Publication uses an immutable digest-addressed name. A mutable branch, tag, latest alias or
   current checkout cannot authorize installation. The pinned workflow issues a GitHub artifact
   attestation binding both archive and manifest digests to the expected repository, workflow path,
   source commit, run id and attempt. Installation requires operator-supplied expected digests and verifies the
   attestation with GitHub's supported verifier against those out-of-band expected values; the
   archive or its adjacent manifest cannot nominate its own trust root. Provenance source and signer
   digests identify the trusted workflow event commit and exact workflow definition commit, rather
   than the separately checked-out payload commit. Before payload checkout, the workflow validates
   a full SHA; the attested manifest binds that payload commit, tree, lock digest, both pinned OCI
   dependency/build image digests, tool versions, run ID and attempt. Installation independently
   requires expected manifest/archive digests and expected payload identity, and verifies both
   attestation subjects against the expected workflow repository, ref and digests. Neither authority
   substitutes for the other. Workflow permissions are
   limited to contents read plus the documented `id-token: write` and `attestations: write` needed
   to issue provenance. The manifest and archive are published together; neither contains
   credentials, environment files, customer data, database URLs or provider tokens.
4. A root-owned installer verifies the out-of-band expected digest and provenance, source commit,
   tree, lock hash, builder digest, workflow identity/run attempt, manifest schema, platform, exact
   runtime/ABI and worker contract before extracting to a new digest-addressed directory. Archive
   entries may be regular files or directories only. The validator rejects absolute or escaping
   paths, symlinks, hardlinks, devices, FIFOs, sockets, setuid/setgid/sticky modes, xattrs, file
   capabilities, duplicate or normalization-colliding names, wrong ownership and group/world-writable
   files. Extraction uses descriptor-relative no-follow operations into a new root-owned staging
   directory and revalidates parent descriptors before atomic selection; path checks followed by
   ordinary name-based writes are insufficient. An occupied mismatched digest is refused.
5. The installed systemd unit is `disabled` and `inactive`. Installation must never call `enable`,
   `start`, `restart`, `try-restart` or an HTTP endpoint. It creates no timer or cron. Re-running the
   same installation is idempotent; a failure leaves the prior release pointer and unit state intact.
6. The unit runs as a dedicated unprivileged identity, denies privilege gain, uses a private temporary
   directory and exposes `HOST=127.0.0.1` only. A root-owned launcher validates an allowlisted
   environment file and rejects reserved keys including `HOST`, `PORT`, `DESKTOP`,
   `NOTIFICATION_WORKER`, `NODE_OPTIONS` and loader/preload variables. It then supplies fixed
   `DESKTOP=1`, `HOST=127.0.0.1` and the reviewed port after parsing, so file ordering cannot override
   them. The environment file
   path is root-owned, mode 0600 and absent by default. A separate root-owned activation marker is
   also absent and enforced with `ConditionPathExists`; an accidental manual `systemctl start` must
   therefore stop before `ExecStart`. `NOTIFICATION_WORKER=1` is not installed in this slice. The
   service account cannot write the artifact, manifest, unit, marker or environment file.
7. No credential is needed to build, publish, install or smoke-test this disabled slice. The smoke
   test verifies bytes, permissions, unit syntax and inactive/disabled state without launching the worker Node entrypoint,
   opening a worker listener, connecting to PostgreSQL/cache, resolving provider endpoints or reading an
   environment file.
8. HTTP 401 or 403 is never accepted as disabled-service health. Those responses prove only that a
   route handled a request. Enabled health must later require exact artifact/process identity plus
   scheduler generation, heartbeat, build, catalog and projector evidence from a separately approved
   activation contract.
9. This slice proves artifact identity, containment and inactive installation. Because Node is never
   executed, it does not prove that the runtime dependency closure can cold-load or that the worker
   can start. Compiled runtime qualification against disposable PostgreSQL and the complete minimum
   credential inventory are explicit gates in the future activation slice.
10. Rollback in this slice only changes an inactive release pointer to another manifest-valid artifact.
   It never starts either artifact. Once activation exists, rollback must preserve durable leases and
   obey a separately reviewed minimum worker-contract floor.

## 3. DELTA

### Slice 1: Build and install the disabled artifact

**Topics:** `infra`, `security`, `data`, `test`

Implement one reviewable slice in `minion_hub`:

1. Add `scripts/ops/build-notification-worker-artifact.mjs`. It validates clean exact source input,
   performs `bun install --frozen-lockfile` and the DESKTOP adapter-node build in a Linux builder
   pinned by OCI digest with exact Node patch/ABI and Bun version, assembles only the runtime closure,
   normalizes the archive and emits the secret-free
   manifest beside the archive. It fails if required identity fields are missing or mutable.
2. Add `scripts/ops/verify-notification-worker-artifact.mjs` as the single manifest/archive validator
   used by both CI and installation. It accepts explicit expected source, target and output paths; it
   never obtains authority from the manifest itself or a moving Git ref. Add a root-owned launcher
   that parses only the reviewed environment allowlist, rejects reserved/process-injection keys and
   supplies the fixed loopback/DESKTOP settings itself.
3. Add `deploy/systemd/minion-hub-notification-worker.service` with the restrictions in section 2.
   `ExecStart` uses the selected digest-addressed release and exact host Node runtime. The unit has no
   `WantedBy` activation path in this slice, requires the absent activation marker before `ExecStart`
   and has no permissive public bind fallback.
4. Add `scripts/ops/install-notification-worker-artifact.sh`. It requires root, an explicit local
   archive, manifest and expected digest/source, validates before filesystem mutation, stages with
   root ownership, installs the unit without enabling it and preserves the prior inactive pointer on
   every failure. It refuses installation if the service is active or if credentials are supplied as
   command arguments.
5. Wire a CI artifact job that checks out the event's exact source SHA, builds once, verifies the
   result, uploads archive and manifest under a run-id/attempt-specific name, and publishes GitHub
   artifact provenance for both digests from the pinned workflow. Verification receives the expected repository,
   workflow, commit, run id/attempt and artifact digest from the trusted release event or operator,
   never from downloaded files. The workflow must not expose the artifact publicly, print environment
   values or use pull-request code with production credentials. Retention and repository permissions
   must be explicit and minimal.
6. Add focused tests that execute the real builder manifest emission, shared verifier, installer and
   unit. Use temporary roots and a fake service manager; do not duplicate their filters in test code.

Required negative tests:

- wrong source/tree, archive hash, platform, runtime, contract version or malformed manifest;
- wrong repository/workflow/run id/attempt, unsigned artifact, untrusted signer, mismatched subject
  digest and manifest that attempts to substitute its own provenance expectations;
- mutable or missing identity, duplicate keys, path traversal, external symlink and writable payload;
- hardlink, device, FIFO, socket, setid/sticky mode, xattr, file capability, duplicate path,
  Unicode/case normalization collision and a parent-directory symlink swap during extraction;
- interrupted extraction, occupied mismatched digest and atomic-pointer failure;
- non-root installer, active service, attempted enable/start/restart and timer/cron creation;
- manual `systemctl start` with the activation marker absent, proving `ExecStart` was not invoked;
- public bind, missing loopback setting, service-user write access and environment mode other than 0600;
- environment attempts to set reserved listener, admission, Node option or loader/preload keys, with
  an execution-order test proving the fixed launcher values win;
- archive or manifest containing configured secret values/assignments, URL credentials or injected fixture customer data;
- any disabled smoke attempt to execute the worker entrypoint, read its environment file, open a worker socket, resolve a
  provider hostname or connect to PostgreSQL/cache;
- treating HTTP 401/403 as health.

## 4. Out of scope

- Creating or populating the production environment file.
- Determining the complete minimum startup credential set.
- Starting, enabling or restarting the service on any host.
- Setting `NOTIFICATION_WORKER=1`, acquiring leases, running an authorized tick or processing outbox
  records.
- Calling a provider API, sending a synthetic notification or using customer records in a fixture.
- Adding Vercel cron, host cron or a systemd timer.
- Adding a public listener, reverse proxy or DESKTOP authentication exception.
- Claiming NOTIF-003 closed. This slice prepares an inactive artifact only.

## 5. Verification and definition of done

Run the new focused artifact/installer tests in a disposable Linux environment, then run Hub check,
unit tests and build at the exact candidate commit. The evidence must include:

1. two isolated builds of the same source/toolchain with identical archive digest and normalized
   content-identity fields; run id/attempt provenance fields must differ exactly as their runs differ;
2. all negative cases in Slice 1, including zero worker process/network/database/provider activity during
   disabled smoke;
3. systemd static verification and a disposable actual-systemd test on an isolated CI runner. Install
   a uniquely named test unit with its activation marker absent, request `systemctl start`, and prove
   the condition prevents `ExecStart` by an untouched sentinel plus inactive/disabled state. Repeat
   the temporary-root installer test for idempotency. A mocked service manager alone is insufficient;
4. an archive inventory proving no environment file, secret, customer fixture or host path exists;
5. exact source commit/tree, archive digest, CI run id/attempt and retained artifact identifier;
6. independent review of artifact authority, installer failure ordering, unit confinement and tests.

No production host receipt belongs to this slice. Completion means a reviewed artifact can be staged
without credentials or execution. Activation remains blocked on an approved follow-up that qualifies
minimum credentials, live database/catalog compatibility, singleton and heartbeat evidence, provider
effect controls, health semantics, drain and rollback floor.

## Implementation review clarification

The first clean build showed that Bun could not load the build plugin's data-URI module. The two-stage builder therefore uses pinned Bun only for frozen dependency acquisition/materialization and pinned Node for the network-isolated source build. Both OCI digests must be recorded and independently expected by verification. This changes the toolchain description, not the disabled-service or credential boundaries.

Independent review also separated workflow provenance identity from payload identity. A dispatch can run trusted workflow code at one commit while packaging an explicitly selected payload commit. Verification must prove each authority through its corresponding trusted inputs and attested subjects; comparing the payload SHA to GitHub's workflow source digest is invalid. Final implementation review and clean-build proof remain release gates.

### Disabled smoke evidence interpretation

Trusted installer/verifier Node, Python, shell and systemctl processes are necessary to validate the artifact; the no-execution invariant applies to the worker entrypoint and its startup effects. The actual-systemd negative test must prevent ExecStart; a separate harmless positive sentinel may prove that the same unit condition would otherwise allow execution. Neither is permission to cold-load the worker.

Compiled application code necessarily contains environment-variable identifiers. Content checks reject configured secret values/assignments, credential-bearing URLs, environment files and deliberately injected customer/secret canaries; they must not mistake an ordinary variable identifier for a leaked value. Inventory plus controlled input provenance and canary negatives are the stated evidence. They do not prove absence of every possible unknown secret by pattern matching. This clarification makes the verification target executable without relaxing the credential-free build and disabled-runtime boundaries.
