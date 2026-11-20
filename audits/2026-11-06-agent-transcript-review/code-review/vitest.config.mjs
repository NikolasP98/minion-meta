import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
export default {
  root,
  resolve:{alias:{'$lib':path.join(root,'hub/src/lib'),'$server':path.join(root,'hub/src/server')}},
  test:{include:['repro.test.ts'],environment:'node',maxWorkers:1,minWorkers:1,testTimeout:15000},
};
