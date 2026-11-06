#!/usr/bin/env node
// Jev calibration report (PR-2): reads a jev-shadow.jsonl file (runner or
// unstick-cron shape — see README.md's "Jev shadow decisions" section for
// where each one lands) and summarizes, per `site`, how often Jev agreed
// with the deterministic/model decision it shadowed. Read-only, no deps.
// This never decides anything — it is the calibration evidence a human reads
// before flipping any FACTORY_JEV_*_ACT cut-over flag.
//
// Usage: node scripts/jev-shadow-report.mjs [path] [--since ISO] [--json]
//   path defaults to /data/jev-shadow.jsonl, falling back to
//   /opt/factory/data/jev-shadow.jsonl if the first does not exist.

import { createReadStream, existsSync, readdirSync } from 'node:fs';
import { createInterface } from 'node:readline';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_PATHS = ['/data/jev-shadow.jsonl', '/opt/factory/data/jev-shadow.jsonl'];
// LOW: a container's per-run copy of its own local shadow log (agent/lib/jev.sh's
// factory_jev_shadow_log, written to <out>/jev-shadow.jsonl inside each run's
// FACTORY_RUNS_DIR entry) — the central log only ever gets the PROXIED calls;
// a legacy container's direct-to-OpenRouter host-cron path and any local-only
// debug copy live here instead. Merged in whenever a runs dir is available.
const DEFAULT_RUNS_DIR = '/opt/factory/runs';

/** Reads every run subdirectory's own jev-shadow.jsonl under runsDir, merging entries + malformed counts. */
async function readRunsDirShadowLogs(runsDir, opts) {
	let entries = [];
	let malformed = 0;
	let names;
	try {
		names = readdirSync(runsDir, { withFileTypes: true });
	} catch {
		return { entries, malformed };
	}
	for (const entry of names) {
		if (!entry.isDirectory()) continue;
		const logPath = path.join(runsDir, entry.name, 'jev-shadow.jsonl');
		if (!existsSync(logPath)) continue;
		const found = await readShadowLog(logPath, opts);
		entries = entries.concat(found.entries);
		malformed += found.malformed;
	}
	return { entries, malformed };
}
const RETRYABLE_JEV_CLASSES = new Set(['provider-outage', 'infra-transient']);
const RETRY_FALLTHROUGH_CLASSES = new Set(['unknown', 'no-progress']);

/** Normalizes the two `jev` shapes this file ever sees into one envelope:
 *   - runner-side (jev.ts's JevResult, camelCase): {ok, model?, answers?, costUsd?, ms?}
 *   - bash-side (agent/lib/jev.sh's result/error files, snake_case): a
 *     success file has `.answers` and no `.error`; a failure file has
 *     `.error` (+ optionally `.http_status`); `{"error":"unavailable"}` means
 *     factory_jev_decide never even ran (shadow-logged with an empty file). */
export function normalizeJev(jev) {
	if (jev === null || typeof jev !== 'object') {
		return { ok: false, reason: 'malformed', ms: null, costUsd: null, answers: null };
	}
	if (typeof jev.ok === 'boolean') {
		return {
			ok: jev.ok,
			reason: jev.ok ? null : (typeof jev.reason === 'string' ? jev.reason : 'unknown'),
			ms: typeof jev.ms === 'number' ? jev.ms : null,
			costUsd: jev.ok ? (typeof jev.costUsd === 'number' ? jev.costUsd : 0) : null,
			answers: jev.ok && typeof jev.answers === 'object' ? jev.answers : null
		};
	}
	if (jev.answers && typeof jev.answers === 'object' && jev.error === undefined) {
		return {
			ok: true,
			reason: null,
			ms: typeof jev.ms === 'number' ? jev.ms : null,
			costUsd: typeof jev.total_cost_usd === 'number' ? jev.total_cost_usd : 0,
			answers: jev.answers
		};
	}
	return {
		ok: false,
		reason: typeof jev.error === 'string' ? jev.error : 'unknown',
		ms: typeof jev.ms === 'number' ? jev.ms : null,
		costUsd: null,
		answers: null
	};
}

/** Reads and parses a JSONL file. Returns {entries, malformed} — a bad line
 * is counted, never thrown. LOW: streamed line-by-line (this log can grow
 * without bound on a long-lived box) instead of reading the whole file into
 * memory at once. */
