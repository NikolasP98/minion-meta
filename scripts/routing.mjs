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

import { createHash } from 'node:crypto';
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

const tagPattern = /^[a-z][a-z0-9-]*$/;
// Deliberately narrow: the glob dialect below understands `**`, `*` and `?` only. A character
// class or a backslash would parse as a literal here and as a class in minimatch (what the
// labeler action runs) — divergence between the two is worse than rejecting the pattern.
const globPattern = /^[A-Za-z0-9_.@+*?/-]+$/;
const topKeys = ['schemaVersion', 'tags', 'legacyTags', 'shared', 'repositories'];

export function readRouting(path = routingPath) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`${path}: document must be valid JSON-compatible YAML: ${error.message}`);
  }
}

export function readFleetIds(path = policyPath) {
  try {
    return JSON.parse(readFileSync(path, 'utf8')).repositories.map((row) => row.id);
  } catch (error) {
    throw new Error(`${path}: cannot read canonical repository ids: ${error.message}`);
  }
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

// TODO(handoff): these configs are generated here but NOT installed in the fleet repos — each
// repo still needs `.github/labeler.yml` + a labeler workflow before PR labels exist, and
// minion-factory must consume `generated/routing.json` for its per-tag loop composition.
// Tracked in proposals/2026-08-20-tag-routing-fleet-rollout.md.
// actions/labeler@v5 config. Only positive globs: the rules are a union, so every glob that
// contributes a tag can sit in one `any-glob-to-any-file` list without changing semantics.
export function labelerText(routing, repoId) {
  const lines = [
    '# GENERATED FILE — do not edit.',
    '# Source: routing.yml in NikolasP98/minion-meta (node scripts/routing.mjs generate).',
    `# Install: copy to ${repoId}/.github/labeler.yml and run actions/labeler@v5 on pull_request_target.`,
    ''
  ];
  for (const [tag, globs] of globsByTag(routing, repoId)) {
    lines.push(`${tag}:`, '  - changed-files:', '      - any-glob-to-any-file:');
    for (const glob of globs) lines.push(`          - "${glob}"`);
  }
  return `${lines.join('\n')}\n`;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  return value;
}

export function buildArtifact(routing) {
  const body = canonicalize({
    schemaVersion: routing.schemaVersion,
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
    ...routing.repositories.map((row) => [resolve(labelerDir, `${row.id}.yml`), labelerText(routing, row.id)])
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

export function checkCorpus(routing, dirs, base) {
  const allowed = allowedTags(routing);
  const { usage, violations } = collectTagUsage(dirs, base);
  const errors = [...violations];
  for (const [tag, files] of usage) {
    if (!allowed.has(tag)) errors.push(`${files[0]}: unknown tag '${tag}' (${files.length} file(s)) — use one of ${canonicalTags(routing).join(', ')}`);
  }
  for (const tag of routing.legacyTags.map((entry) => entry.id)) {
    if (!usage.has(tag)) errors.push(`routing.yml: legacy tag '${tag}' is no longer used — delete it (the allowlist may only shrink)`);
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
  } else fail(['usage: routing.mjs validate | generate [--check] | show <repo-id> | tags <repo-id> <path...> [--json]']);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) run();
