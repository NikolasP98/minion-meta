#!/usr/bin/env node
// Guards the deploy-branch CI signal against workflow triggers whose runs
// GitHub pins to the DEFAULT branch instead of the branch that caused them.
//
// `issue_comment` and `issues` runs carry head_branch = the default branch and
// head_sha = its tip, regardless of which issue or PR the event came from. A
// job filtered out by an `if:` still records a `skipped` run there, so a
// repository that receives bot comments accumulates skipped runs on the deploy
// branch faster than it accumulates real ones. Deploy-status probes that read
// "the newest run on the deploy branch" (or "every check run on its tip") then
// report a green deployment as not-green. Measured on minion-meta before
// .github/workflows/claude.yml dropped these triggers: 51 of the 53 check runs
// on 5ffdfec, and 98 of the newest 100 runs on `main`.
//
// Pure: no network, reads the working tree only. Run from repo root:
//   node scripts/workflow-triggers.mjs [--check]
// Both forms report; --check exits 1 when a workflow subscribes to one.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const WORKFLOW_DIR = '.github/workflows';

// Webhook events whose workflow run is attached to the default branch. Keep in
// step with GitHub's "runs on the default branch" list; adding an entry here is
// how a future default-branch-pinned trigger gets caught.
export const DEFAULT_BRANCH_PINNED_EVENTS = ['issue_comment', 'issues'];

/**
 * Extract the top-level trigger event names from a workflow document.
 *
 * Deliberately textual: the repo has no YAML dependency, and a real parser
 * would resolve the unquoted `on` key to the boolean `true` (the YAML 1.1
 * trap this file exists to avoid re-introducing). Handles the three legal
 * forms — block map, inline sequence, and single scalar.
 *
 * @param {string} source workflow file contents
 * @returns {string[]} event names in document order
 */
export function parseTriggerEvents(source) {
  const lines = source.split(/\r?\n/);
  const header = lines.findIndex((line) => /^(?:on|'on'|"on"):/.test(line));
  if (header === -1) return [];

  const inline = lines[header].slice(lines[header].indexOf(':') + 1).trim();
  if (inline && !inline.startsWith('#')) {
    const scalar = inline.replace(/\s+#.*$/, '');
    return scalar.startsWith('[')
      ? scalar.replace(/^\[|\]$/g, '').split(',').map((name) => name.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean)
      : [scalar.replace(/^['"]|['"]$/g, '')];
  }

  const events = [];
  let baseIndent = null;
  for (const line of lines.slice(header + 1)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) break; // dedent to column 0 ends the `on:` block
    const indent = /^\s*/.exec(line)[0].length;
    if (baseIndent === null) baseIndent = indent;
    if (indent > baseIndent) continue; // event options (`types:`, `branches:`), not events
    if (indent < baseIndent) break;
    const key = /^\s*(?:-\s*)?([A-Za-z_][\w-]*)\s*:?\s*(?:#.*)?$/.exec(line);
    if (key) events.push(key[1]);
  }
  return events;
}

/**
 * Scan a workflow directory for triggers pinned to the default branch.
 *
 * @param {string} dir directory holding workflow documents
 * @returns {{file: string, events: string[]}[]} one entry per offending file
 */
export function scanWorkflows(dir = WORKFLOW_DIR) {
  const offenders = [];
  for (const name of readdirSync(dir).filter((f) => /\.ya?ml$/.test(f)).sort()) {
    const events = parseTriggerEvents(readFileSync(join(dir, name), 'utf8'))
      .filter((event) => DEFAULT_BRANCH_PINNED_EVENTS.includes(event));
    if (events.length) offenders.push({ file: join(dir, name), events });
  }
  return offenders;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const offenders = scanWorkflows();
  for (const { file, events } of offenders) {
    console.error(`${file}: subscribes to default-branch-pinned trigger(s) ${events.join(', ')} — every filtered event leaves a skipped run on the deploy branch`);
  }
  if (!offenders.length) console.log(`${WORKFLOW_DIR}: no default-branch-pinned triggers`);
  if (offenders.length && process.argv.includes('--check')) process.exit(1);
}