export async function readShadowLog(path, { since } = {}) {
	const entries = [];
	let malformed = 0;
	const sinceMs = since ? Date.parse(since) : null;
	const lines = createInterface({ input: createReadStream(path, { encoding: 'utf8' }), crlfDelay: Infinity });
	for await (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed) continue;
		let parsed;
		try {
			parsed = JSON.parse(trimmed);
		} catch {
			malformed++;
			continue;
		}
		if (parsed === null || typeof parsed !== 'object' || typeof parsed.site !== 'string') {
			malformed++;
			continue;
		}
		if (sinceMs !== null) {
			const ts = Date.parse(parsed.ts);
			if (Number.isNaN(ts) || ts < sinceMs) continue;
		}
		entries.push(parsed);
	}
	return { entries, malformed };
}

function mean(values) {
	if (values.length === 0) return null;
	return values.reduce((a, b) => a + b, 0) / values.length;
}

function percentile(values, p) {
	if (values.length === 0) return null;
	const sorted = [...values].sort((a, b) => a - b);
	const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
	return sorted[idx];
}

function histogram(values) {
	const counts = {};
	for (const v of values) counts[v] = (counts[v] ?? 0) + 1;
	return counts;
}

// Average-rank Spearman correlation — handles ties, returns null under 2 pairs
// or when either side has zero variance.
function rankOf(values) {
	const order = values.map((_, i) => i).sort((a, b) => values[a] - values[b]);
	const ranks = new Array(values.length);
	let i = 0;
	while (i < order.length) {
		let j = i;
		while (j + 1 < order.length && values[order[j + 1]] === values[order[i]]) j++;
		const avgRank = (i + j) / 2 + 1;
		for (let k = i; k <= j; k++) ranks[order[k]] = avgRank;
		i = j + 1;
	}
	return ranks;
}

export function spearman(pairs) {
	const n = pairs.length;
	if (n < 2) return null;
	const rx = rankOf(pairs.map((p) => p[0]));
	const ry = rankOf(pairs.map((p) => p[1]));
	const m = (n + 1) / 2;
	let num = 0, denx = 0, deny = 0;
	for (let i = 0; i < n; i++) {
		const dx = rx[i] - m, dy = ry[i] - m;
		num += dx * dy; denx += dx * dx; deny += dy * dy;
	}
	if (denx === 0 || deny === 0) return null;
	return num / Math.sqrt(denx * deny);
}

// MEDIUM-2: entries carry an `origin` ('container' | 'runner') since PR-2's
// jev-proxy.ts started tagging them; anything from before that (or the local
// bash copy, which never sets it) is treated as 'runner' — every pre-PR-2
// call site was runner/host-authored.
function originOf(e) {
	return e.origin === 'container' ? 'container' : 'runner';
}

function genericStats(entries) {
	const normalized = entries.map((e) => normalizeJev(e.jev));
	const ok = normalized.filter((n) => n.ok);
	const failed = normalized.filter((n) => !n.ok);
	const byOrigin = { runner: 0, container: 0 };
	for (const e of entries) byOrigin[originOf(e)]++;
	return {
		n: entries.length,
		byOrigin,
		okRate: entries.length ? ok.length / entries.length : null,
		errorReasons: histogram(failed.map((n) => n.reason ?? 'unknown')),
		meanMs: mean(normalized.map((n) => n.ms).filter((v) => typeof v === 'number')),
		p95Ms: percentile(normalized.map((n) => n.ms).filter((v) => typeof v === 'number'), 0.95),
		totalCostUsd: ok.reduce((sum, n) => sum + (n.costUsd ?? 0), 0)
	};
}

function retryPolicyStats(entries) {
	// LOW: todayClass/choice both ultimately trace back to log-file content —
	// a plain object here is a prototype-pollution trap if either is ever
	// "__proto__" (historical/malformed data, not just this PR's own writes).
	const confusion = Object.create(null);
	const probabilities = [];
	let upsideEligible = 0, upsideHit = 0;
	for (const e of entries) {
		const jev = normalizeJev(e.jev);
		const todayClass = e.today?.failureClass ?? 'unknown';
		const fc = jev.ok ? jev.answers?.failure_class : null;
		const choice = fc?.choice ?? null;
		if (choice) {
			confusion[todayClass] ??= Object.create(null);
			confusion[todayClass][choice] = (confusion[todayClass][choice] ?? 0) + 1;
			const p = fc.probabilities?.[choice];
			if (typeof p === 'number') probabilities.push(p);
		}
		if (RETRY_FALLTHROUGH_CLASSES.has(todayClass)) {
			upsideEligible++;
			const p = fc?.probabilities?.[choice];
			if (choice && RETRYABLE_JEV_CLASSES.has(choice) && typeof p === 'number' && p >= 0.85) upsideHit++;
		}
	}
	return {
		confusionMatrix: confusion,
		meanChoiceProbability: mean(probabilities),
		upsideRate: upsideEligible ? upsideHit / upsideEligible : null,
		upsideEligible,
		upsideHit
	};
}

