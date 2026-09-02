---
id: 2026-08-17-pkg-infisical-cache-plaintext-spec
title: "@minion-stack/env — stop leaving the gateway vault master key in a plaintext cache file"
stage: spec
status: approved
pass: 2
next_slice: 3
created: 2026-08-17
updated: 2026-09-02
proposal: 2026-08-17-pkg-infisical-cache-plaintext
verdict: approved
repos: [minion-meta]
tags: [security, infra, logic, test]
type: fix
approved_reason: "Slice 3 cursor and canonical Slice 3 heading are merged; queue only the remaining S3 contract work."
reconcile_ignore: true
reconcile_ignore_reason: "Denied: S1 and S2 are implemented, and S3 documentation plus the env changeset are present; the doctor probe and anti-recurrence guard remain incomplete."
---

# Stop leaving the gateway vault master key in a plaintext cache file

**Owner surface:** `minion-meta` — `packages/env/src/cache.ts` (the whole file), `src/infisical.ts`,
`src/hierarchy.ts`, the two test files, `packages/cli` (one `doctor` probe), a changeset, and the
package README + root `.env.example`. **No other repo has code to change** (§4).

**Design ancestors:**
[`2026-05-20-centralized-secrets-vault`](2026-05-20-centralized-secrets-vault.md) — the spec that made
`MINION_SECRETS_KEY` "the only value still pulled from Infisical at boot" (§ line 18) and the master
key for the gateway's libsodium `crypto_secretbox` vault (§ lines 179–190). That narrowing is why this
bug matters *more* now than when it was written: the cache file went from "a pile of secrets" to
"the one key that opens the pile of secrets."
[`2026-04-19-minion-meta-repo-design`](2026-04-19-minion-meta-repo-design.md) — the six-layer env
hierarchy this cache sits inside (layer 2).
**Sibling in this sweep:** [`2026-08-17-pkg-dev-crypto-failopen-spec`](2026-08-17-pkg-dev-crypto-failopen-spec.md)
— same debt sweep, same shape (a security default nobody re-read after the surrounding design moved).
Not a dependency; do not couple the PRs.
**Gate conventions:** [`2026-08-17-sdlc-phase-gates-scoring-spec`](2026-08-17-sdlc-phase-gates-scoring-spec.md)
§4b — every slice below is tagged `security`, so: red-state TDD is mandatory (G3), the fail-closed
rubric applies, **no UI-governance checks** (zero `.svelte` files in this spec), and the score may warn
but **never auto-pass** — the human gate is mandatory however green the commands come back.
**Release mechanics:** `@minion-stack/env` is published to npm; per the meta-repo release flow, a
behavior change with no `.changeset/*.md` fails `changeset:status` in CI, and publishing takes two
merges to `main` (feature PR → "Version Packages" PR).

---

## 0. Product

From the approved proposal `2026-08-17-pkg-infisical-cache-plaintext`, verbatim:

> ## Problem
>
> packages/env/src/cache.ts:32-36 resolved secret VALUES cached to ~/.config/minion/infisical-cache.json.
>
> ## Definition of done
>
> Machine-local-key encryption at rest, or an explicit documented acceptance of the tradeoff.
>
> ## Out of scope
>
> Vault redesign.

**What the code actually does today** (read from disk in this checkout):

```ts
// packages/env/src/cache.ts:32-36
function writeCacheFile(data: CacheFile): void {
	const dir = cacheDir();
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
	fs.writeFileSync(cachePath(), JSON.stringify(data, null, 2), { mode: 0o600 });
}
```

Four verified facts make this worse than "a 0600 file with some secrets in it":

1. **The file holds the master key to the entire gateway vault.** `hierarchy.ts:63` narrows the
   `minion-core` layer to exactly `MINION_SECRETS_KEY`, and per
   `2026-05-20-centralized-secrets-vault` that value is the libsodium key that decrypts every secret
   row the gateway stores. Plaintext-on-disk for that one value is worth more to an attacker than the
   old broad dump was.
2. **The narrowing never reached the cache.** `infisical.ts:67` calls `writeCache(cacheKey, env, …)`
   with the **full** Infisical response, *before* `hierarchy.ts` throws away everything outside
   `NARROWED_KEYS`. So the on-disk file still contains every legacy secret in `minion-core` — the
   exact values the resolver deliberately refuses to use and warns operators to migrate away
   (`hierarchy.ts:70-77`). The file is a strict superset of what the process actually needs.
3. **`mode: 0o600` does not apply to an existing file.** Node passes the mode only on creation
   (`O_CREAT`). Verified empirically in this session:
   `chmod 644 f && writeFileSync(f, …, {mode:0o600})` → the file stays `644`. So the README's
   security claim ("The cache file is created with mode `0600`") is true only for the first write in
   a fresh config dir; any pre-existing or re-permissioned file keeps whatever mode it had, forever.
