// Jev shadow decisions (PR-2): a per-run, revocable decision proxy so a
// container can get a Jev second opinion WITHOUT ever holding the real
// OpenRouter key. Only the runner process holds FACTORY_OPENROUTER_API_KEY;
// a container gets a scoped bearer capability (`fjc_...`) minted for its run
// and posts to POST /jev/decide, which is authenticated ONLY by this
// capability (see index.ts's auth middleware — admin FACTORY_SECRET is
// deliberately not accepted on this route).
//
// State: an in-memory Map, exactly one live token per run. A runner restart
// drops it entirely — every outstanding capability then 401s, and every
// container-side caller (agent/lib/jev.sh) treats that identically to
// `unconfigured` (fail open, shadow-only, never blocks a container). This is
// an accepted gap: a capability that cannot survive a restart is preferable
// to one persisted in the database, and Jev never carries behavioral weight.
import { randomBytes } from 'node:crypto';
import { jevDecide, jevShadowLog, type JevQuestion, type JevResult } from './jev.js';

const TOKEN_PREFIX = 'fjc_';
const DEFAULT_MAX_CALLS = 300;
const DEFAULT_MAX_USD = 0.5;
const MAX_QUESTIONS = 40;
const SITE_RE = /^[a-z0-9-]{1,40}$/;
const QUESTION_KEY_RE = /^[A-Za-z0-9_.:/-]{1,120}$/;
// MEDIUM-1: a container-supplied `today` is opaque, caller-controlled JSON —
// cap it the same way jev.ts caps `state`, so a misbehaving/malicious
// container cannot grow the central shadow log without bound.
const MAX_TODAY_JSON_BYTES = 4096;
// MEDIUM-2: these `site` values are written ONLY by the runner itself
// (queue.ts's classifyFailureViaJev, scripts/unstick-cron.sh's host cron,
// agent/rank.sh, and the future mergescan/spec-grounding/etc. call sites) —
// a container forging one of them into the central log would poison the
// calibration report's per-site stats with data that never went through the
// runner's own decision path. Only a container can reach POST /jev/decide
// with a `site`, so this list is exactly "sites no container may claim".
const RUNNER_OWNED_SITES = new Set(['retry-policy', 'unstick', 'spec-grounding', 'task-size', 'provider-health', 'auto-approve', 'discovery-zone']);
// MEDIUM-3: OpenRouter not reporting `usage.cost` (costSource:'unknown') must
// still count toward the per-run spend cap — otherwise a run can make
// unlimited "free" calls just by getting cost-unreported responses. $0.042
// per 1M input tokens is a documented, deliberately conservative stand-in
// (roughly a mid-tier model's input rate) until real provider billing data
// says otherwise.
const UNKNOWN_COST_USD_PER_INPUT_TOKEN = 0.042 / 1_000_000;

type CapabilityEntry = { runId: string; issuedAt: number; calls: number; spentMicroUsd: number };

const byToken = new Map<string, CapabilityEntry>();
const byRunId = new Map<string, string>();

/**
 * Mints (or replaces) the one live capability for a run. Idempotent per run:
 * a second mint for the same run id revokes the first — no run ever holds
 * two live tokens at once.
 */
export function mintJevCapability(runId: string): string {
	const existing = byRunId.get(runId);
	if (existing) byToken.delete(existing);
	// 36 bytes -> 48 base64url chars, no padding.
	const token = TOKEN_PREFIX + randomBytes(36).toString('base64url');
	byToken.set(token, { runId, issuedAt: Date.now(), calls: 0, spentMicroUsd: 0 });
	byRunId.set(runId, token);
	return token;
}

/** Existing capability token for a run, if any — a pure read, no mutation. */
export function jevCapabilityForRun(runId: string): string | undefined {
	return byRunId.get(runId);
}

/** Called from every run-terminal path in queue.ts. Idempotent; a run with
 * no live capability is a no-op. */
export function revokeJevCapability(runId: string): void {
	const token = byRunId.get(runId);
	if (!token) return;
	byToken.delete(token);
	byRunId.delete(runId);
}

/**
 * Backstop for any terminal path this slice missed: drops any capability
 * older than `FACTORY_RUN_TIMEOUT` minutes (default 75) + 30 — a generous
 * multiple of the longest a run should ever stay alive. Safe to call on a
 * timer; returns the number of capabilities it dropped (test hook).
 */
export function sweepExpiredJevCapabilities(now = Date.now()): number {
	const timeoutMin = Number(process.env.FACTORY_RUN_TIMEOUT) > 0 ? Number(process.env.FACTORY_RUN_TIMEOUT) : 75;
	const maxAgeMs = (timeoutMin + 30) * 60_000;
	let dropped = 0;
	for (const [token, entry] of byToken) {
		if (now - entry.issuedAt > maxAgeMs) {
			byToken.delete(token);
			byRunId.delete(entry.runId);
			dropped++;
		}
	}
	return dropped;
}

/**
 * Auth-only lookup: does this token name a live capability? Plain `Map.get`,
 * not a `timingSafeEqual` scan like the admin/hook/unstick secrets in
 * index.ts: those are short, low-entropy, operator-chosen strings where a
 * timing side-channel could narrow a guess. A `fjc_` token is 288 bits of
 * `randomBytes`, one per run, revoked at run end — there is no shared secret
 * to time an attack against, so a hash-map lookup's timing variance leaks
 * nothing an attacker didn't already need the exact token to exploit.
 */
export function resolveJevCapability(token: string): { runId: string } | null {
	const entry = byToken.get(token);
	return entry ? { runId: entry.runId } : null;
}

