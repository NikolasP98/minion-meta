import { purgeLegacyCacheOnce } from '../../src/cache.ts';

process.env.XDG_CONFIG_HOME = process.argv[2];
purgeLegacyCacheOnce();