4. **The write is not atomic and the file is shared.** `writeCacheFile` is a read-modify-write of one
   JSON blob with no lock. Two `minion` processes overlapping (a shell running `minion check` while
   `minion dev` resolves) can lose an entry or leave a truncated file. The truncated case degrades
   safely today (`readCacheFile` catches the parse error and returns `{}`), but it is the same
   primitive S2 will put ciphertext through, where a torn write is not free.

**The honest part.** Encrypting a file with a key that lives next to it does **not** stop an attacker
who already runs as your user — they can read both. What it does stop is the realistic failure mode
for a `~/.config/*.json` blob: it gets swept into a backup, a Synology-Drive-style sync, a support
tarball, or a `grep -r 'sk-' ~` and walks out as readable text. This spec buys that, says so in
writing (S3), and — because the strongest defense is not writing the value at all — sequences the
work so that **after S1 there is nothing on disk to protect**, and S2 only brings the file back once
it is sealed.

## 1. Assumptions and what Slice 0 must settle

`packages/env/` and `packages/cli/` **are** checked out here; every claim in §0 was read or executed
against this working tree. Three things are *not* knowable from the repo:

1. **What is in the cache file on real machines right now** — dev laptop, the Netcup gateway box, the
   factory box, CI. Whether it exists, its mode, and (key names only, never values) what it holds.
   This decides ⚠️ A2.
2. **Whether any config dir is inside a synced or backed-up path.** The meta-repo has form here: the
   docs project was relocated by a Synology Drive sync in 2026-08-05. If `~/.config/minion` is inside
   such a path, the master key has already left the machine and A2 is not hypothetical.
3. **How deployed boxes actually get `MINION_SECRETS_KEY`.** If they source it from a deploy-written
   `.env` rather than from `minion sync-env`, S1's latency/offline regression never reaches them.
   Verify — do not assume either way.

### Slice 0 — recon (≤ 45 min, prepend to S1, not counted as a slice)

```bash
cd /home/agent/work
rg -n 'readCache|writeCache|cachePath|cacheDir|infisical-cache' packages/ scripts/ ops/ --glob '!node_modules'
rg -rn '@minion-stack/env' --include package.json --glob '!node_modules' .    # expect: only packages/cli
cat packages/env/test/infisical.test.ts   # note the two tests that ASSERT the disk file exists

# On every machine that has ever run the `minion` CLI (laptop, gateway box, factory box, CI image).
# KEY NAMES ONLY — never print a value, never paste one into a PR:
f="${XDG_CONFIG_HOME:-$HOME/.config}/minion/infisical-cache.json"
[ -f "$f" ] && stat -c '%n mode=%a owner=%U size=%s mtime=%y' "$f"
[ -f "$f" ] && jq -r 'to_entries[] | "\(.key): \(.value.env | keys | join(","))"' "$f"
stat -c '%n mode=%a' "${XDG_CONFIG_HOME:-$HOME/.config}/minion"    # dir mode: 700 or looser?
# Is that path synced/backed up?  (Synology Drive, Dropbox, iCloud, restic/borg include-lists, /etc/*backup*)
```

Record in the PR: which machines have the file, its mode, whether `MINION_SECRETS_KEY` is among the
cached names, whether any legacy keys are still cached, and whether the path is synced. An
unreachable machine is an **unknown**, not a zero — say which one and why.

## 2. Approach — three vertical slices

```
S0 (recon) ─▶ S1 (nothing persists; purge what did) ─▶ S2 (bring the cache back, sealed) ─▶ S3 (contract + docs + doctor)
```

The ordering is deliberately fail-safe: every merge point is at least as safe as the one before it,
and if the work stalls after S1 the resting state is "no secrets on disk", not "a half-encrypted
file". S1 is the security fix; S2 restores the ergonomics S1 costs; S3 is what makes it a published
contract rather than a local edit.

**S1 + S2 must ship in the same release.** S1 alone removes cross-process caching, which means every
`minion` invocation shells out to `infisical` and an offline/flaky-network machine loses
`MINION_SECRETS_KEY` (a warning, then a gateway that cannot open its vault). If S2 *is* deferred, the
changeset must be `major`, must state that regression in the consumer's terms, and the AGENTS.md
open-items ledger applies — a `TODO(handoff):` in `cache.ts` plus an appended entry on the source
proposal.

---

### S1 — Nothing lands on disk, and what already did gets purged

**Tags:** `security`, `logic`, `test` · **Estimate:** 5–7 h

**Goal:** after this slice, running any `minion` command writes **zero** secret values to disk, the
existing plaintext file is gone, and a single process still shells out to `infisical` at most once.

**Do:**

