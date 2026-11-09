import path from 'node:path';
const root='/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/e-digest';
const audit='/home/nikolas/Documents/CODE/MINION/audits/2026-10-23-agent-harness-batches/verification/e-digest';
export default {
 root,envDir:false,cacheDir:audit+'/correction-e02/.vite-native',
 resolve:{alias:{
   'vitest':root+'/node_modules/vitest/dist/index.js',
   '$server':root+'/src/server','$lib':root+'/src/lib',
   '$env/dynamic/private':root+'/src/server/test-utils/env-stubs/dynamic-private.ts',
   '$env/dynamic/public':root+'/src/server/test-utils/env-stubs/dynamic-public.ts',
   '$env/static/public':root+'/src/server/test-utils/env-stubs/static-public.ts',
   '$app/environment':root+'/src/server/test-utils/env-stubs/app-environment.ts'
 }},
 test:{environment:'node',include:["/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/e-digest/src/server/services/pulse-digest.admission.test.ts", "/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/e-digest/src/server/services/pulse-digest.collection.test.ts", "/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/e-digest/src/server/services/pulse-digest.publication.test.ts", "/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/e-digest/src/server/services/pulse-feedback.test.ts", "/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/e-digest/src/server/services/pulse-dispatch.store.test.ts", "/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/e-digest/src/server/services/pulse-ingest-contract.test.ts", "/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/e-digest/src/server/services/pulse-tick.budget.test.ts", "/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/e-digest/src/routes/api/gateway/pulse/proposals/server.test.ts", "/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/e-digest/scripts/qc/native-postgres-manifest.test.ts"],setupFiles:[root+'/src/server/test-utils/setup.ts'],maxWorkers:1,fileParallelism:false,hookTimeout:30000,testTimeout:30000}
};
