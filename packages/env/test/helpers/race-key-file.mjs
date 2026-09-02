// Run under `tsx` (not plain node) so it can import the .ts sources directly, exercising the exact
// same code the unit tests do — no build step, no duplicated logic. Invoked as a real, separate OS
// process by test/cache-crypto.test.ts's "two racing OS processes" test: two of these are spawned
// against the same cache directory and released from a shared spin-wait barrier at (as close to) the
// same instant, so `getOrCreateMachineKeyFile`'s `flag: 'wx'` race-arbitration actually races.
import * as fs from 'node:fs';
import { getOrCreateMachineKeyFile, seal, open } from '../../src/cache-crypto.ts';

const [, , dir, barrierPath, outPath] = process.argv;

const deadline = Date.now() + 10_000;
while (!fs.existsSync(barrierPath)) {
	if (Date.now() > deadline) throw new Error('timed out waiting for the race barrier');
}

const key = getOrCreateMachineKeyFile(dir);
const envelope = seal(dir, Buffer.from('canary', 'utf8'));
const result = open(dir, envelope);

fs.writeFileSync(
	outPath,
	JSON.stringify({
		keyB64: key.toString('base64'),
		roundtripOk: result.ok && result.plaintext.toString('utf8') === 'canary',
	}),
);