- **Replace the disk cache with a process-lifetime memo.** A module-level `Map<string, CacheEntry>`
  in `cache.ts`, same `readCache`/`writeCache` signatures, same TTL check. This is not a downgrade for
  the hot path: `fanout.ts:29` calls `resolveEnv` in a **sequential `for` loop inside one process**
  (verified), so the memo covers the only in-process repetition that exists today.
- **Delete the legacy plaintext file on first use, once per process.** If `cachePath()` exists and
  parses as the old shape (top-level keys → `{env, fetchedAt, ttlMs}`), `fs.rmSync` it and print one
  `console.warn` to **stderr**: what was removed, that it contained plaintext secret values, and that
  if the path was ever backed up or synced, `MINION_SECRETS_KEY` should be rotated (⚠️ A2). **Do not
  migrate the contents** — re-persisting known-exposed material is the opposite of the fix. Deletion
  is fully recoverable (the next fetch refills the memo), which is what the AGENTS.md
  destructive-cleanup rule asks you to confirm before removing anything.
  This purge is a security cleanup, not a cache read: it runs before mode/no-cache handling even
  when `MINION_ENV_CACHE=off` or `noCache:true`. In those modes no cache content is read or written,
  but a recognized legacy plaintext file is still removed and reported.
- **Add the mode switch now, so S2 has nothing to redesign.** `MINION_ENV_CACHE`, parsed as a strict
  allowlist (trimmed, lowercased): `off` | `memory` | `disk`. Anything unrecognized → `memory` **plus
  a warning naming the bad value**; never fall through to `disk` on a typo. In S1 `disk` behaves as
  `memory` and warns "encrypted disk cache not available in this version"; S2 implements it and flips
  the default. S1's default is `memory`. `off` disables the memo too (every call re-fetches) — that is
  the setting for CI and shared boxes.
- **Cache only what the caller declares it will use.** Add `cacheKeys?: string[]` to
  `InfisicalFetchOptions`; when present, only those keys are stored (memo now, file in S2).
  `hierarchy.ts` passes its `NARROWED_KEYS` set. This is the fix for §0 fact 2 and it must survive
  into S2 — the sealed file should still contain one entry, not the whole legacy dump.
- **Make cache identity cover every input that can change the result.** The cache key must include
  the normalized Infisical domain (including an explicit sentinel for the CLI default) and the
  sorted, deduplicated `cacheKeys` allowlist, in addition to project and environment. Otherwise a
  hit fetched from one domain or allowlist can be returned for another. Do not place secret values
  in the cache key.
- **Do not let narrowing silence the migration warning.** `hierarchy.ts:70-77` builds its "stale
  Infisical keys" warning from `Object.keys(core.env)`. Once the cache holds only the allowlisted
  subset, a cache hit would make that warning vanish and reappear at random. Carry key **names** (not
  values) alongside: add `keyNames?: string[]` to `InfisicalFetchResult`, populate it on both the
  fetch path and the cache-hit path, and compute `stale` from `keyNames` when present. A name-only
  list is not secret material — that is exactly the invariant `source[]` already relies on
  (`hierarchy.ts:104`).
- **Keep every failure soft.** A missing/corrupt/undeletable cache must degrade to "fetch again",
  never throw. The authoritative source is one `spawnSync` away; there is no fail-open risk in
  treating a bad cache as a miss.
- **Fix the existing suite in this slice.** `test/infisical.test.ts` has two tests that *assert the
  bug*: "writes cache file with mode 0600 on successful fetch" and the `noCache` test's
  `expect(fs.existsSync(cacheFile)).toBe(false)`. The first must be rewritten (S1: assert the file is
  **not** created at all; S2: assert it is created, sealed, and 0600 by `fstat` after `rename`). The
  second stays valid. For G3, write the "no plaintext secret value appears anywhere under the config
  dir after a fetch" test **first** and paste its failure against the current implementation into the
  PR — the existing suite cannot serve as red-state proof because it was written to pass on the
  current behavior.

**Files:** `packages/env/src/cache.ts` (rewritten), `packages/env/src/infisical.ts` (`cacheKeys`,
`keyNames`, mode switch), `packages/env/src/hierarchy.ts` (pass `NARROWED_KEYS`, use `keyNames`),
`packages/env/src/types.ts` (if the option types live there — they currently live in `infisical.ts`;
do not move them), `packages/env/test/infisical.test.ts` (rewrite the two disk assertions),
`packages/env/test/cache.test.ts` (**new** — memo TTL, purge, mode parsing, allowlist).

**Definition of done (machine-checkable):**

