import { defineConfig } from 'vitest/config';
import base from '../../../vitest.config';
import path from 'node:path';
export default defineConfig({
  ...base,
  resolve: { ...base.resolve, alias: { ...(base.resolve?.alias as Record<string,string>), $routes: path.resolve('src/routes'), $qc: path.resolve('scripts/qc') } },
  test: {
    ...base.test,
    include: ['.local/hub-white-label-145-implementation/t014/provision-native.test.ts'],
    exclude: [], maxWorkers: 1, fileParallelism: false, testTimeout: 30_000, hookTimeout: 30_000,
  },
});
