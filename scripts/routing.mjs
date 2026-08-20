#!/usr/bin/env node

// Work-type tag taxonomy + path-based routing rules.
// `routing.yml` is machine truth (JSON-compatible YAML, same convention as repo-policy.yaml):
// it declares the tag enum used by specs/proposals frontmatter and the glob -> tag rules that
// derive tags from a diff. Path rules are the authority for anything with a diff; the
// classifier only fills in where there is no diff yet.
//
// Commands:
//   node scripts/routing.mjs validate            schema + corpus check (tags in use are legal)
//   node scripts/routing.mjs generate [--check]  regenerate generated/routing.json + labeler configs
//   node scripts/routing.mjs show <repo-id>      effective rules for one repo
//   node scripts/routing.mjs tags <repo-id> <path...>   derive tags for changed paths
//   node scripts/routing.mjs verify-remote [--fixture path]   are the labeler files installed in the fleet?

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter } from './spec-frontmatter.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const routingPath = resolve(root, 'routing.yml');
const policyPath = resolve(root, 'repo-policy.yaml');
const generatedPath = resolve(root, 'generated/routing.json');
const labelerDir = resolve(root, 'generated/labeler');
// This repo is itself a fleet repo, so its labeler files are installed here rather than copied
// out: `generate` writes them and `generate --check` is the drift gate on the installed pair.
const selfRepoId = 'minion-meta';
const installedLabelerConfig = resolve(root, '.github/labeler.yml');
const installedLabelerWorkflow = resolve(root, '.github/workflows/labeler.yml');
export const LABELER_CONFIG_PATH = '.github/labeler.yml';
export const LABELER_WORKFLOW_PATH = '.github/workflows/labeler.yml';

const tagPattern = /^[a-z][a-z0-9-]*$/;
// Deliberately narrow: the glob dialect below understands `**`, `*` and `?` only. A character
// class or a backslash would parse as a literal here and as a class in minimatch (what the
// labeler action runs) — divergence between the two is worse than rejecting the pattern.
const globPattern = /^[A-Za-z0-9_.@+*?/-]+$/;
const topKeys = ['schemaVersion', 'sliceTagsRequiredFrom', 'tags', 'legacyTags', 'shared', 'repositories'];
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
// `slice_tags: [1:logic+test, 2:ui]` — one entry per slice, in slice order.
const sliceTagsEntryPattern = /^(\d+):([a-z0-9+-]+)$/;
// A spec nobody will execute is not routable work; everything else must carry slice tags.
const sliceTagsExemptStatuses = new Set(['superseded', 'rejected', 'retired', 'parked']);

// Format AND calendar validity — `datePattern` alone accepts 2026-13-45. A frontmatter `created`
// that fails this is not a real date, so nothing that reads it as one may treat it as an exemption.
export function isIsoDate(value) {
  if (typeof value !== 'string' || !datePattern.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function readRouting(path = routingPath) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`${path}: document must be valid JSON-compatible YAML: ${error.message}`);
  }
}

export function readFleetRows(path = policyPath) {
  try {
    return JSON.parse(readFileSync(path, 'utf8')).repositories.map((row) => ({ id: row.id, remote: row.remote, prBase: row.prBase }));
  } catch (error) {
    throw new Error(`${path}: cannot read canonical repository rows: ${error.message}`);
  }
}

export function readFleetIds(path = policyPath) {
  return readFleetRows(path).map((row) => row.id);
}

function keysExactly(value, expected, path, errors) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push(`${path}: must be an object`);
    return false;
  }
  for (const key of expected) if (!(key in value)) errors.push(`${path}.${key}: is required`);
  for (const key of Object.keys(value)) if (!expected.includes(key)) errors.push(`${path}.${key}: unknown field`);
  return true;
}

