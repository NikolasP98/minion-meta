// Regenerates specs/index.json from spec frontmatter. Committed output — the
// minion-base dashboard fetches this ONE file instead of parsing 100+ specs.
// Doubles as the lint gate: exits 1 if any spec lacks frontmatter (every
// required field from specs/TEMPLATE.md — id, title, stage, status, pass,
// created, updated, repos), uses an invalid stage/status, has a non-integer
// `pass` or empty `repos`, has a scalar field written with array syntax (e.g.
// `title: [A, B]` — the flat-YAML parser accepts bracket syntax for any key,
// so this must be rejected explicitly), or has an `id` that doesn't match its
// filename or collides with another spec's `id` (the stable join key).
//
// --check runs the full hardening gate (meta CI, see .github/workflows/ci.yml
// and specs/2026-08-17-maintenance-lane-monitors-spec.md §2): calendar-valid
// date formats, repo ids, verdict/type enums, revises/supersedes link
// integrity (bidirectional — every status:superseded spec needs an incoming
// supersedes link, not just the forward direction), required-heading lint
// (run against the body with fenced code, HTML comments, and unclosed fences
// stripped by a stateful scanner — see stripNonDocumentMarkdown — so example
// headings or hidden text never satisfy the gate), a one-way-ratchet check on
// both baseline exception files against a prior spec corpus (see below), and
// a staleness check that specs/index.json matches what's on disk. It never
// writes — CI should stay read-only.
//
// Heading lint is grandfathered by CONTENT, not just id: entries in
// scripts/spec-heading-lint-baseline.json are `id -> sha256(body)`. A spec
// stays exempt only while its body matches the recorded hash — editing a
// baselined spec's body silently drops the exemption and the heading checks
// apply, per specs/TEMPLATE.md's "every new or hand-edited spec must comply."
//
// Reverse-supersedes exceptions (superseded specs with no known successor in
// the corpus) live in scripts/spec-supersede-baseline.json — see
// proposals/2026-08-18-spec-heading-lint-baseline-backfill.md for the backfill ask.
//
// Both baseline files are meant as one-way ratchets: a PR may only shrink them
// (delete an id, or in practice fix a spec's headings so it no longer needs
// the exemption), never grow them or rewrite an existing hash. --check
// enforces this against the comparison commit's spec corpus, even when the
// baseline files did not exist there. PRs use their merge base; push/local
// checks use the event's before SHA or HEAD^.
//
// Run from repo root: node scripts/spec-index.mjs [--check]
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { parseFrontmatter, STAGES, STATUSES } from './spec-frontmatter.mjs';