```bash
cd packages/env && pnpm vitest run
#  red-state first (G3): the "no secret value on disk" test fails against the pre-slice code.
#  Cases (each with XDG_CONFIG_HOME pointed at a fresh mkdtemp, spawnSync mocked as today):
#   - fetch with a sentinel value 'SENTINEL-DO-NOT-PERSIST' → no file under $XDG_CONFIG_HOME/minion
#     contains that substring (walk the dir, read raw bytes)          ← the proposal's whole point
#   - second fetch in the SAME process → spawnSync called once (memo hit)
#   - second fetch after TTL expiry (vi.useFakeTimers, +301s) → spawnSync called twice
#   - MINION_ENV_CACHE=off → spawnSync called twice in the same process, nothing written
#   - MINION_ENV_CACHE=nonsense → behaves as 'memory' AND warns naming the bad value (never 'disk')
#   - a pre-existing legacy plaintext infisical-cache.json is DELETED on first fetch, exactly one
#     stderr warning is emitted, and its contents are never returned to the caller
#   - cacheKeys:['MINION_SECRETS_KEY'] → a later hit returns only that key, and keyNames still lists
#     the legacy names, so hierarchy's stale-key warning fires identically on hit and on miss
#   - noCache:true → no cache-content read/write and spawn every time; a recognized legacy plaintext
#     file is still purged as the security cleanup defined above
#   - different domain or cacheKeys inputs never share a memo entry; reordered/duplicated cacheKeys do
#     share one entry after canonicalization
pnpm vitest run src/hierarchy.master-key-only.test.ts    # untouched sibling still green
cd ../.. && pnpm run typecheck-all && pnpm run lint-all
rg -n 'writeFileSync' packages/env/src/                  # → ZERO hits after S1
```

---

### S2 — Bring the disk cache back, sealed to this machine

**Tags:** `security`, `infra`, `test` · **Estimate:** 5–7 h

**Goal:** cross-process caching returns — same TTL, same ergonomics as before the fix — but the file
on disk is AES-256-GCM ciphertext bound to this machine and this user, written atomically with mode
`0600` **enforced, not requested**.

**Do:**

- **Key ladder, in order, first hit wins:**
  1. `MINION_ENV_CACHE_KEY` — base64, 32 bytes, operator-supplied (this is the hook for an OS keyring
     or a password manager exported at shell init). Reject a wrong-length or non-base64 value with a
     named error rather than silently deriving something else. Validation must be strict (alphabet,
     padding, and canonical round-trip), because `Buffer.from(value, 'base64')` alone accepts malformed
     input.
  2. A machine-local key file `<cacheDir()>/cache.key` — 32 random bytes from `crypto.randomBytes`,
     created on demand and never logged. Creation must be concurrency-safe: create the final key path
     with `flag:'wx'` and mode `0600`; on `EEXIST`, discard the candidate and read the winning file.
     Do not use last-writer-wins rename for the key, because concurrent processes could encrypt with
     different keys. Enforce `0600` on an existing valid key file before use.
- **Derive, don't use raw.** `crypto.hkdfSync('sha256', keyMaterial, salt, info, 32)` (present in Node
  22, no new dependency) where `info` is a version string and `salt` is stable **binding material**:
  `/etc/machine-id` if readable, else `os.hostname()`, mixed with `os.userInfo().uid`. Store a short
  non-reversible fingerprint of the binding material in the envelope header so a file copied to
  another machine is *detected* as foreign rather than failing with a confusing GCM error.
- **Envelope** (JSON so the read path stays simple, one blob for the whole cache file):
  `{ v: 1, alg: 'aes-256-gcm', kdf: 'hkdf-sha256', boundTo: '<8-byte hex fingerprint>', iv: '<b64,
  12 bytes, random per write>', tag: '<b64>', ct: '<b64>' }`. No key material, no key-file path, and
  no variable names in the header — the header is the part that stays readable.
- **Every decrypt failure is a cache miss.** Wrong `boundTo`, GCM auth failure, unknown `v`, bad JSON,
  missing key file → return `null`, refetch, and (once per process) warn that the cache was discarded
  and why *categorically* ("bound to a different machine" / "corrupt or tampered"). Never delete a
  file you could not authenticate beyond the one legacy-plaintext case S1 already handles — an
  unreadable file is evidence. “Discarded” here means ignored as a cache entry, not deleted from disk.
- **Write atomically and enforce the mode.** `writeFileSync(tmp, data, { mode: 0o600, flag: 'wx' })`
  where `tmp` = `<path>.<pid>.<counter>.tmp`, then `fs.renameSync(tmp, path)`. Rename is atomic within
  a directory and carries the tmp file's `0600` onto the destination — which is precisely what fixes
  §0 fact 3 (an existing `0644` file keeps `0644` under a plain `writeFileSync`) and §0 fact 4 (torn
  concurrent writes) in one move. Clean up the tmp file on any failure.