function unstickStats(entries) {
	const signatureCounts = {};
	const probabilities = [];
	const humanNeededBuckets = new Array(10).fill(0);
	for (const e of entries) {
		const jev = normalizeJev(e.jev);
		if (!jev.ok) continue;
		const sig = jev.answers?.signature;
		if (sig?.choice) {
			signatureCounts[sig.choice] = (signatureCounts[sig.choice] ?? 0) + 1;
			const p = sig.probabilities?.[sig.choice];
			if (typeof p === 'number') probabilities.push(p);
		}
		const human = jev.answers?.human_needed;
		if (typeof human?.noul === 'number') {
			humanNeededBuckets[Math.min(9, Math.max(0, Math.floor(human.noul * 10)))]++;
		}
	}
	return { signatureCounts, meanSignatureProbability: mean(probabilities), humanNeededBuckets };
}

const RANK_AXES = ['criticality', 'importance', 'impact'];

function rankStats(entries) {
	const perAxis = {};
	for (const axis of RANK_AXES) {
		const diffs = [];
		const pairs = [];
		for (const e of entries) {
			const jev = normalizeJev(e.jev);
			if (!jev.ok) continue;
			const jevScore = jev.answers?.[axis]?.score;
			const todayScore = e.today?.[axis];
			if (typeof jevScore === 'number' && typeof todayScore === 'number') {
				diffs.push(Math.abs(jevScore - todayScore));
				pairs.push([jevScore, todayScore]);
			}
		}
		perAxis[axis] = { meanAbsDiff: mean(diffs), n: diffs.length, spearman: spearman(pairs) };
	}
	return perAxis;
}

function mergescanStats(entries) {
	let wouldSkip = 0;
	let chunksWithFindings = 0;
	let chunksWithFindingsNotSkipped = 0;
	for (const e of entries) {
		const jev = normalizeJev(e.jev);
		if (!jev.ok) continue;
		// LOW: `e.jev.would_skip` was unreachable — no shape this file ever
		// sees puts `would_skip` on the jev envelope itself. The PR-4 mergescan
		// site logs its own decision under `today.wouldSkip`; read that instead.
		const skip = e.today?.wouldSkip ?? jev.answers?.would_skip?.noul;
		const skipped = skip === true || (typeof skip === 'number' && skip >= 0.5);
		if (skipped) wouldSkip++;
		const haikuFindings = e.today?.haikuFindings ?? 0;
		if (haikuFindings > 0) {
			chunksWithFindings++;
			if (!skipped) chunksWithFindingsNotSkipped++;
		}
	}
	return {
		n: entries.length,
		wouldSkipRate: entries.length ? wouldSkip / entries.length : null,
		recall: chunksWithFindings ? chunksWithFindingsNotSkipped / chunksWithFindings : null
	};
}

const SITE_STATS = {
	'retry-policy': retryPolicyStats,
	unstick: unstickStats,
	rank: rankStats,
	mergescan: mergescanStats
};

export function buildReport(entries) {
	// LOW: `site` traces back to log-file content (a container's own request
	// body, pre-MEDIUM-2 history, or hand-edited data) — a plain object here
	// is a prototype-pollution trap if it is ever "__proto__". A Map for the
	// accumulator and a null-prototype object for the result sidestep it.
	const bySite = new Map();
	for (const e of entries) {
		if (!bySite.has(e.site)) bySite.set(e.site, []);
		bySite.get(e.site).push(e);
	}
	const sites = Object.create(null);
	for (const [site, siteEntries] of bySite) {
		const extra = SITE_STATS[site] ? SITE_STATS[site](siteEntries) : {};
		sites[site] = { ...genericStats(siteEntries), ...extra };
	}
	return sites;
}

function fmtPct(v) {
	return v === null || v === undefined ? '—' : `${(v * 100).toFixed(1)}%`;
}

function fmtNum(v, digits = 0) {
	return v === null || v === undefined ? '—' : v.toFixed(digits);
}

