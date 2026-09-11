/** Fail-closed preflight: recomputes the migration-authority inventory fresh and fails before any
 * mutation when two trees claim the same physical schema. Never rewrites an applied migration or
 * stamps/suppresses a hash mismatch — it only reports. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildInventory, KNOWN_TREES } from './migration-authority.mjs';

export function evaluateDrift(inventory) {
  const failures = [
    ...inventory.duplicateAuthorities.map((c) => ({ kind: c.kind, schemaGroup: c.schemaGroup, detail: c })),
    ...inventory.schemaGaps.filter((g) => g.confidence === 'verified-absent-in-inventoried-migrations')
      .map((g) => ({ kind: 'schema-gap', schemaGroup: g.schemaGroup, detail: g })),
  ];
  return { pass: failures.length === 0, failures };
}

const CHILD_PLAN_OWNER = { 'legacy-libsql': '@minion-stack/db + minion_hub (Hub CLAUDE.md owns run-migrations.ts)',
  'hub-postgres': 'minion_hub/src/server/db (Hub CLAUDE.md) + packages/db drizzle.pg.config.ts owner',
  'gateway-sqlite': 'minion/ (gateway CLAUDE.md)', 'paperclip-postgres': 'paperclip-minion/ (AGENTS.md)' };

export function renderGaps(inventory, drift) {
  const rows = drift.failures.map((f, i) => {
    const scope = f.kind === 'divergent-hash' ? `filename \`${f.detail.name}\` hashes diverge across ${f.detail.entries.map((e) => e.tree).join(', ')}`
      : f.kind === 'two-writers-same-prefix' ? `numeric prefix \`${f.detail.prefix}\` independently owned by ${f.detail.owners.map((o) => o.tree).join(', ')}`
      : `table \`${f.detail.table}\` has no CREATE in any inventoried ${f.schemaGroup} tree`;
    const owner = CHILD_PLAN_OWNER[f.schemaGroup] ?? 'unassigned — root must name an owner before dispatch';
    return `${i + 1}. **${f.schemaGroup} / ${f.kind}** — ${scope}\n   - Owner: ${owner}\n   - Next gated plan: create a bounded child PLAN (exact wiring + disposable migration test) selecting ONE authority for \`${f.schemaGroup}\`; do not apply, stamp or delete any migration here. This inventory entry is the admission gate; it does not close DATA-02 by itself.`;
  }).join('\n');
  return `# Migration drift gaps\n\nGenerated ${inventory.generatedAt} by \`node scripts/qc/migration-drift-gate.mjs\`. Fail-closed preflight: recomputed fresh from the current filesystem, never from a cached document. ${drift.pass ? 'No conflict detected in this inventory pass.' : `${drift.failures.length} conflict(s) require an owned child plan before DATA-02 can close.`}\n\n${rows || 'None.'}\n\n## Serialization note\n\nPer ROADMAP D360-06/phase10, any additive-SQL change to a conflicting schema must serialize with phase10's additive-only ownership; this gate does not itself apply or reconcile a migration.\n`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const rootIdx = args.indexOf('--root');
  const root = rootIdx >= 0 ? path.resolve(args[rootIdx + 1]) : fileURLToPath(new URL('../../', import.meta.url));
  const inventory = buildInventory(root, KNOWN_TREES);
  const drift = evaluateDrift(inventory);
  const metaRoot = fileURLToPath(new URL('../../', import.meta.url));
  const output = path.join(metaRoot, '.planning/phases/15-data-pipelines/15-MIGRATION-GAPS.md');
  if (args.includes('--check')) {
    if (!drift.pass) {
      console.error(JSON.stringify({ pass: false, failures: drift.failures.length }));
      process.exitCode = 1;
    } else {
      console.log(JSON.stringify({ pass: true, failures: 0 }));
    }
  } else {
    fs.writeFileSync(output, renderGaps(inventory, drift));
    console.log(JSON.stringify({ wrote: path.relative(metaRoot, output), pass: drift.pass, failures: drift.failures.length }));
  }
}
