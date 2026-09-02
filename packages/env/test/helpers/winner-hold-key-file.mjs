// Held-open "winner" for the deterministic EEXIST-loser test in cache-crypto.test.ts (L1 fix).
// Creates `cache.key` empty via O_CREAT|O_EXCL, signals readiness, then blocks until the loser
// confirms (via `goPath`) that it has actually performed its still-empty read before this process
// completes the write. A same-process simulation cannot reach this interleaving: `readExistingMachineKey`
// sleeps via a synchronous `Atomics.wait`, which blocks the whole thread, so a same-process "winner"
// timer could never run while the loser's retry loop is spinning.
import * as fs from 'node:fs';
import * as path from 'node:path';

const [, , dir, readyPath, goPath] = process.argv;
const keyPath = path.join(dir, 'cache.key');

const fd = fs.openSync(keyPath, 'wx', 0o600);
fs.writeFileSync(readyPath, '');

const deadline = Date.now() + 10_000;
while (!fs.existsSync(goPath)) {
	if (Date.now() > deadline) throw new Error('timed out waiting for the go signal');
}

fs.writeSync(fd, Buffer.alloc(32, 8));
fs.closeSync(fd);
