/** Read-only migration authority inventory. Never opens a network/DB connection or mutates a migration file. */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const digest = (s) => createHash('sha256').update(s).digest('hex');

export function safeSource(root, relative) {
  if (path.isAbsolute(relative) || relative.split(/[\\/]/).some((p) => p === '..' || p.startsWith('.env'))) {
    throw new Error(`Unsafe source path: ${relative}`);
  }
  const absolute = path.resolve(root, relative);
  const base = fs.realpathSync(root);
  if (!fs.existsSync(absolute)) return null;
  const real = fs.realpathSync(absolute);
  if (real !== base && !real.startsWith(base + path.sep)) throw new Error(`Source escapes root: ${relative}`);
  return fs.readFileSync(real, 'utf8');
}

// Declarative registry of every migration tree found by source inspection (2026-09-10). Each tree is a
// candidate *authority* for one physical schema group. `schemaGroup` is the sharing hypothesis under
// test, not an assumption: two trees only "collide" when their inventoried content actually overlaps or
// their independent numbering sequences actually clash (see detectDuplicateAuthority).
export const KNOWN_TREES = [
  { id: 'hub-legacy-drizzle', schemaGroup: 'legacy-libsql', dir: 'minion_hub/drizzle', kind: 'drizzle-sequential',
    consumer: 'minion_hub/src/server/run-migrations.ts reads ./drizzle against TURSO_DB_URL' },
  { id: 'packages-db-legacy-drizzle', schemaGroup: 'legacy-libsql', dir: 'packages/db/drizzle', kind: 'drizzle-sequential',
    consumer: '@minion-stack/db/schema, imported by minion_hub AND minion_site (both drizzle(client,{schema}) over TURSO_DB_URL)' },
  { id: 'hub-supabase', schemaGroup: 'hub-postgres', dir: 'minion_hub/supabase/migrations', kind: 'supabase-timestamp',
    consumer: 'minion_hub SUPABASE_DB_URL; no minion_hub/supabase/config.toml project link found on disk' },
  { id: 'meta-root-supabase', schemaGroup: 'hub-postgres', dir: 'supabase/migrations', kind: 'supabase-timestamp',
    consumer: 'packages/db/drizzle.pg.config.ts generates here (out: ../../supabase/migrations); supabase/config.toml links project_id' },
  { id: 'gateway-sqlite', schemaGroup: 'gateway-sqlite', dir: 'minion/src/db/migrations', kind: 'ad-hoc-numbered',
    consumer: 'minion gateway local/embedded sqlite state' },
  { id: 'paperclip-postgres', schemaGroup: 'paperclip-postgres', dir: 'paperclip-minion/packages/db/src/migrations', kind: 'drizzle-sequential',
    consumer: 'paperclip-minion packages/db (own drizzle-kit sequence)' },
];

// Hub Postgres tables reported (2026-09-08 QC memory) to have no CREATE statement anywhere in the
// monorepo (prod-only, applied out-of-band). Verified fresh against inventoried trees on every run,
// never trusted from memory alone.
export const KNOWN_GAP_CANDIDATES = { schemaGroup: 'hub-postgres', tables: ['organizations', 'flows', 'organization_members', 'member_roles'] };

