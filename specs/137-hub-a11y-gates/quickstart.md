# Quickstart: verifying spec 137

In a hub checkout of `feat/137-a11y-gates` after `bun install --frozen-lockfile`,
`cp .env.example .env`, `bun run i18n:compile`, `bunx svelte-kit sync`:

1. **Green on the committed baselines** (SC-002): `bun run a11y` exits 0; every selected gate is `pass`.
2. **Helper self-test** (SC-003): `bunx vitest run src/lib/a11y/assert-pattern.mounted.test.ts`.
3. **One seeded failure per gate** (SC-001); revert each after seeing it fail:
   - suppressions: add `<!-- svelte-ignore a11y_autofocus -->` to any `.svelte` file → `bun run a11y --only suppressions` fails naming the file.
   - patterns: break one fixture in the self-test → `--only patterns` fails with the `assertPattern(...)` message.
   - specs: change an expected accessible name in `tests/e2e/ui-audit/canvas-accessibility.spec.ts` → `--only specs` fails.
   - stories: remove `aria-label` from an icon-only button story → `--only stories --stories <File>` fails with a `button-name` regression row.
   - pages: with the QA stack up, remove an accessible name on a swept page → `--only pages --routes <route>` fails with a regression row. Without a stack, edit a count in a downloaded CI run artifact and run `--only pages --artifacts <dir>`.
4. **Ratchet** (User Story 6.3): lower a ledger count by hand is NOT the way; fix the markup, run `bun run a11y --update-baseline`, commit the ledger.
5. **CI** (SC-004): on the PR, job `a11y` and the `qa-stack` step "Page conformance sweep" are green; note both durations.
