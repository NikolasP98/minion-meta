import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import express from '/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/b-factory/runner/node_modules/express/index.js';
const root = mkdtempSync(join(tmpdir(), 'jev-accounting-'));
process.env.FACTORY_DATA = root;
process.env.FACTORY_RUNS_DIR = join(root, 'runs');
process.env.FACTORY_REPOS_FILE = join(root, 'repos.json');
const { db } = await import('/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/b-factory/runner/src/db.ts');
const { parseFinishResult, finish } = await import('/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/b-factory/runner/src/queue.ts');
const { readJevRunAccounting, appendJevAccounting, jevJournalPath } = await import('/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/b-factory/runner/src/jev-accounting.ts');
const { mintJevCapability, resetJevCapabilitiesForTests, jevRunLedgerSnapshot } = await import('/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/b-factory/runner/src/jev-proxy.ts');
const { beginJevRequest, jevDecideRoute } = await import('/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/b-factory/runner/src/jev-http.ts');
const { reserveStageSpend } = await import('/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/b-factory/runner/src/budget-reservations.ts');
const { runStageNums, computeStats } = await import('/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/b-factory/runner/src/stats.ts');
const exec = promisify(execFile);
after(() => {
	db.close();
	rmSync(root, { recursive: true, force: true });
});
function seed(id: string) {
	db.prepare(
		"INSERT INTO runs(id,repo_id,task,title,status,max_turns,kind,created_at) VALUES (?,'minion-factory','fixture','fixture','running',2,'dev',?)"
	).run(id, new Date().toISOString());
}
for (const mode of ['known-error'] as const) {
	test(`A08 actual guard cleanup → all worker emitters → queue settlement (${mode})`, async () => {
		resetJevCapabilitiesForTests();
		let calls = 0; const failures: unknown[] = [];
		process.env.FACTORY_OPENROUTER_API_KEY = 'loopback-only';
		const provider = createServer(async (req, res) => {
			calls++;
			let body = '';
			for await (const c of req) body += c;
			const q = JSON.parse(body).questions as Record<string, unknown>;
			res.end(
				JSON.stringify({
					model: 'fixture',
					answers: Object.fromEntries(Object.keys(q).map((k) => [k, { type: 'noul', noul: mode === 'known-error' ? 2 : 0 }])),
					usage: { input_tokens: 2, output_tokens: 1, ...(mode === 'known-error' ? { cost: 0.000001 } : {}) }
				})
			);
		});
		await new Promise<void>((r) => provider.listen(0, '127.0.0.1', r));
		const pa = provider.address();
		assert.ok(pa && typeof pa === 'object');
		process.env.FACTORY_JEV_ENDPOINT = `http://127.0.0.1:${pa.port}`;
		let token = '';
		const app = express();
		app.use(beginJevRequest);
		app.use(express.json());
		app.use((_req, res, next) => {
			if (mode === 'denied') {
				res.status(401).json({ ok: false, reason: 'unauthorized' });
				return;
			}
			res.locals.capability = 'jev';
			res.locals.jevToken = token;
			next();
		});
		app.post('/jev/decide', jevDecideRoute);
		const server = createServer(app);
		await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
		const sa = server.address();
		assert.ok(sa && typeof sa === 'object');
		try {
			for (const worker of ['run', 'spec', 'reconcile']) {
				const id = `account-${mode}-${worker}`,
					out = join(root, 'runs', id);
				mkdirSync(out, { recursive: true });
				seed(id);
				token = mintJevCapability(id);
				reserveStageSpend(
					{
						runId: id,
						phase: 'fixture',
						attempt: 1,
						provider: 'claude',
						model: 'sonnet',
						estimatedUsd: 1,
						costSource: 'provider-reported'
					},
					null
				);
				const hook = exec('bash', [resolve('../agent/hooks/jev-guard.sh')], {
					cwd: out,
					env: {
						PATH: '/usr/bin:/bin',
						HOME: out,
						FACTORY_OUT_DIR: out,
						FACTORY_RUN_ID: id,
						FACTORY_JEV_GUARD: 'shadow',
						FACTORY_JEV_LIB: resolve('../agent/lib/jev.sh'),
						FACTORY_JEV_PROXY_URL: `http://127.0.0.1:${sa.port}`,
						FACTORY_JEV_CAPABILITY: token
					}
				});
				hook.child.stdin?.end(JSON.stringify({ tool_name: 'Bash', cwd: '/work', tool_input: { command: 'git status' } }));
				await hook;
				assert.equal(
					readdirSync(out).some((f) => f.startsWith('jev-guard-') && (f.endsWith('-result.json') || f.endsWith('-error.json'))),
					false,
					'guard removed temporary receipt'
				);
				const source = readFileSync(resolve(`../agent/${worker}.sh`), 'utf8');
				const emitter = source.match(/\nemit\(\) \{[\s\S]*?\n\}/)?.[0];
				assert.ok(emitter);
				const script = join(out, 'emit.sh');
				writeFileSync(
					script,
					`. "$1"\n${emitter}\nRESULT="$FACTORY_OUT_DIR/result.json"; test_exit=0; note=fixture; CODEX_CALLS=0; SPEC_ID=fixture; SPEC_COMMIT_SHA=; emit\n`
				);
				await exec('bash', [script, resolve('../agent/lib/cost.sh')], {
					cwd: out,
					env: { ...process.env, FACTORY_OUT_DIR: out, FACTORY_RUN_ID: id }
				});
				const result = parseFinishResult(JSON.parse(readFileSync(join(out, 'result.json'), 'utf8')));
				assert.equal(result.costUsd, mode === 'known-error' ? 0.000001 : 0);
				assert.equal(result.knownCostUsd, result.costUsd);
				assert.equal(result.unknownAttemptCount, mode === 'unknown' ? 1 : 0);
				assert.equal(result.costCoverage, mode === 'unknown' ? 'incomplete' : 'complete');
				finish(id, 0, out);
				const stored = db.prepare('SELECT cost_usd,status FROM runs WHERE id=?').get(id) as { cost_usd: number; status: string };
				assert.equal(stored.cost_usd, result.knownCostUsd);
				assert.equal(stored.status, 'passed');
				const reservation = db.prepare('SELECT settled_at,actual_usd FROM budget_reservations WHERE run_id=?').get(id) as {
					settled_at: string | null;
					actual_usd: number | null;
				};
				if (reservation.settled_at === null) failures.push({worker,issue:'known reservation not settled',reservation});
				if (reservation.settled_at !== null) assert.equal(reservation.actual_usd, result.knownCostUsd);
				const accounting = readJevRunAccounting(id, out);
				assert.equal(accounting.unknownAttemptCount, mode === 'unknown' ? 1 : 0);
				assert.equal(accounting.costCoverage, mode === 'unknown' ? 'incomplete' : 'complete');
				assert.equal(accounting.knownCostUsd, result.knownCostUsd);
				console.log(JSON.stringify({worker,cost:result.knownCostUsd,shellRevision:result.receiptRevision,runnerRevision:accounting.receiptRevision,reservation})); if(accounting.receiptRevision!==result.receiptRevision) failures.push({worker,issue:'revision mismatch'});
				assert.equal(accounting.admittedAttemptCount, mode === 'denied' ? 0 : 1);
			}
			assert.equal(calls, 3); assert.deepEqual(failures, []);
		} finally {
			server.closeAllConnections();
			provider.closeAllConnections();
			await new Promise<void>((r) => server.close(() => r()));
			await new Promise<void>((r) => provider.close(() => r()));
		}
	});
}