function listSqlFiles(root, dir) {
  const absolute = path.join(root, dir);
  if (!fs.existsSync(absolute)) return null;
  return fs.readdirSync(absolute, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.sql'))
    .map((e) => e.name).sort()
    .map((name) => {
      const source = safeSource(root, path.join(dir, name));
      return { name, sha256: digest(source), bytes: source.length };
    });
}

export function inventoryTree(root, tree) {
  const files = listSqlFiles(root, tree.dir);
  if (files === null) return { ...tree, present: false, files: [], fileCount: 0 };
  return { ...tree, present: true, files, fileCount: files.length,
    firstFile: files[0]?.name ?? null, lastFile: files.at(-1)?.name ?? null };
}

// Two present trees registered under the same schemaGroup, both using their own independent short
// numeric prefix sequence, are a duplicate-authority collision even when no filename matches: each is
// an independent writer deciding apply order for what is declared as one physical schema.
function numericPrefix(name) { return name.match(/^(\d{4,})/)?.[1] ?? null; }

export function detectDuplicateAuthority(inventoried) {
  const conflicts = [];
  const groups = new Map();
  for (const t of inventoried) {
    if (!t.present) continue;
    if (!groups.has(t.schemaGroup)) groups.set(t.schemaGroup, []);
    groups.get(t.schemaGroup).push(t);
  }
  for (const [schemaGroup, trees] of groups) {
    if (trees.length < 2) continue;
    // Same filename, divergent content.
    const byName = new Map();
    for (const t of trees) for (const f of t.files) {
      if (!byName.has(f.name)) byName.set(f.name, []);
      byName.get(f.name).push({ tree: t.id, sha256: f.sha256 });
    }
    for (const [name, entries] of byName) {
      if (entries.length > 1 && new Set(entries.map((e) => e.sha256)).size > 1) {
        conflicts.push({ schemaGroup, kind: 'divergent-hash', name, entries });
      }
    }
    // Independent numeric-prefix sequences claiming the same schema (two writers), even with no
    // colliding filename: evidenced by an overlapping prefix used for two different filenames.
    const sequenced = trees.filter((t) => ['drizzle-sequential', 'ad-hoc-numbered'].includes(t.kind) && t.files.length);
    if (sequenced.length > 1) {
      const prefixOwners = new Map();
      for (const t of sequenced) for (const f of t.files) {
        const p = numericPrefix(f.name);
        if (!p) continue;
        if (!prefixOwners.has(p)) prefixOwners.set(p, []);
        prefixOwners.get(p).push({ tree: t.id, name: f.name });
      }
      for (const [prefix, owners] of prefixOwners) {
        const distinctTrees = new Set(owners.map((o) => o.tree));
        const distinctNames = new Set(owners.map((o) => o.name));
        if (distinctTrees.size > 1 && distinctNames.size > 1) {
          conflicts.push({ schemaGroup, kind: 'two-writers-same-prefix', prefix, owners });
        }
      }
    }
  }
  return conflicts;
}

export function detectSchemaGaps(inventoried, gapCandidates = KNOWN_GAP_CANDIDATES) {
  const trees = inventoried.filter((t) => t.schemaGroup === gapCandidates.schemaGroup);
  const present = trees.filter((t) => t.present);
  if (!present.length) {
    return gapCandidates.tables.map((table) => ({ table, schemaGroup: gapCandidates.schemaGroup, confidence: 'unavailable-environment' }));
  }
  const gaps = [];
  for (const table of gapCandidates.tables) {
    // The table name must be the CREATE TABLE target itself (optionally schema-qualified/quoted,
    // optionally IF NOT EXISTS), never merely referenced — e.g. a `references public.organizations`
    // foreign key inside an unrelated CREATE TABLE must not count as creating `organizations`.
    const pattern = new RegExp(`create\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?"?(?:\\w+"?\\."?)?${table}"?\\s*\\(`, 'i');
    const found = present.some((t) => t.files.some((f) => pattern.test(f.source ?? '')));
    if (!found) gaps.push({ table, schemaGroup: gapCandidates.schemaGroup, confidence: 'verified-absent-in-inventoried-migrations' });
  }
  return gaps;
}

// detectSchemaGaps above needs file *content*, not just name/hash; re-read on demand (kept out of the
// hot inventory path so tests exercising only names/hashes stay cheap).
function withSource(root, tree) {
  if (!tree.present) return tree;
  return { ...tree, files: tree.files.map((f) => ({ ...f, source: safeSource(root, path.join(tree.dir, f.name)) })) };
}

// This tool is filesystem-only by design (per program boundary: no network, no DB connections). It
// never attempts to read an applied-migration catalog; it only reports that fact so downstream tooling
// cannot mistake "no evidence" for "no drift".
export function checkAppliedCatalogAvailability(env = process.env) {
  const hints = ['TURSO_DB_URL', 'SUPABASE_DB_URL', 'SUPABASE_DB_URL_DIRECT'].filter((k) => Boolean(env[k]));
  return { available: false, reason: 'read-only inventory tool; never opens a network or database connection',
    envHintsPresent: hints };
}

export function buildInventory(root, trees = KNOWN_TREES, env = process.env, gapCandidates = KNOWN_GAP_CANDIDATES) {
  const inventoried = trees.map((t) => inventoryTree(root, t));
  const withContent = inventoried.map((t) => withSource(root, t));
  const stripped = withContent.map((t) => ({ ...t, files: t.files.map(({ source, ...rest }) => rest) }));
  return {
    generatedAt: new Date().toISOString(),
    trees: stripped,
    duplicateAuthorities: detectDuplicateAuthority(withContent),
    schemaGaps: detectSchemaGaps(withContent, gapCandidates),
    appliedCatalog: checkAppliedCatalogAvailability(env),
  };
}

const cell = (s) => String(s).replaceAll('|', '\\|');
export function renderReport(inventory) {
  const trees = inventory.trees.map((t) =>
    `|${t.id}|${t.schemaGroup}|${t.dir}|${t.present ? 'present' : 'absent-in-this-checkout'}|${t.fileCount}|${cell(t.consumer)}|`).join('\n');
  const conflicts = inventory.duplicateAuthorities.map((c) => c.kind === 'divergent-hash'
    ? `- **${c.schemaGroup}** divergent hash for \`${c.name}\`: ${c.entries.map((e) => `${e.tree}=${e.sha256.slice(0, 12)}`).join(' vs ')}`
    : `- **${c.schemaGroup}** two independent writers share numeric prefix \`${c.prefix}\`: ${c.owners.map((o) => `${o.tree}:${o.name}`).join(' vs ')}`
  ).join('\n') || 'None detected in this inventory pass.';
  const gaps = inventory.schemaGaps.map((g) => `- \`${g.table}\` (${g.schemaGroup}): ${g.confidence}`).join('\n') || 'None detected.';
  return `# Migration authority inventory\n\nGenerated ${inventory.generatedAt}. Read-only filesystem inventory; never connects to a database or network. This document is a source-of-truth candidate map, not a deployment or applied-migration certificate.\n\n## Applied-migration catalog\n\n${inventory.appliedCatalog.available ? 'Verified.' : `Not verified: ${inventory.appliedCatalog.reason}.`} Env hints present: ${inventory.appliedCatalog.envHintsPresent.join(', ') || 'none'}. This is an explicit evidence gap, not a pass.\n\n## Migration trees\n\n|Tree|Schema group|Directory|Status|Files|Consumer|\n|---|---|---|---|---|---|\n${trees}\n\n## Duplicate-authority conflicts\n\n${conflicts}\n\n## Schema gaps (declared table, no CREATE found in any inventoried tree)\n\n${gaps}\n\n## Recommendation\n\nOne owning tree per schema group: \`hub-postgres\` should be authored from a single migration directory with an explicit \`config.toml\` project link; \`legacy-libsql\` should retire one of \`minion_hub/drizzle\` or \`packages/db/drizzle\` rather than both generating against the same consumed schema. See \`15-MIGRATION-GAPS.md\` for the exact per-conflict child-plan proposal. This inventory does not itself resolve a conflict or apply a migration.\n`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const rootIdx = args.indexOf('--root');
  const root = rootIdx >= 0 ? path.resolve(args[rootIdx + 1]) : fileURLToPath(new URL('../../', import.meta.url));
  const inventory = buildInventory(root);
  const output = path.join(fileURLToPath(new URL('../../', import.meta.url)), '.planning/phases/15-data-pipelines/15-MIGRATION-AUTHORITY.md');
  fs.writeFileSync(output, renderReport(inventory));
  console.log(JSON.stringify({ root, trees: inventory.trees.length, present: inventory.trees.filter((t) => t.present).length,
    duplicateAuthorities: inventory.duplicateAuthorities.length, schemaGaps: inventory.schemaGaps.length }));
}
