import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const stub = (name) =>
  path.join(root, 'hub/src/server/test-utils/env-stubs', name + '.ts');
export default {
  root,
  resolve: {
    alias: {
      $lib: path.join(root, 'hub/src/lib'),
      $server: path.join(root, 'hub/src/server'),
      '$env/dynamic/private': stub('dynamic-private'),
      '$env/dynamic/public': stub('dynamic-public'),
      '$env/static/public': stub('static-public'),
      '$app/environment': stub('app-environment'),
      '$app/state': stub('app-state'),
    },
  },
  test: {
    include: [
      'tests/hub*.test.ts',
      'hub/src/lib/finance/period.test.ts',
      'hub/src/server/scheduling/slots.test.ts',
      'hub/src/server/services/scheduling-bookings-override.test.ts',
      'hub/src/server/services/scheduling-bookings-group-create.test.ts',
    ],
    setupFiles: ['tests/hub-nearby.setup.ts'],
    environment: 'node',
    maxWorkers: 1,
    minWorkers: 1,
    testTimeout: 30000,
    hookTimeout: 30000,
  },
};
