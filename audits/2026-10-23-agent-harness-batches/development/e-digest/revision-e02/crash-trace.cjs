require('/home/nikolas/Documents/CODE/MINION/audits/2026-10-23-agent-harness-batches/verification/e-digest/network-deny.cjs');
const { appendFileSync } = require('node:fs');
const cp = require('node:child_process');
const { syncBuiltinESMExports } = require('node:module');
const original = cp.spawn;
const output = '/home/nikolas/Documents/CODE/MINION/audits/2026-10-23-agent-harness-batches/development/e-digest/revision-e02/crash-child-timing.jsonl';
cp.spawn = function (...args) {
  const child = original.apply(this, args);
  if (args[1]?.includes('scripts/qc/pulse-digest-crash-child.mjs')) {
    const start = performance.now();
    const checkpoint = args[2]?.env?.MINION_PULSE_CRASH_CHECKPOINT;
    const write = (record) => appendFileSync(output, JSON.stringify({ checkpoint, pid: child.pid, at: new Date().toISOString(), ...record }) + '\n');
    write({ event: 'spawn' });
    child.on('exit', (code, signal) => write({ event: 'exit', code, signal, elapsedMs: Math.round(performance.now() - start) }));
  }
  return child;
};
syncBuiltinESMExports();