export const ALLOWED_REPOS = [
	'minion',
	'minion_hub',
	'minion_site',
	'minion_plugins',
	'minion-meta',
	'minion-base',
	'minion-factory',
	'paperclip',
	'pixel-agents'
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// Rejects calendar-invalid values that still match the YYYY-MM-DD shape
// (e.g. "2026-99-99" or "2026-02-30") by round-tripping through Date.UTC.
function isValidISODate(value) {
	if (!DATE_RE.test(value)) return false;
	const [y, m, d] = value.split('-').map(Number);
	const dt = new Date(Date.UTC(y, m - 1, d));
	return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}
// specs/TEMPLATE.md's documented enums for the two optional review/roll-up fields.
const VERDICTS = ['pending', 'approved', 'changes_requested', 'rejected'];
const TYPES = ['feature', 'fix', 'infra', 'decision', 'research'];

// Strips text that is not real document structure, so a heading-shaped line
// inside it can never satisfy the required-heading lint below:
//   - HTML comments (`<!-- ... -->`), including an unclosed comment, which
//     per CommonMark's HTML-block rules runs to the end of the document;
//   - fenced code blocks, via a stateful line scanner (not a single regex,
//     since CommonMark allows the closing fence to be LONGER than the
//     opener, and an unclosed fence consumes the rest of the document —
//     both cases a "same-length closer" regex misses).
// A backtick fence opener is invalid (and left as ordinary text) if its info
// string itself contains a backtick, per CommonMark.
export function stripNonDocumentMarkdown(bodyText) {
	const withoutComments = bodyText.replace(/<!--[\s\S]*?(?:-->|$)/g, '');
	const lines = withoutComments.split('\n');
	const out = [];
	let fence = null; // { char: '`' | '~', len: number }
	let htmlBlock = null; // null, a closing regexp, or 'blank-line'
	for (const line of lines) {
		if (fence) {
			const closer = line.match(/^ {0,3}(`{3,}|~{3,})[ \t]*$/);
			if (closer && closer[1][0] === fence.char && closer[1].length >= fence.len) fence = null;
			continue; // every line inside the fence, including its closer, is dropped
		}
		if (htmlBlock) {
			if (htmlBlock === 'blank-line') {
				if (/^\s*$/.test(line)) htmlBlock = null;
			} else if (htmlBlock.test(line)) {
				htmlBlock = null;
			}
			continue;
		}
		const opener = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
		const isValidOpener = opener && !(opener[1][0] === '`' && opener[2].includes('`'));
		if (isValidOpener) {
			fence = { char: opener[1][0], len: opener[1].length };
			continue;
		}
		// CommonMark HTML blocks are raw content: Markdown headings inside them
		// are literal text, not document sections. Cover the terminating block
		// forms and the block-tag form used by containers such as <div>.
		const htmlStart = line.match(/^ {0,3}<(?:(script|pre|style|textarea)(?:\s|>|$)|([A-Za-z][A-Za-z0-9-]*)(?:\s|\/?>|$)|\/([A-Za-z][A-Za-z0-9-]*)\s*>)/i);
		if (/^ {0,3}<\?/.test(line)) htmlBlock = /\?>/;
		else if (/^ {0,3}<!\[CDATA\[/.test(line)) htmlBlock = /\]\]>/;
		else if (/^ {0,3}<![A-Z]/i.test(line)) htmlBlock = />/;
		else if (htmlStart) {
			const rawTag = htmlStart[1];
			if (rawTag) htmlBlock = new RegExp(`<\\/${rawTag}\\s*>`, 'i');
			else htmlBlock = 'blank-line';
		}
		if (htmlBlock) {
			if (htmlBlock !== 'blank-line' && htmlBlock.test(line)) htmlBlock = null;
			continue;
		}
		out.push(line);
	}
	return out.join('\n');
}
// Anchored to actual Markdown structure — either a "##"-"####" heading whose
// text contains the keyword, or a "**Label:**"-style bold line-start (the
// house style several specs use instead of a dedicated heading, e.g.
// "**Out of scope:** ..." or "**E2E verification:** ..."). The bold form
// requires the documented trailing colon inside the bold span, so a bold
// sentence that merely contains the keyword (no colon, not actually a label)
// does not count; prose that merely mentions "out of scope" or "verification"
// mid-paragraph doesn't either. Checked against the body with fenced code,
// HTML comments, raw HTML blocks, and unclosed fences stripped
// (stripNonDocumentMarkdown),
// so example/hidden headings never count.
export const REQUIRED_HEADINGS = [
	{ label: '"## 0. Product" section', re: /^##[ \t]*0\.[ \t]*Product[ \t]*(?:#+[ \t]*)?$/m },
	{
		label: 'an out-of-scope section (a heading or a **Out of scope:** label)',
		re: /^#{2,4}[ \t]+.*out.of.scope|^\*\*[^*\n]*out.of.scope[^*\n]*:\*\*/im
	},
	{
		label: 'a verification section (a heading or a **Verification:** label)',
		re: /^#{2,4}[ \t]+.*verif|^\*\*[^*\n]*verif[^*\n]*:\*\*/im
	}
];
// Returns the labels of any required sections missing from `body`.
export function missingRequiredHeadings(body) {
	const scanned = stripNonDocumentMarkdown(body);
	return REQUIRED_HEADINGS.filter(({ re }) => !re.test(scanned)).map(({ label }) => label);
}
// TODO(handoff): 115 pre-existing specs are grandfathered here and never get
// checked again while their body is unchanged (hash-ratcheted — see header
// comment). Shrink the baseline over time (backfill headings, remove the id)
// — see proposals/2026-08-18-spec-heading-lint-baseline-backfill.md.
const HEADING_BASELINE_PATH = 'scripts/spec-heading-lint-baseline.json';
// TODO(handoff): 5 legacy superseded specs have no known successor in the
// corpus (superseded by out-of-band work before the bidirectional-link
// convention existed) — see proposals/2026-08-18-spec-heading-lint-baseline-backfill.md.
const SUPERSEDE_BASELINE_PATH = 'scripts/spec-supersede-baseline.json';
const OUT_PATH = 'specs/index.json';

const sha256 = (text) => createHash('sha256').update(text).digest('hex');

// Every documented frontmatter field except the two array fields (`repos`,
// `tags`) is a scalar. The flat-YAML parser (spec-frontmatter.mjs) accepts
// bracket syntax for ANY key, so without this check `title: [A, B]` silently
// parses to an array, passes the presence-only required-field check below,
// and gets published into specs/index.json unchanged.
export const SCALAR_FIELDS = [
	'id',
	'title',
	'stage',
	'status',
	'created',
	'updated',
	'pass',
	'revises',
	'supersedes',
	'proposal',
	'verdict',
	'pr',
	'type',
	'retired_reason'
];
export function findScalarArrayViolations(fm) {
	return SCALAR_FIELDS.filter((key) => Array.isArray(fm[key]));
}

export function findScalarStringViolations(fm) {
	return SCALAR_FIELDS.filter(
		(key) => key !== 'pass' && key !== 'pr' && fm[key] !== undefined && typeof fm[key] !== 'string'
	);
}

// Resolves the corpus that baseline exceptions must have existed in already.
// PR checks use the merge base. Push checks prefer the event's before SHA;
// local checks use HEAD^, which also makes the CLI fail closed in fixtures.
export function resolveComparisonSha(env = process.env) {
	const baseRef = env.GITHUB_BASE_REF;
	if (baseRef) for (const ref of [`origin/${baseRef}`, baseRef]) {
		try {
			execFileSync('git', ['rev-parse', '--verify', ref], { stdio: 'ignore' });
			return execFileSync('git', ['merge-base', 'HEAD', ref], {
				encoding: 'utf8',
				stdio: ['ignore', 'pipe', 'ignore']
			}).trim();
		} catch {
			// try the next candidate ref
		}
	}
	if (baseRef) return undefined; // PR run, but the base ref couldn't be resolved
	const before = env.GITHUB_EVENT_BEFORE;
	if (before && !/^0+$/.test(before)) {
		try {
			return execFileSync('git', ['rev-parse', '--verify', `${before}^{commit}`], { encoding: 'utf8' }).trim();
		} catch {
			return undefined;
		}
	}
	if (env.GITHUB_EVENT_NAME === 'push') return undefined;
	try {
		return execFileSync('git', ['rev-parse', '--verify', 'HEAD^'], { encoding: 'utf8' }).trim();
	} catch {
		return null; // initial commit: there is no older corpus to grandfather
	}
}
export function readFileAtRev(rev, path) {
	try {
		return execFileSync('git', ['show', `${rev}:${path}`], {
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore']
		});
	} catch {
		return null; // file did not exist at that revision — nothing to ratchet against
	}
}
// Both baseline files are one-way ratchets: a PR may delete entries (a spec's
// headings got fixed, or a supersede link got backfilled) but must never add
// a new id or rewrite an existing hash — that would let a PR grandfather a
// spec that fails the very lint the baseline is meant to grandfather OLD
// specs out of.
export function checkHeadingBaselineRatchet(baseObj, currentObj) {
	const errors = [];
	for (const [id, hash] of Object.entries(currentObj)) {
		if (!(id in baseObj))
			errors.push(
				`${HEADING_BASELINE_PATH}: new id "${id}" added to baseline — it is a one-way ratchet, only removals are allowed in a PR`
			);
		else if (baseObj[id] !== hash)
			errors.push(
				`${HEADING_BASELINE_PATH}: hash for "${id}" changed — it is a one-way ratchet, only removals are allowed in a PR`
			);
	}
	return errors;
}
export function checkSupersedeBaselineRatchet(baseArr, currentArr) {
	const baseSet = new Set(baseArr);
	return currentArr
		.filter((id) => !baseSet.has(id))
		.map(
			(id) =>
				`${SUPERSEDE_BASELINE_PATH}: new id "${id}" added to baseline — it is a one-way ratchet, only removals are allowed in a PR`
		);
}

export function readSpecCorpusAtRev(rev) {
	const names = execFileSync('git', ['ls-tree', '-r', '--name-only', rev, '--', 'specs'], {
		encoding: 'utf8'
	})
		.split('\n')
		.filter((name) => name.endsWith('.md') && !name.endsWith('/TEMPLATE.md') && !name.endsWith('.review.md'));
	return names.flatMap((name) => {
		const parsed = parseFrontmatter(readFileAtRev(rev, name) ?? '');
		return parsed?.fm.id ? [{ fm: parsed.fm, body: parsed.body }] : [];
	});
}

export function baselineEligibilityFromCorpus(corpus) {
	const headings = {};
	const supersedeTargets = new Set(corpus.map(({ fm }) => fm.supersedes).filter(Boolean));
	const supersedes = [];
	for (const { fm, body } of corpus) {
		if (missingRequiredHeadings(body).length > 0) headings[fm.id] = sha256(body);
		if (fm.status === 'superseded' && !supersedeTargets.has(fm.id)) supersedes.push(fm.id);
	}
	return { headings, supersedes };
}

function main() {
	const check = process.argv.includes('--check');
	const headingBaseline =
		check && existsSync(HEADING_BASELINE_PATH)
			? JSON.parse(readFileSync(HEADING_BASELINE_PATH, 'utf8'))
			: {};
	const supersedeBaseline = new Set(
		check && existsSync(SUPERSEDE_BASELINE_PATH)
			? JSON.parse(readFileSync(SUPERSEDE_BASELINE_PATH, 'utf8'))
			: []
	);

	const specs = [];
	const errors = [];
	const fmById = new Map();

	for (const name of readdirSync('specs')
		.filter((f) => f.endsWith('.md') && f !== 'TEMPLATE.md' && !f.endsWith('.review.md'))
		.sort()) {
		const parsed = parseFrontmatter(readFileSync(`specs/${name}`, 'utf8'));
		if (!parsed) {
			errors.push(`${name}: missing frontmatter (run scripts/spec-retrofit.mjs or add by hand)`);
			continue;
		}
		const { fm, body } = parsed;
		for (const key of ['id', 'title', 'stage', 'status', 'created', 'pass', 'updated', 'repos']) {
			if (fm[key] === undefined || fm[key] === null || fm[key] === '')
				errors.push(`${name}: missing required field "${key}"`);
		}
		for (const key of findScalarArrayViolations(fm)) {
			errors.push(`${name}: "${key}" must be a scalar value, not an array (got [${fm[key].join(', ')}])`);
		}
		for (const key of findScalarStringViolations(fm)) {
			errors.push(`${name}: "${key}" must be a string, got ${typeof fm[key]}`);
		}
		if (fm.pass !== undefined && !(Number.isInteger(fm.pass) && fm.pass >= 1))
			errors.push(`${name}: "pass" must be a positive integer, got "${fm.pass}"`);
		if (fm.repos !== undefined && (!Array.isArray(fm.repos) || fm.repos.length === 0))
			errors.push(`${name}: "repos" must be a non-empty array of repo ids`);
		if (fm.stage && !STAGES.includes(fm.stage)) errors.push(`${name}: invalid stage "${fm.stage}"`);
		if (fm.status && !STATUSES.includes(fm.status))
			errors.push(`${name}: invalid status "${fm.status}"`);
		// Retiring is a justified act, never a silent flip (lifecycle-tools mandate).
		if (fm.status === 'retired' && !(fm.retired_reason && fm.retired_reason.length >= 20))
			errors.push(`${name}: status "retired" requires retired_reason (>=20 chars)`);
		// id is the stable join key (specs/TEMPLATE.md) — it must match the filename
		// and be unique, or link resolution silently picks whichever file loaded last.
		const idFromFilename = name.slice(0, -3);
		if (fm.id && fm.id !== idFromFilename)
			errors.push(`${name}: "id" ("${fm.id}") must match filename ("${idFromFilename}")`);
		if (fm.id) {
			if (fmById.has(fm.id)) errors.push(`${name}: duplicate id "${fm.id}" (already used by another spec)`);
			else fmById.set(fm.id, fm);
		}

		if (check) {
			for (const key of ['created', 'updated']) {
				if (fm[key] && !isValidISODate(fm[key]))
					errors.push(`${name}: "${key}" is not a valid ISO calendar date (YYYY-MM-DD): "${fm[key]}"`);
			}
			for (const repo of fm.repos ?? []) {
				if (!ALLOWED_REPOS.includes(repo))
					errors.push(`${name}: unknown repo id "${repo}" in "repos" (allowed: ${ALLOWED_REPOS.join(', ')})`);
			}
			if (fm.verdict && !VERDICTS.includes(fm.verdict))
				errors.push(`${name}: invalid verdict "${fm.verdict}" (allowed: ${VERDICTS.join(', ')})`);
			if (fm.type && !TYPES.includes(fm.type))
				errors.push(`${name}: invalid type "${fm.type}" (allowed: ${TYPES.join(', ')})`);
			if (fm.id) {
				const stillGrandfathered = headingBaseline[fm.id] === sha256(body);
				if (!stillGrandfathered) {
					for (const label of missingRequiredHeadings(body)) errors.push(`${name}: missing ${label}`);
				}
			}
		}
		specs.push({
			id: fm.id,
			title: fm.title,
			stage: fm.stage,
			status: fm.status,
			pass: fm.pass ?? 1,
			created: fm.created,
			updated: fm.updated ?? fm.created,
			repos: fm.repos ?? [],
			...(fm.revises ? { revises: fm.revises } : {}),
			...(fm.supersedes ? { supersedes: fm.supersedes } : {}),
			...(fm.proposal ? { proposal: fm.proposal } : {}),
			...(fm.verdict ? { verdict: fm.verdict } : {}),
			...(fm.pr ? { pr: fm.pr } : {}),
			...(fm.type ? { type: fm.type } : {}),
			...(fm.tags ? { tags: fm.tags } : {})
		});
	}

	if (check) {
		// Link integrity: revises/supersedes must point at a real spec, and
		// supersedes is only true bidirectionally once the target flips status
		// (a one-way supersedes link is exactly the stale-doc failure this
		// hardening pass exists to catch).
		//
		// TODO(handoff): this only checks consistency *when* revises/supersedes is
		// set. It does not require pass>1 specs to set either — 34 specs violate
		// that today (see 2026-08-17-sdlc-phase-gates-scoring-spec.md, assigned to
		// the G0 reconciler). Add a presence rule here once that backlog is
		// cleared — see proposals/2026-08-18-spec-heading-lint-baseline-backfill.md.
		for (const fm of fmById.values()) {
			if (fm.revises) {
				const target = fmById.get(fm.revises);
				if (!target) errors.push(`${fm.id}: revises unknown spec "${fm.revises}"`);
				else if (!((fm.pass ?? 1) > (target.pass ?? 1)))
					errors.push(
						`${fm.id}: pass (${fm.pass ?? 1}) is not greater than revised spec "${fm.revises}" pass (${target.pass ?? 1})`
					);
			}
			if (fm.supersedes) {
				if (fm.supersedes === fm.id) {
					errors.push(`${fm.id}: cannot supersede itself`);
					continue;
				}
				const target = fmById.get(fm.supersedes);
				if (!target) errors.push(`${fm.id}: supersedes unknown spec "${fm.supersedes}"`);
				else if (target.status !== 'superseded')
					errors.push(
						`${fm.id}: supersedes "${fm.supersedes}" but that spec's status is "${target.status}", expected "superseded" (one-way link)`
					);
			}
		}

		// Reverse direction: every status:superseded spec must be named by some
		// other spec's supersedes field, or it's a stale/orphaned superseded
		// marker with no traceable successor.
		const supersedeTargets = new Set(
			[...fmById.values()].filter((fm) => fm.supersedes).map((fm) => fm.supersedes)
		);
		for (const fm of fmById.values()) {
			if (fm.status === 'superseded' && !supersedeTargets.has(fm.id) && !supersedeBaseline.has(fm.id)) {
				errors.push(
					`${fm.id}: status "superseded" but no spec declares supersedes: "${fm.id}" (no incoming successor link)`
				);
			}
		}

		// One-way ratchet: every exception must describe unchanged debt from the
		// comparison corpus. Deriving eligibility from specs (not the older
		// baseline files) closes both bootstrap and push-event fail-open paths.
		const comparisonSha = resolveComparisonSha();
		if (comparisonSha === undefined) {
			errors.push(
				`cannot resolve comparison revision to check the baseline ratchets (needs fetch-depth: 0)`
			);
		} else if (comparisonSha !== null) {
			const eligible = baselineEligibilityFromCorpus(readSpecCorpusAtRev(comparisonSha));
			errors.push(...checkHeadingBaselineRatchet(eligible.headings, headingBaseline));
			errors.push(...checkSupersedeBaselineRatchet(eligible.supersedes, [...supersedeBaseline]));
		}
	}

	specs.sort((a, b) => b.id.localeCompare(a.id));
	const computed = JSON.stringify({ generated: null, specs }, null, '\t') + '\n';

	if (check) {
		const existing = existsSync(OUT_PATH) ? readFileSync(OUT_PATH, 'utf8') : '';
		if (existing !== computed)
			errors.push(`${OUT_PATH} is stale — run \`node scripts/spec-index.mjs\` and commit the result`);
	}

	if (errors.length) {
		console.error(errors.join('\n'));
		process.exit(1);
	}

	if (check) {
		console.log(`spec-index --check passed: ${specs.length} specs, ${OUT_PATH} up to date`);
	} else {
		writeFileSync(OUT_PATH, computed);
		console.log(`${OUT_PATH} written: ${specs.length} specs`);
	}
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) main();
