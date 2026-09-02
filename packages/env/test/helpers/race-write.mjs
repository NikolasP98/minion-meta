// Run under `tsx` — see race-key-file.mjs for why. Invoked as a real, separate OS process by
// test/cache.test.ts's "two interleaved cross-process writes" test: two of these write different
// keys into the same sealed cache file, released from a shared spin-wait barrier at (as close to) the
// same instant, so `writeDiskEntry`'s read-merge-seal-publish transaction actually overlaps.
import * as fs from 'node:fs';
import { writeCache } from '../../src/cache.ts';

const [, , xdgConfigHome, barrierPath, outPath, cacheKeyName, value] = process.argv;
process.env.XDG_CONFIG_HOME = xdgConfigHome;

const deadline = Date.now() + 10_000;
while (!fs.existsSync(barrierPath)) {
	if (Date.now() > deadline) throw new Error('timed out waiting for the race barrier');
}

writeCache(cacheKeyName, { V: value }, 300_000, ['V']);

fs.writeFileSync(outPath, JSON.stringify({ finishedAt: Date.now() }));