- **Enforce the directory mode too.** After `mkdirSync(dir, {recursive:true, mode:0o700})`, `statSync`
  the dir; if the mode has any group/other bits set, `chmodSync(dir, 0o700)` and warn once. The
  directory is ours and already holds `infisical-auth.json` — but do not touch anything else in it.
- **`MINION_ENV_CACHE=disk` becomes the default.** `memory` and `off` keep working exactly as S1
  defined them. The memo from S1 stays in front of the file (memo hit → no file read at all).
- **Never widen what is stored.** The allowlist from S1 applies to the sealed payload: one entry,
  `MINION_SECRETS_KEY`, plus the name-only `keyNames` list.

**Files:** `packages/env/src/cache.ts` (disk path + envelope), `packages/env/src/cache-crypto.ts`
(**new** — key ladder, HKDF, seal/open, binding fingerprint; separate file so it is testable and so
the anti-recurrence guard in S3 has one place to point at),
`packages/env/test/cache-crypto.test.ts` (**new**), `packages/env/test/infisical.test.ts` (restore
the disk assertions in their sealed form).

**Definition of done (machine-checkable):**

```bash
cd packages/env && pnpm vitest run
#   - seal→open roundtrip returns the identical entry map
#   - the raw file bytes contain neither the sentinel secret value nor the string 'MINION_SECRETS_KEY'
#     as a plaintext substring                                   ← re-run of S1's core assertion
#   - flipping ONE byte of ct  → open() returns null (miss), no throw, exactly one warning
#   - flipping ONE byte of tag → open() returns null (miss), no throw
#   - a foreign 'boundTo'      → open() returns null (miss) and the warning says "different machine"
#   - v:2 (unknown version)    → open() returns null (miss), no throw
#   - key file is created 0600; the cache file after rename is 0600 EVEN IF a 0644 file pre-existed
#     (create it 0644 first — this is the regression test for the mode bug)
#   - the cache dir is chmod'd 0700 when it pre-exists as 0755
#   - MINION_ENV_CACHE_KEY set to a valid 32-byte b64 → used in preference to the key file, and NO
#     cache.key is created; a 16-byte or non-base64 value → named error, no silent fallback
#   - two processes racing to create cache.key converge on the same 32-byte key; the losing candidate
#     is not used and both can open the resulting cache
#   - TTL still honored across processes (write, fake-advance 301s, fresh module, → miss)
#   - two interleaved writes (write A, write B, both complete) leave a file that opens cleanly and
#     contains B — never a truncated/unparseable file
cd ../.. && pnpm run typecheck-all && pnpm run lint-all
rg -n 'writeFileSync' packages/env/src/    # → only inside the atomic writer, and only with flag 'wx'
```

---

### Slice 3 — The published contract: docs, changeset, doctor probe, anti-recurrence

**Tags:** `security`, `docs`, `infra`, `test` · **Estimate:** 3–5 h

**Goal:** the behavior change reaches consumers as a stated contract; the residual risk is written
down in the operator's terms (the proposal's second DoD clause, which applies to what encryption
*cannot* buy); and the next person cannot reintroduce a plaintext write without a test going red.

**Do:**

- **README `## Cache` + `## Security` rewrite** (`packages/env/README.md`) — the current text
  ("cached at … with mode `0600`") is now wrong in two ways and must not survive. Replace with the
  three modes, the key ladder, the envelope version, and a short, blunt **threat model**:
  - *Defends against:* the file being copied off the machine (backup, cloud sync, support tarball,
    a `grep` across `$HOME`), another local user (mode `0600`/`0700`), and the file being read on a
    different machine (binding).
  - *Does not defend against:* anything running as your user or as root on this machine — it can read
    the key file and the cache together. **Say this in one sentence, not a footnote.** This sentence
    is the "explicit documented acceptance of the tradeoff" the proposal asks for.
  - *Rotation:* if a plaintext cache was ever synced or backed up, rotate `MINION_SECRETS_KEY` — with
    a pointer to `2026-05-20-centralized-secrets-vault` for how.
- **Changeset** (`.changeset/<name>.md`, house prose style — see `.changeset/db-drop-dead-turso-schema.md`).
  Version rule, decided here so the implementer does not have to: **`minor`** if S1+S2 ship together
  (`@minion-stack/env` is `1.1.0`; no exported signature breaks and cross-process caching still
  works, just sealed) — **`major`** if S2 is deferred, because removing cross-process caching from a
  `1.x` package is a real behavior break for anyone running offline. Body must state: what is now on
  disk, that the legacy plaintext file is deleted on first run, the three `MINION_ENV_CACHE` modes,
  and the rotation advice.