function sameMembers(actual, expected) {
  const a = [...actual].sort();
  const b = [...expected].sort();
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function validateGlob(glob, path, errors) {
  if (typeof glob !== 'string' || glob.length === 0) { errors.push(`${path}: must be a non-empty string`); return; }
  if (!globPattern.test(glob)) { errors.push(`${path}: '${glob}' uses an unsupported glob character (only ** * ? and path characters)`); return; }
  if (glob.startsWith('/')) errors.push(`${path}: '${glob}' must be repo-relative (no leading slash)`);
  if (glob.split('/').includes('..')) errors.push(`${path}: '${glob}' must not escape the repository`);
  for (const segment of glob.split('/')) {
    if (segment.includes('**') && segment !== '**') errors.push(`${path}: '${glob}' — '**' must be a whole path segment`);
  }
}

function validateRules(rules, derivable, path, errors) {
  if (!Array.isArray(rules)) { errors.push(`${path}: must be an array`); return; }
  rules.forEach((rule, index) => {
    const rulePath = `${path}[${index}]`;
    if (!keysExactly(rule, ['tags', 'paths'], rulePath, errors)) return;
    if (!Array.isArray(rule.tags) || rule.tags.length === 0) errors.push(`${rulePath}.tags: must be a non-empty array`);
    else {
      const seen = new Set();
      rule.tags.forEach((tag, tagIndex) => {
        if (!derivable.has(tag)) errors.push(`${rulePath}.tags[${tagIndex}]: '${tag}' is not a path-derivable tag`);
        if (seen.has(tag)) errors.push(`${rulePath}.tags[${tagIndex}]: duplicate tag '${tag}'`);
        seen.add(tag);
      });
    }
    if (!Array.isArray(rule.paths) || rule.paths.length === 0) errors.push(`${rulePath}.paths: must be a non-empty array`);
    else {
      const seen = new Set();
      rule.paths.forEach((glob, globIndex) => {
        validateGlob(glob, `${rulePath}.paths[${globIndex}]`, errors);
        if (seen.has(glob)) errors.push(`${rulePath}.paths[${globIndex}]: duplicate glob '${glob}'`);
        seen.add(glob);
      });
    }
  });
}

export function validateRouting(routing, { fleetIds = readFleetIds() } = {}) {
  const errors = [];
  if (!keysExactly(routing, topKeys, '$', errors)) return errors;
  if (routing.schemaVersion !== 1) errors.push('$.schemaVersion: must equal 1');
  if (typeof routing.sliceTagsRequiredFrom !== 'string' || !datePattern.test(routing.sliceTagsRequiredFrom))
    errors.push('$.sliceTagsRequiredFrom: must be an ISO date (YYYY-MM-DD) — the day per-slice tags became mandatory');

  const tagIds = [];
  const derivable = new Set();
  if (!Array.isArray(routing.tags) || routing.tags.length === 0) errors.push('$.tags: must be a non-empty array');
  else routing.tags.forEach((tag, index) => {
    const path = `$.tags[${index}]`;
    if (!keysExactly(tag, ['id', 'derived', 'description'], path, errors)) return;
    if (typeof tag.id !== 'string' || !tagPattern.test(tag.id)) errors.push(`${path}.id: malformed tag id`);
    else if (tagIds.includes(tag.id)) errors.push(`${path}.id: duplicate tag '${tag.id}'`);
    else tagIds.push(tag.id);
    if (typeof tag.derived !== 'boolean') errors.push(`${path}.derived: must be a boolean`);
    else if (tag.derived === true && typeof tag.id === 'string') derivable.add(tag.id);
    if (typeof tag.description !== 'string' || tag.description.trim().length < 10) errors.push(`${path}.description: must be a sentence (>=10 chars)`);
  });

  const legacyIds = [];
  if (!Array.isArray(routing.legacyTags)) errors.push('$.legacyTags: must be an array');
  else routing.legacyTags.forEach((tag, index) => {
    const path = `$.legacyTags[${index}]`;
    if (!keysExactly(tag, ['id', 'reason'], path, errors)) return;
    if (typeof tag.id !== 'string' || !tagPattern.test(tag.id)) errors.push(`${path}.id: malformed tag id`);
    else if (tagIds.includes(tag.id)) errors.push(`${path}.id: '${tag.id}' is a canonical tag, not a legacy one`);
    else if (legacyIds.includes(tag.id)) errors.push(`${path}.id: duplicate legacy tag '${tag.id}'`);
    else legacyIds.push(tag.id);
    // Same bar as `retired_reason`: dropping a value out of the enum is a justified act.
    if (typeof tag.reason !== 'string' || tag.reason.trim().length < 20) errors.push(`${path}.reason: must explain the sunset path (>=20 chars)`);
  });

  validateRules(routing.shared, derivable, '$.shared', errors);

  if (!Array.isArray(routing.repositories)) errors.push('$.repositories: must be an array');
  else {
    const ids = routing.repositories.map((row) => row?.id);
    if (!sameMembers(ids.filter((id) => typeof id === 'string'), fleetIds)) errors.push(`$.repositories: ids must be exactly the repo-policy fleet (${[...fleetIds].sort().join(', ')})`);
    routing.repositories.forEach((row, index) => {
      const path = `$.repositories[${typeof row?.id === 'string' ? row.id : `row-${index}`}]`;
      if (!keysExactly(row, ['id', 'rules'], path, errors)) return;
      validateRules(row.rules, derivable, `${path}.rules`, errors);
    });
  }
  return errors;
}

export function canonicalTags(routing) {
  return routing.tags.map((tag) => tag.id);
}

export function allowedTags(routing) {
  return new Set([...canonicalTags(routing), ...routing.legacyTags.map((tag) => tag.id)]);
}

// --- per-slice tags ----------------------------------------------------------------------
// §4b: "the slice is the routable unit, not the spec". The spec-level `tags` list is the union;
// `slice_tags: [1:logic+test, 2:ui]` is what a one-slice dev run actually routes on, so it is
// validated here — an unknown or missing slice tag is an unroutable slice, not a style nit.

export function sliceTagsRequired(routing, fm) {
  if (!fm) return false;
  if (sliceTagsExemptStatuses.has(fm.status)) return false;
  // A `created` that is not a real ISO date cannot prove the spec predates the cutoff — fail
  // closed (require slice_tags) rather than let a malformed value read as an exemption.
  if (!isIsoDate(fm.created)) return true;
  return fm.created >= routing.sliceTagsRequiredFrom;
}

export function parseSliceTags(value) {
  const errors = [];
  const slices = [];
  if (!Array.isArray(value)) return { slices, errors: ['slice_tags: must be a bracketed array (e.g. slice_tags: [1:logic+test, 2:ui])'] };
  if (value.length === 0) return { slices, errors: ['slice_tags: must list at least one slice (e.g. slice_tags: [1:logic])'] };
  value.forEach((entry, index) => {
    const match = typeof entry === 'string' ? entry.match(sliceTagsEntryPattern) : null;
    if (!match) { errors.push(`slice_tags[${index}]: malformed entry "${entry}" — expected <slice-number>:<tag>[+<tag>...]`); return; }
    slices.push({ index, number: Number(match[1]), tags: match[2].split('+').filter(Boolean) });
  });
  return { slices, errors };
}

// Only the house format (`| # | Slice | …`) is machine-readable; other bodies are prose and the
// frontmatter stands alone. Where the table exists, a row count mismatch means one of the two drifted.
export function sliceTableRowCount(body) {
  const lines = (body ?? '').split('\n');
  const header = lines.findIndex((line) => /^\|\s*#\s*\|\s*slices?\s*\|/i.test(line));
  if (header === -1) return null;
  let rows = 0;
  for (const line of lines.slice(header + 2)) {
    if (!line.trim().startsWith('|')) break;
    if (/^\|\s*\d+\s*\|/.test(line.trim())) rows += 1;
  }
  return rows === 0 ? null : rows;
}

export function validateSliceTags(routing, fm, body) {
  const canonical = canonicalTags(routing);
  const canonicalSet = new Set(canonical);
  const errors = [];
  if (fm.slice_tags === undefined) {
    if (sliceTagsRequired(routing, fm))
      errors.push(`missing slice_tags — specs created on or after ${routing.sliceTagsRequiredFrom} tag every slice (e.g. slice_tags: [1:logic+test, 2:ui]); see specs/TEMPLATE.md`);
    return errors;
  }
  const { slices, errors: parseErrors } = parseSliceTags(fm.slice_tags);
  errors.push(...parseErrors);

  slices.forEach(({ index, number }, position) => {
    if (number !== position + 1) errors.push(`slice_tags[${index}]: slice numbers must run 1..N in slice order (expected ${position + 1}, got ${number})`);
  });

  const union = new Set();
  for (const { index, tags } of slices) {
    const seen = new Set();
    for (const tag of tags) {
      if (!canonicalSet.has(tag)) errors.push(`slice_tags[${index}]: unknown tag "${tag}" — use one of ${canonical.join(', ')}`);
      else if (seen.has(tag)) errors.push(`slice_tags[${index}]: duplicate tag "${tag}"`);
      else { seen.add(tag); union.add(tag); }
    }
    const ordered = canonical.filter((tag) => seen.has(tag));
    if (seen.size === tags.length && ordered.join('+') !== tags.join('+'))
      errors.push(`slice_tags[${index}]: tags must be in canonical order (${ordered.join('+')})`);
  }

  // The spec's own tag list is the union of its slices' — a disagreement means one of them lies
  // about what the work is, and the gates would pick the wrong lane either way.
  if (slices.length && !parseErrors.length) {
    const declared = Array.isArray(fm.tags) ? fm.tags.filter((tag) => canonicalSet.has(tag)) : [];
    const missing = canonical.filter((tag) => union.has(tag) && !declared.includes(tag));
    const extra = declared.filter((tag) => !union.has(tag));
    if (missing.length) errors.push(`tags: missing ${missing.join(', ')} — the spec's tags must be the union of its slice_tags (${canonical.filter((tag) => union.has(tag)).join(', ')})`);
    if (extra.length) errors.push(`tags: ${extra.join(', ')} is declared on the spec but on no slice — tag the slice that does the work or drop it`);
  }

  const rows = sliceTableRowCount(body);
  if (rows !== null && slices.length && !parseErrors.length && rows !== slices.length)
    errors.push(`slice_tags: declares ${slices.length} slice(s) but the slice table lists ${rows} row(s)`);
  return errors;
}

// Minimatch subset: `**` spans path segments, `*` and `?` stop at `/`. Everything else literal.
export function globToRegExp(glob) {
  const segments = glob.split('/');
  let expression = '';
  segments.forEach((segment, index) => {
    const last = index === segments.length - 1;
    if (segment === '**') expression += last ? '.+' : '(?:[^/]+/)*';
    else {
      expression += segment.replace(/[.+^${}()|[\]\\]/g, '\\$&').replaceAll('*', '[^/]*').replaceAll('?', '[^/]');
      if (!last) expression += '/';
    }
  });
  return new RegExp(`^${expression}$`);
}

export function rulesFor(routing, repoId) {
  const row = routing.repositories.find((candidate) => candidate.id === repoId);
  if (!row) throw new Error(`repository '${repoId}' is not in routing.yml`);
  return [...routing.shared, ...row.rules];
}

export function tagsForPath(routing, repoId, path) {
  const order = canonicalTags(routing);
  const tags = new Set();
  for (const rule of rulesFor(routing, repoId)) {
    if (rule.paths.some((glob) => globToRegExp(glob).test(path))) for (const tag of rule.tags) tags.add(tag);
  }
  return order.filter((tag) => tags.has(tag));
}

// A PR's tags are the union over its changed files: a ui+logic diff gets both lanes' checks.
export function tagsForPaths(routing, repoId, paths) {
  const order = canonicalTags(routing);
  const tags = new Set(paths.flatMap((path) => tagsForPath(routing, repoId, path)));
  return order.filter((tag) => tags.has(tag));
}

export function globsByTag(routing, repoId) {
  const byTag = new Map();
  for (const rule of rulesFor(routing, repoId)) {
    for (const tag of rule.tags) byTag.set(tag, new Set([...(byTag.get(tag) ?? []), ...rule.paths]));
  }
  return canonicalTags(routing)
    .filter((tag) => byTag.has(tag))
    .map((tag) => [tag, [...byTag.get(tag)].sort()]);
}

// TODO(handoff): installed in minion-meta only (`.github/labeler.yml` + `.github/workflows/labeler.yml`,
// drift-gated by `generate --check`). The other 8 fleet repos are separate git repos with no checkout
// here: paste `generated/labeler/<id>.yml` into each repo's config (the gateway already labels
// channels — keep its entries) and copy `<id>.workflow.yml` where no labeler workflow exists, then
// confirm with `node scripts/routing.mjs verify-remote`.
// Tracked in proposals/2026-08-20-tag-routing-fleet-rollout.md.
function generatedHeader(repoId, target) {
  return [
    '# GENERATED FILE — do not edit.',
    '# Source: routing.yml in NikolasP98/minion-meta (pnpm run routing:generate).',
    `# Target repo: ${repoId}. Install: copy verbatim to ${target}`,
    `# (drift is caught by \`node scripts/routing.mjs verify-remote\` in minion-meta).`
  ];
}

// The work-type blocks alone. A repo that already labels by topic (the gateway labels every
// channel) keeps its own entries and pastes these in — so the fleet check looks for this block
// verbatim rather than for a byte-identical file, which would order maintainers to delete theirs.
export function labelerBlocks(routing, repoId) {
  const lines = [];
  for (const [tag, globs] of globsByTag(routing, repoId)) {
    lines.push(`${tag}:`, '  - changed-files:', '      - any-glob-to-any-file:');
    for (const glob of globs) lines.push(`          - "${glob}"`);
  }
  return `${lines.join('\n')}\n`;
}

// actions/labeler@v5 config. Only positive globs: the rules are a union, so every glob that
// contributes a tag can sit in one `any-glob-to-any-file` list without changing semantics.
// `security` and `perf` are declared, never derived, so they never appear here — which is also
// why `sync-labels` cannot strip a human-applied security label.
export function labelerText(routing, repoId) {
  return `${generatedHeader(repoId, LABELER_CONFIG_PATH).join('\n')}\n\n${labelerBlocks(routing, repoId)}`;
}

// The workflow that makes the labels real. Generated per repo so the label vocabulary can only
// come from routing.yml — a hand-written copy would drift the moment the taxonomy changes.
export function labelerWorkflowText(routing, repoId) {
  return `${[
    ...generatedHeader(repoId, LABELER_WORKFLOW_PATH),
    '#',
    '# PR labels derived from changed paths are the authoritative work-type routing',
    '# (specs/2026-08-17-sdlc-phase-gates-scoring-spec.md §4b): G4 and the merge scan read them.',
    'name: Labeler',
    '',
    'on:',
    '  pull_request_target:',
    '    types: [opened, synchronize, reopened, ready_for_review]',
    '',
    '# The job never checks out or executes PR code, so pull_request_target is safe here — and it',
    '# is what lets a PR from a fork be labelled at all.',
    'permissions:',
    '  contents: read',
    '  pull-requests: write',
    '',
    'concurrency:',
    '  group: labeler-${{ github.event.pull_request.number }}',
    '  cancel-in-progress: true',
    '',
    'jobs:',
    '  label:',
    '    # Never self-hosted: a labeler pinned to a dead runner queues forever and labels nothing.',
    '    runs-on: ubuntu-latest',
    '    timeout-minutes: 5',
    '    steps:',
    '      - name: Ensure the work-type labels exist',
    '        env:',
    '          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}',
    '        run: |',
    `          for tag in ${canonicalTags(routing).join(' ')}; do`,
    '            gh label create "$tag" --repo "$GITHUB_REPOSITORY" --color ededed --description "work type: $tag" || true',
    '          done',
    '',
    '      - name: Derive work-type labels from changed paths',
    '        uses: actions/labeler@v5',
    '        with:',
    `          configuration-path: ${LABELER_CONFIG_PATH}`,
    '          sync-labels: true'
  ].join('\n')}\n`;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  return value;
}

export function buildArtifact(routing) {
  const body = canonicalize({
    schemaVersion: routing.schemaVersion,
    sliceTagsRequiredFrom: routing.sliceTagsRequiredFrom,
    tags: routing.tags,
    legacyTags: [...routing.legacyTags].sort((a, b) => a.id.localeCompare(b.id)),
    shared: routing.shared,
    repositories: [...routing.repositories].sort((a, b) => a.id.localeCompare(b.id))
  });
  const contentHash = createHash('sha256').update(JSON.stringify(body)).digest('hex');
  return canonicalize({ ...body, contentHash });
}

function artifactText(routing) {
  return `${JSON.stringify(buildArtifact(routing), null, 2)}\n`;
}

export function generatedFiles(routing) {
  return [
    [generatedPath, artifactText(routing)],
    ...routing.repositories.flatMap((row) => [
      [resolve(labelerDir, `${row.id}.yml`), labelerText(routing, row.id)],
      [resolve(labelerDir, `${row.id}.workflow.yml`), labelerWorkflowText(routing, row.id)]
    ]),
    // minion-meta consumes its own output: these two are live, not copies awaiting install.
    [installedLabelerConfig, labelerText(routing, selfRepoId)],
    [installedLabelerWorkflow, labelerWorkflowText(routing, selfRepoId)]
  ];
}

// Tag usage across the committed corpus — the gate that keeps `legacyTags` a shrinking ledger.
export function collectTagUsage(dirs = ['specs', 'proposals'], base = root) {
  const usage = new Map();
  const violations = [];
  for (const dir of dirs) {
    for (const name of readdirSync(resolve(base, dir)).filter((file) => file.endsWith('.md') && file !== 'TEMPLATE.md' && !file.endsWith('.review.md')).sort()) {
      const parsed = parseFrontmatter(readFileSync(resolve(base, dir, name), 'utf8'));
      if (!parsed || parsed.fm.tags === undefined) continue;
      if (!Array.isArray(parsed.fm.tags)) { violations.push(`${dir}/${name}: tags must be a bracketed array (got a scalar)`); continue; }
      for (const tag of parsed.fm.tags) usage.set(tag, [...(usage.get(tag) ?? []), `${dir}/${name}`]);
    }
  }
  return { usage, violations };
}

// Slice tags are a spec-only concern: a proposal has no slices yet.
export function checkSliceTags(routing, base = root, dir = 'specs') {
  const errors = [];
  for (const name of readdirSync(resolve(base, dir)).filter((file) => file.endsWith('.md') && file !== 'TEMPLATE.md' && !file.endsWith('.review.md')).sort()) {
    const parsed = parseFrontmatter(readFileSync(resolve(base, dir, name), 'utf8'));
    if (!parsed) continue;
    for (const error of validateSliceTags(routing, parsed.fm, parsed.body)) errors.push(`${dir}/${name}: ${error}`);
  }
  return errors;
}

export function checkCorpus(routing, dirs = ['specs', 'proposals'], base = root) {
  const allowed = allowedTags(routing);
  const { usage, violations } = collectTagUsage(dirs, base);
  const errors = [...violations, ...(dirs.includes('specs') ? checkSliceTags(routing, base) : [])];
  for (const [tag, files] of usage) {
    if (!allowed.has(tag)) errors.push(`${files[0]}: unknown tag '${tag}' (${files.length} file(s)) — use one of ${canonicalTags(routing).join(', ')}`);
  }
  for (const tag of routing.legacyTags.map((entry) => entry.id)) {
    if (!usage.has(tag)) errors.push(`routing.yml: legacy tag '${tag}' is no longer used — delete it (the allowlist may only shrink)`);
  }
  return errors;
}

// --- fleet installation ------------------------------------------------------------------
// Generating a labeler config proves nothing: the labels only exist once the file is committed
// in the target repo. This is the drift/absence check for the 8 repos with no checkout here.

function ghFileText(remote, path, ref) {
  try {
    const content = execFileSync('gh', ['api', `repos/${remote}/contents/${path}?ref=${encodeURIComponent(ref)}`, '--jq', '.content'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return Buffer.from(content.replace(/\s/g, ''), 'base64').toString('utf8');
  } catch (error) {
    const stderr = error?.stderr?.toString() ?? '';
    if (stderr.includes('404') || stderr.includes('Not Found')) return null;
    // Auth/network failure must not masquerade as "not installed".
    throw new Error(`${remote}: cannot read ${path}: ${stderr.trim() || error.message}`);
  }
}

export function liveLabelerState(routing, rows = readFleetRows()) {
  const state = {};
  for (const row of routing.repositories) {
    const fleet = rows.find((candidate) => candidate.id === row.id);
    if (!fleet) continue;
    state[row.id] = {
      [LABELER_CONFIG_PATH]: ghFileText(fleet.remote, LABELER_CONFIG_PATH, fleet.prBase),
      [LABELER_WORKFLOW_PATH]: ghFileText(fleet.remote, LABELER_WORKFLOW_PATH, fleet.prBase)
    };
  }
  return state;
}

// What a repo must satisfy for its PR labels to be the authoritative work-type routing. The
// workflow is checked by contract, not by content: a repo may run labeler inside a bigger
// workflow (the gateway also labels channels and PR size) as long as these hold.
export function labelerWorkflowGaps(text) {
  const gaps = [];
  if (!/uses:\s*actions\/labeler@/.test(text)) gaps.push('it never runs actions/labeler');
  if (!text.includes(`configuration-path: ${LABELER_CONFIG_PATH}`)) gaps.push(`it does not point at ${LABELER_CONFIG_PATH}`);
  if (!/^on:(.|\n)*?pull_request(_target)?:/m.test(text)) gaps.push('it does not trigger on pull requests');
  if (!/pull-requests:\s*write/.test(text)) gaps.push('it lacks pull-requests: write');
  return gaps;
}

export function checkLabelerState(routing, state) {
  const errors = [];
  for (const row of routing.repositories) {
    const installed = state[row.id];
    if (!installed) { errors.push(`${row.id}: no remote state observed`); continue; }
    const config = installed[LABELER_CONFIG_PATH];
    if (config === null || config === undefined) errors.push(`${row.id}: ${LABELER_CONFIG_PATH} is not installed — copy generated/labeler/${row.id}.yml into the repo`);
    else if (!config.includes(labelerBlocks(routing, row.id)))
      errors.push(`${row.id}: ${LABELER_CONFIG_PATH} is missing the generated work-type blocks — paste generated/labeler/${row.id}.yml in verbatim (repo-specific labels stay)`);
    const workflow = installed[LABELER_WORKFLOW_PATH];
    if (workflow === null || workflow === undefined) errors.push(`${row.id}: ${LABELER_WORKFLOW_PATH} is not installed — copy generated/labeler/${row.id}.workflow.yml into the repo`);
    else for (const gap of labelerWorkflowGaps(workflow)) errors.push(`${row.id}: ${LABELER_WORKFLOW_PATH} labels nothing — ${gap}`);
  }
  return errors;
}

// The published artifact is consumed by other repos, so the same schema gates source and output.
function schemaViolations(routing) {
  try {
    // Required lazily: spec-index.mjs/proposal-index.mjs import this module for the tag enum
    // and must keep working in a checkout that has no node_modules.
    const required = createRequire(import.meta.url)('ajv/dist/2020.js');
    const Ajv2020 = required.default ?? required;
    const schema = JSON.parse(readFileSync(resolve(root, 'routing.schema.json'), 'utf8'));
    const validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema);
    const documents = [['routing.yml', routing], ['generated/routing.json', JSON.parse(readFileSync(generatedPath, 'utf8'))]];
    return documents.flatMap(([name, document]) => (validate(document) ? [] : validate.errors.map((error) => `${name}${error.instancePath}: ${error.message}`)));
  } catch (error) {
    return [`routing.schema.json: ${error.message}`];
  }
}

function fail(errors) {
  for (const error of errors) console.error(error);
  process.exitCode = 1;
}

export function run(argv = process.argv.slice(2)) {
  const [command, ...args] = argv;
  const routing = readRouting();
  const errors = validateRouting(routing);
  if (errors.length) { fail(errors); return; }
  if (command === 'validate') {
    const schemaErrors = schemaViolations(routing);
    const corpus = [...schemaErrors, ...checkCorpus(routing)];
    if (corpus.length) fail(corpus);
    else console.log(`valid routing (${canonicalTags(routing).length} tags, ${routing.legacyTags.length} legacy, ${routing.repositories.length} repos)`);
  } else if (command === 'generate') {
    const files = generatedFiles(routing);
    if (args.includes('--check')) {
      const stale = files.filter(([path, text]) => {
        try { return readFileSync(path, 'utf8') !== text; } catch { return true; }
      });
      if (stale.length) fail(stale.map(([path]) => `${path.slice(root.length + 1)}: stale; run node scripts/routing.mjs generate`));
      else console.log(`generated routing is current (${buildArtifact(routing).contentHash})`);
    } else {
      mkdirSync(labelerDir, { recursive: true });
      for (const [path, text] of files) writeFileSync(path, text);
      console.log(`wrote ${files.length} files (${buildArtifact(routing).contentHash})`);
    }
  } else if (command === 'show') {
    const repoId = args[0];
    try { console.log(JSON.stringify({ repo: repoId, rules: rulesFor(routing, repoId) }, null, 2)); }
    catch (error) { fail([error.message]); }
  } else if (command === 'tags') {
    const [repoId, ...paths] = args.filter((arg) => arg !== '--json');
    if (!repoId || paths.length === 0) { fail(['usage: routing.mjs tags <repo-id> <path...> [--json]']); return; }
    try {
      const tags = tagsForPaths(routing, repoId, paths);
      if (args.includes('--json')) console.log(JSON.stringify({ repo: repoId, tags, byPath: Object.fromEntries(paths.map((path) => [path, tagsForPath(routing, repoId, path)])) }, null, 2));
      else console.log(tags.join(','));
    } catch (error) { fail([error.message]); }
  } else if (command === 'verify-remote') {
    const fixtureIndex = args.indexOf('--fixture');
    try {
      const state = fixtureIndex >= 0 ? JSON.parse(readFileSync(resolve(process.cwd(), args[fixtureIndex + 1]), 'utf8')) : liveLabelerState(routing);
      const drift = checkLabelerState(routing, state);
      if (drift.length) fail(drift);
      else console.log(`labeler files installed and current in ${routing.repositories.length} repos`);
    } catch (error) { fail([error.message]); }
  } else fail(['usage: routing.mjs validate | generate [--check] | show <repo-id> | tags <repo-id> <path...> [--json] | verify-remote [--fixture path]']);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) run();
