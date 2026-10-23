import path from 'node:path';
const root='/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/e-digest';
const audit='/home/nikolas/Documents/CODE/MINION/audits/2026-10-23-agent-harness-batches/verification/e-digest';
export default {
 root,envDir:false,cacheDir:audit+'/correction-e02/.vite-original-retention',
 resolve:{alias:{
   'vitest':root+'/node_modules/vitest/dist/index.js',
   '$server':root+'/src/server','$lib':root+'/src/lib',
   '$env/dynamic/private':root+'/src/server/test-utils/env-stubs/dynamic-private.ts',
   '$env/dynamic/public':root+'/src/server/test-utils/env-stubs/dynamic-public.ts',
   '$env/static/public':root+'/src/server/test-utils/env-stubs/static-public.ts',
   '$app/environment':root+'/src/server/test-utils/env-stubs/app-environment.ts'
 }},
 test:{environment:'node',include:[audit+'/retention-disabled.test.ts'],setupFiles:[root+'/src/server/test-utils/setup.ts'],maxWorkers:1,fileParallelism:false,hookTimeout:30000,testTimeout:30000}
};