- **`minion doctor` probe** (`packages/cli/src/commands/doctor.ts`, the `(meta)` row): report the
  active cache mode, whether a legacy plaintext cache was found and removed, and whether the config
  dir mode is looser than `0700`. **Warnings column only — do not add or change an exit code**;
  `doctor` already returns 3/1/0 and scripts depend on that. A changeset for `@minion-stack/cli`
  (`patch`) covers this. `cacheStatus()` must perform the same once-per-process cache initialization
  (including legacy purge) without fetching secrets, and `doctor` must call it before rendering the
  `(meta)` row. That makes `legacyRemoved` truthful for this doctor run even when no subproject is
  cloned.
- **Root `.env.example`**: `MINION_ENV_CACHE` (with the three values and "off = never cache, use on
  CI and shared machines") and `MINION_ENV_CACHE_KEY` (optional, base64 32 bytes). **Nothing in
  `.env.defaults`** — a committed default here would pin every machine to one mode.
- **Anti-recurrence guard test** (`packages/env/test/no-plaintext-write.test.ts`): drive the public
  API with a sentinel value across all three modes, then walk `$XDG_CONFIG_HOME/minion` recursively
  and assert no file's raw bytes contain the sentinel. Behavioral, not source-text — it survives a
  refactor that moves the write somewhere else, which a `rg` assertion would not. Prove the guard
  itself: temporarily make the writer emit plaintext, watch the test fail, revert, and say so in the
  PR.

**Files:** `packages/env/README.md`, `.env.example`, `packages/cli/src/commands/doctor.ts`,
`packages/env/src/cache.ts` (export a small `cacheStatus()` for the probe — status only: mode,
`legacyRemoved`, `dirModeLoose`; **never** entries or values), `packages/env/src/index.ts` (export it),
`packages/env/test/no-plaintext-write.test.ts` (**new**), `.changeset/<generated>.md`.

**Definition of done (machine-checkable):**

```bash
cd /home/agent/work
pnpm run ci                                   # build-all, typecheck-all, lint-all, test-all, changeset:status
ls .changeset/*.md | xargs grep -l '@minion-stack/env'      # → the new changeset exists
rg -n 'MINION_ENV_CACHE' .env.example                       # → documented, all three modes
rg -n 'MINION_ENV_CACHE' .env.defaults                      # → ZERO hits
rg -n 'mode `0600`' packages/env/README.md                  # → the stale claim is gone/reworded
rg -n 'does not|cannot' packages/env/README.md              # → the limitation sentence is present
node -e "import('@minion-stack/env').then(m=>console.log(typeof m.cacheStatus))"   # → function
node dist/cli.js doctor --json | jq '.[0]'                  # → (meta) row shows the cache mode
```

---

## 3. Files touched (consolidated)

| File | Slice | Nature |
|---|---|---|
| `packages/env/src/cache.ts` | S1, S2, S3 | memo → sealed disk cache; atomic `0600` writer; legacy purge; mode switch; `cacheStatus()` |
| `packages/env/src/cache-crypto.ts` | S2 | **new** — key ladder, HKDF, AES-256-GCM envelope, machine binding |
| `packages/env/src/infisical.ts` | S1 | `cacheKeys` allowlist, `keyNames` on the result, mode switch respected |
| `packages/env/src/hierarchy.ts` | S1 | pass `NARROWED_KEYS` as `cacheKeys`; build the stale-key warning from `keyNames` |
| `packages/env/src/index.ts` | S3 | export `cacheStatus` |
| `packages/env/test/infisical.test.ts` | S1, S2 | the two tests that assert the current disk behavior are rewritten |
| `packages/env/test/cache.test.ts` | S1 | **new** — memo, TTL, purge, mode parsing, allowlist |
| `packages/env/test/cache-crypto.test.ts` | S2 | **new** — roundtrip, tamper, binding, mode enforcement, concurrency |
| `packages/env/test/no-plaintext-write.test.ts` | S3 | **new** — behavioral anti-recurrence guard |
| `packages/env/README.md` | S3 | cache + threat model rewrite (current text is factually wrong) |
| `packages/cli/src/commands/doctor.ts` | S3 | `(meta)` row probe — warnings column only, no exit-code change |
| `.env.example`, `.changeset/<name>.md` | S3 | operator docs + release contract |

**Zero DDL. Zero schema files. Zero `.svelte` files. No new runtime dependency** (`node:crypto`
`hkdfSync` + `createCipheriv` are in Node 22, which the package already requires via `engines`).

## 4. Cross-repo impact

Checked against AGENTS.md "Cross-Project Impact Zones". This is a shared-package change, but the
dependency graph is unusually narrow — verified, not assumed:
`rg '@minion-stack/env' --include package.json` returns **only** `packages/cli`.

| Surface | Impact | Mitigation / evidence |
|---|---|---|
| `@minion-stack/cli` (same repo, `workspace:*`) | **Real but contained** — every `minion dev/build/test/check/run/sync-env/doctor` call resolves env through this cache | Same PR chain, same release; S3 adds the `doctor` probe so an operator can see the mode; sequential `fanout` covered by S1's memo |
| Operators' machines with `minion` installed globally | **Behavior change on upgrade**: the legacy plaintext cache is deleted on first run; a new sealed one is created only when disk mode is active and a successful fetch supplies cacheable data | Deletion is recoverable (refetch); one stderr warning explains it; changeset states it |
| Deployed boxes (Netcup gateway, factory) | **Unknown until S0** — if they source `MINION_SECRETS_KEY` from a deploy-written `.env` rather than `minion sync-env`, impact is zero | S0 item 3 settles it. If they *do* use the CLI, S2 is mandatory before the release, not optional (⚠️ A1) |
| Public npm `@minion-stack/env` | Third-party consumers (none known, but the package is public) get changed cache semantics | Changeset prose + the `minor`/`major` rule in S3 |
| `minion/` gateway | **No code change.** It consumes `MINION_SECRETS_KEY` from its environment; it does not import this package (verify in S0 — the repo is checked out but out of this spec's scope) | If the grep finds an import, that is a finding for its own proposal — do not widen this spec |
| `minion_hub`, `minion_site`, `paperclip-minion`, `pixel-agents`, `minion_plugins` | **None** — no dependency on `@minion-stack/env` | the `package.json` grep above |
| Gateway WS protocol / `@minion-stack/shared` / DB schema / auth | **None** — no frame, event, REST contract, table or key-derivation path is touched | — |
| UI | **None** — zero `.svelte` files ⇒ `lint:design`/`lint:tokens` and the ui-design-governance skill do **not** apply (§4b) | — |

### ⚠️ A1 — S1 alone costs latency and offline tolerance

Between S1 and S2, every `minion` invocation shells out to `infisical` (network + Universal Auth).
On a flaky or offline machine the layer-2 fetch fails, `resolveEnv` warns and continues, and
`MINION_SECRETS_KEY` is simply absent — which surfaces later as a gateway that cannot open its vault,
far from the cause. Mitigations, in order: ship S2 in the same release; the layer-5 `.env.local`
escape hatch still overrides everything below `process.env`; and if S2 slips, the changeset says
`major` and names this regression outright rather than letting an operator discover it at 2am.

### ⚠️ A2 — the plaintext file may have already left the machine

If S0 finds `infisical-cache.json` inside a synced or backed-up path, or on a machine with looser
permissions than expected, then `MINION_SECRETS_KEY` — the key to the entire gateway vault — has
plausibly been copied somewhere it should not be. **This spec does not rotate it** (§5). What it does
is (a) delete the file, (b) make the next one unreadable off-machine, and (c) tell the operator, both
in the S1 stderr warning and in the S3 README, to rotate. If S0 turns up evidence of exposure, file
the rotation proposal with the finding attached and link it from the PR. An honest "we found it in
a Synology-synced folder" is worth more than a clean-looking PR.

### ⚠️ A3 — encryption next to its own key is a bounded win

Stated once, plainly, because a reviewer will and should raise it: an attacker executing as your user
reads `cache.key` and `infisical-cache.json` with equal ease, so S2 buys **nothing** against local
compromise. It buys protection against file egress and accidental disclosure, which is the failure
mode a `~/.config` JSON blob actually has. The larger win in this spec is S1 — the value is not on
disk at all unless `MINION_ENV_CACHE=disk`, and only one narrowed key is ever stored. The README
sentence in S3 must make this trade explicit rather than implying the file is "encrypted, therefore
safe."

## 5. Out of scope (explicit)

- **Vault redesign** (the proposal's own exclusion) — no change to `MINION_SECRETS_KEY`'s role, the
  libsodium `crypto_secretbox` scheme, `runtime.secrets`, or the `minion secrets` CLI.
- **Rotating `MINION_SECRETS_KEY`.** S0 gathers the evidence and A2 says what to do with it; the
  rotation itself is its own proposal with its own blast radius (every vault row).
- **OS keyring integration** (libsecret / macOS Keychain / Windows DPAPI). The `MINION_ENV_CACHE_KEY`
  env var is deliberately the seam for it — an operator can export it from a keyring at shell init
  today. Native integration means a platform-conditional dependency and a headless-box fallback story;
  worth a proposal, not this fix.
- 🚩 **`minion dev --all` embeds every resolved secret value into a shell command line.**
  `packages/cli/src/commands/fanout.ts:29-36` builds `KEY='value' … cmd` strings and hands them to
  `concurrently`, so every secret is visible in `ps` and `/proc/<pid>/cmdline` to any local user for
  the lifetime of the dev session. Found while verifying this spec's blast radius. It is a **larger**
  plaintext exposure than the one this proposal names, it is in a different package, and absorbing it
  would blow the slice sizing — **file it as its own proposal** and link it from the PR. Do not fix it
  here.
- **`minion sync-env` writing plaintext `<sub>/.env.local`.** By design (layer 5), gitignored, and the
  documented escape hatch. Changing it is an ergonomics decision, not a bug fix.
- **`~/.config/minion/infisical-auth.json`** (Universal Auth client secret, same directory, same
  `0600`-only story per AGENTS.md). S2's directory-mode enforcement incidentally helps it; sealing it
  is a separate proposal.
- **Making the Infisical layer fatal when it fails.** Today an unreachable layer 2 is a warning
  (`hierarchy.ts:79`). Arguably wrong — but changing it is a fail-closed policy decision affecting
  every `minion` command, and bundling it here would make A1's regression indistinguishable from a
  deliberate hard failure.
- **Any UI.**

## 6. End-to-end verification

Run with S1 + S2 + S3 merged in `minion-meta`, from a clean checkout and a **throwaway**
`XDG_CONFIG_HOME` (never point this at your real config dir).

```bash
cd /home/agent/work && pnpm install && pnpm run build-all

export XDG_CONFIG_HOME=$(mktemp -d)
SENTINEL='SENTINEL-DO-NOT-PERSIST'

# 0. Reproduce the bug one last time on the OLD build, to have the before/after on the record:
#    write a legacy-shaped plaintext cache containing $SENTINEL, then confirm the new build deletes it.
mkdir -p "$XDG_CONFIG_HOME/minion" && printf '{"minion-core|dev":{"env":{"X":"%s"},"fetchedAt":%s,"ttlMs":300000}}' \
  "$SENTINEL" "$(date +%s)000" > "$XDG_CONFIG_HOME/minion/infisical-cache.json"
chmod 644 "$XDG_CONFIG_HOME/minion/infisical-cache.json"     # the mode bug, staged deliberately

# 1. Any command that resolves env purges it and reseals (requires working Infisical CLI/auth and a
#    successful minion-core fetch for the reseal assertions below)
node packages/cli/dist/cli.js doctor                          # → stderr warning: legacy plaintext cache removed
grep -rlF "$SENTINEL" "$XDG_CONFIG_HOME" && echo "FAIL: plaintext survived" && exit 1   # → no match
stat -c '%a' "$XDG_CONFIG_HOME/minion/infisical-cache.json"   # → 600 (NOT the 644 we staged)
stat -c '%a' "$XDG_CONFIG_HOME/minion" "$XDG_CONFIG_HOME/minion/cache.key"              # → 700, 600
jq -r 'keys | join(",")' "$XDG_CONFIG_HOME/minion/infisical-cache.json"                 # → v,alg,kdf,boundTo,iv,tag,ct
grep -c 'MINION_SECRETS_KEY' "$XDG_CONFIG_HOME/minion/infisical-cache.json"             # → 0

# 2. It is a real cache, not a decorative one
node packages/cli/dist/cli.js sync-env hub   # cold: spawns `infisical`
node packages/cli/dist/cli.js sync-env hub   # warm: served from the sealed file (time it, or strace -f -e execve)

# 3. Machine binding actually binds
python3 -c "import json,sys;p=sys.argv[1];d=json.load(open(p));d['boundTo']='deadbeefdeadbeef';json.dump(d,open(p,'w'))" \
  "$XDG_CONFIG_HOME/minion/infisical-cache.json"
node packages/cli/dist/cli.js doctor          # → warns "different machine", refetches, no crash

# 4. The opt-out is real
rm -rf "$XDG_CONFIG_HOME"/minion; export MINION_ENV_CACHE=off
node packages/cli/dist/cli.js doctor
ls "$XDG_CONFIG_HOME/minion/" 2>/dev/null | grep -E 'infisical-cache|cache.key' && echo "FAIL: wrote with cache off" && exit 1
unset MINION_ENV_CACHE

# 5. Gates
pnpm run ci                                                   # incl. changeset:status
git diff --name-only <base>...HEAD | grep -E '\.svelte$'            && echo "FAIL: UI out of scope" && exit 1
git diff --name-only <base>...HEAD | grep -E 'supabase/|drizzle/'   && echo "FAIL: no DDL"          && exit 1
```

**Ship gate:** §6 all green; the proposal's DoD checked clause by clause (machine-local-key encryption
at rest — S2, step 1/3 above; documented acceptance of the residual tradeoff — S3's README sentence,
A3); S1's red-state failure against the old implementation pasted into the PR; the S3 guard test shown
failing when the writer is temporarily un-sealed; S0's per-machine inventory pasted **including any
machine that could not be checked**; the `fanout.ts` finding filed as its own proposal and linked;
and — per §4b's `security` rule — a **human** approval on the record, because a green command list is
evidence, not a decision.