/** Test-only escape hatch: drops every minted capability. */
export function resetJevCapabilitiesForTests(): void {
	byToken.clear();
	byRunId.clear();
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidQuestion(value: unknown): value is JevQuestion {
	if (!isRecord(value) || typeof value.instructions !== 'string') return false;
	if (value.type === 'noul') {
		if (value.criteria === undefined) return true;
		if (!isRecord(value.criteria)) return false;
		return (value.criteria.true === undefined || typeof value.criteria.true === 'string')
			&& (value.criteria.false === undefined || typeof value.criteria.false === 'string');
	}
	if (value.type === 'choice') {
		return isRecord(value.criteria) && Object.values(value.criteria).every((v) => typeof v === 'string');
	}
	if (value.type === 'score') {
		return Array.isArray(value.criteria) && value.criteria.every((v) => typeof v === 'string');
	}
	return false;
}

// LOW: `__proto__`/`constructor`/`prototype` all pass QUESTION_KEY_RE (it's
// letters/digits/underscore-only for these three) — reject them explicitly,
// and build `questions` with Object.create(null) so even a key the checks
// below miss can never reach Object.prototype's `__proto__` accessor.
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function validateQuestions(value: unknown): Record<string, JevQuestion> | null {
	if (!isRecord(value)) return null;
	const keys = Object.keys(value);
	if (keys.length === 0 || keys.length > MAX_QUESTIONS) return null;
	const questions: Record<string, JevQuestion> = Object.create(null) as Record<string, JevQuestion>;
	for (const key of keys) {
		if (!QUESTION_KEY_RE.test(key) || FORBIDDEN_KEYS.has(key)) return null;
		const q = value[key];
		if (!isValidQuestion(q)) return null;
		questions[key] = q;
	}
	return questions;
}

export type JevProxyRequestBody = {
	site?: unknown;
	state?: unknown;
	questions?: unknown;
	today?: unknown;
};

export type JevProxyOutcome =
	| { status: 200; body: JevResult }
	| { status: 400; body: { ok: false; reason: string } }
	| { status: 401; body: { ok: false; reason: string } }
	| { status: 429; body: { ok: false; reason: 'run_budget' } };

/**
 * The full route body for POST /jev/decide, given an already-authenticated
 * token (index.ts's auth middleware resolved it before this runs). Never
 * logs `state` — only a one-line summary, exactly like jev.ts's own callers.
 */
export async function handleJevDecideRequest(token: string, rawBody: unknown): Promise<JevProxyOutcome> {
	const entry = byToken.get(token);
	if (!entry) return { status: 401, body: { ok: false, reason: 'unauthorized' } };
	// LOW: a 400 still costs the runner a validation pass and, for a
	// misbehaving/malicious container, an unlimited number of them would
	// never be capped — every rejection below counts against the SAME
	// per-run call budget a successful call does.
	const reject400 = (reason: string): JevProxyOutcome => {
		entry.calls += 1;
		return { status: 400, body: { ok: false, reason } };
	};
	if (!isRecord(rawBody) || typeof rawBody.site !== 'string' || !SITE_RE.test(rawBody.site)) {
		return reject400('invalid_site');
	}
	// MEDIUM-2: these sites are written only by the runner's own call sites
	// (see RUNNER_OWNED_SITES) — a container claiming one would let it forge
	// entries the calibration report attributes to runner-originated decisions.
	if (RUNNER_OWNED_SITES.has(rawBody.site)) return reject400('forbidden_site');
	const questions = validateQuestions(rawBody.questions);
	if (!questions) return reject400('invalid_questions');
	if (!('state' in rawBody)) return reject400('invalid_state');
	// MEDIUM-1: `today` is opaque container-supplied JSON with no schema —
	// cap its serialized size so a container cannot grow the central shadow
	// log without bound.
	if (JSON.stringify(rawBody.today ?? null).length > MAX_TODAY_JSON_BYTES) return reject400('today_too_large');

	const maxCalls = Number(process.env.FACTORY_JEV_RUN_MAX_CALLS) > 0 ? Number(process.env.FACTORY_JEV_RUN_MAX_CALLS) : DEFAULT_MAX_CALLS;
	const maxUsd = Number(process.env.FACTORY_JEV_RUN_MAX_USD) > 0 ? Number(process.env.FACTORY_JEV_RUN_MAX_USD) : DEFAULT_MAX_USD;
	if (entry.calls >= maxCalls || entry.spentMicroUsd / 1_000_000 >= maxUsd) {
		return { status: 429, body: { ok: false, reason: 'run_budget' } };
	}

	const site = rawBody.site;
	const jev = await jevDecide({ site, state: rawBody.state, questions });
	entry.calls += 1;
	if (jev.ok) {
		// MEDIUM-3: a cost-unreported (costSource:'unknown') response still
		// used real upstream tokens — jev.ts already zeroes costUsd for it,
		// so without this the per-run $ cap is trivially bypassable by any
		// response OpenRouter doesn't attach billing to. Charge a
		// conservative per-input-token estimate instead of nothing.
		const chargeUsd = jev.costSource === 'provider-reported'
			? jev.costUsd
			: jev.usage.inputTokens * UNKNOWN_COST_USD_PER_INPUT_TOKEN;
		entry.spentMicroUsd += Math.round(chargeUsd * 1_000_000);
	}
	// MEDIUM-2: tag the shadow entry with its origin so the calibration
	// report (and any human reading the raw log) can tell a container's own
	// decision request apart from one the runner made on its own behalf.
	jevShadowLog({ site, runId: entry.runId, today: rawBody.today ?? null, jev, origin: 'container' });
	console.log(`[jev] run=${entry.runId} site=${site} ok=${jev.ok} ms=${jev.ms}`);
	return { status: 200, body: jev };
}