function renderMarkdown(report) {
	const lines = [];
	// MEDIUM-2: origin (runner vs container) breaks out per site — the count
	// alone is the tell for "a container is writing to a site that used to be
	// runner-only" without needing --json.
	lines.push('| site | n | runner | container | ok% | mean ms | p95 ms | cost usd | top error |');
	lines.push('|---|---|---|---|---|---|---|---|---|');
	for (const [site, s] of Object.entries(report).sort()) {
		const topError = Object.entries(s.errorReasons ?? {}).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
		lines.push(`| ${site} | ${s.n} | ${s.byOrigin?.runner ?? 0} | ${s.byOrigin?.container ?? 0} | ${fmtPct(s.okRate)} | ${fmtNum(s.meanMs)} | ${fmtNum(s.p95Ms)} | ${fmtNum(s.totalCostUsd, 4)} | ${topError} |`);
	}
	lines.push('');
	for (const [site, s] of Object.entries(report).sort()) {
		if (site === 'retry-policy') {
			lines.push(`### retry-policy`);
			lines.push(`mean choice probability: ${fmtNum(s.meanChoiceProbability, 3)}; upside rate (today unknown/no-progress -> jev retryable p>=0.85): ${fmtPct(s.upsideRate)} (${s.upsideHit}/${s.upsideEligible})`);
			lines.push(`confusion matrix (today.failureClass x jev.choice): ${JSON.stringify(s.confusionMatrix)}`);
			lines.push('');
		} else if (site === 'unstick') {
			lines.push(`### unstick`);
			lines.push(`signature distribution: ${JSON.stringify(s.signatureCounts)}; mean probability: ${fmtNum(s.meanSignatureProbability, 3)}`);
			lines.push(`human_needed decile histogram (0.0-1.0): ${JSON.stringify(s.humanNeededBuckets)}`);
			lines.push('');
		} else if (site === 'rank') {
			lines.push(`### rank`);
			for (const axis of RANK_AXES) {
				const a = s[axis];
				lines.push(`${axis}: n=${a.n} mean|Δ|=${fmtNum(a.meanAbsDiff, 3)} spearman=${fmtNum(a.spearman, 3)}`);
			}
			lines.push('');
		} else if (site === 'mergescan') {
			lines.push(`### mergescan`);
			lines.push(`would-skip rate: ${fmtPct(s.wouldSkipRate)}; recall: ${fmtPct(s.recall)}`);
			lines.push('');
		}
	}
	return lines.join('\n');
}

function resolvePath(argPath) {
	if (argPath) return argPath;
	for (const p of DEFAULT_PATHS) if (existsSync(p)) return p;
	return DEFAULT_PATHS[0];
}

async function main() {
	const args = process.argv.slice(2);
	const json = args.includes('--json');
	const sinceIdx = args.indexOf('--since');
	const since = sinceIdx !== -1 ? args[sinceIdx + 1] : undefined;
	const runsDirIdx = args.indexOf('--runs-dir');
	const runsDirArg = runsDirIdx !== -1 ? args[runsDirIdx + 1] : undefined;
	const skipIdx = new Set();
	if (sinceIdx !== -1) { skipIdx.add(sinceIdx); skipIdx.add(sinceIdx + 1); }
	if (runsDirIdx !== -1) { skipIdx.add(runsDirIdx); skipIdx.add(runsDirIdx + 1); }
	const positional = args.filter((a, i) => a !== '--json' && !skipIdx.has(i) && !a.startsWith('--'));
	const logPath = resolvePath(positional[0]);

	if (!existsSync(logPath)) {
		console.error(`jev-shadow-report: no such file ${logPath}`);
		process.exitCode = 1;
		return;
	}
	const central = await readShadowLog(logPath, { since });
	// LOW: also fold in every run's own local shadow-log copy (agent/lib/jev.sh's
	// direct-transport calls never reach the central proxy log) whenever a runs
	// dir is available — explicit --runs-dir, else the box's default if present.
	const runsDir = runsDirArg ?? (existsSync(DEFAULT_RUNS_DIR) ? DEFAULT_RUNS_DIR : null);
	const fromRuns = runsDir ? await readRunsDirShadowLogs(runsDir, { since }) : { entries: [], malformed: 0 };
	const entries = central.entries.concat(fromRuns.entries);
	const malformed = central.malformed + fromRuns.malformed;
	const report = buildReport(entries);
	if (malformed > 0) console.error(`jev-shadow-report: skipped ${malformed} malformed line(s)`);
	if (json) {
		console.log(JSON.stringify(report, null, '\t'));
	} else {
		console.log(renderMarkdown(report));
	}
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	await main();
}
