import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const hub = resolve(process.argv[2]);
const root = mkdtempSync(join(tmpdir(), 'minion-publisher-'));
const manifest = {
  version: '2.0.0',
  notes: 'Synthetic publication fixture',
  pub_date: '2026-10-21T00:00:00Z',
  platforms: Object.fromEntries(
    ['linux-x86_64', 'windows-x86_64', 'darwin-aarch64', 'darwin-x86_64'].map((target) => [
      target,
      {
        signature: 'synthetic',
        url: `https://github.com/NikolasP98/minion_hub/releases/download/desktop-v2.0.0/${target}`,
      },
    ]),
  ),
};
writeFileSync(join(root, 'latest.json'), JSON.stringify(manifest));
writeFileSync(
  join(root, 'preload.mjs'),
  `
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const fixture=JSON.parse(readFileSync(process.env.DESKTOP_OUTPUT+'/latest.json'));
const mode=process.env.DRY_RUN_CASE, calls=[];
const response=(body,status=200)=>new Response(status===204?null:JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
process.on('exit',()=>writeFileSync(process.env.DESKTOP_OUTPUT+'/calls.json',JSON.stringify(calls)));
globalThis.fetch=async (url,options={})=>{
 url=String(url);const method=options.method||'GET';calls.push({url,method});
 if(method==='HEAD') { assert(!options.headers?.Authorization);return response(null,mode==='missing-asset'?404:200); }
 if(url.includes('/releases/tags/desktop-v2.0.0')) return response({draft:mode==='draft'});
 if(url.includes('/releases/tags/desktop-updates')) return mode==='bootstrap'?response({},404):response({id:42,draft:false,assets:[{id:7,name:'latest.json',browser_download_url:'https://example.invalid/previous'}]});
 if(url==='https://example.invalid/previous') return response(mode==='same'?fixture:{...fixture,version:mode==='regression'?'3.0.0':'1.0.0'});
 if(method==='POST' && url.endsWith('/releases')) { assert.equal(options.headers['Content-Type'],'application/json');assert.equal(JSON.parse(options.body).make_latest,'false');return response({id:42,draft:false,assets:[]}); }
 if(method==='DELETE' && url.endsWith('/releases/assets/7')) return response(null,204);
 if(method==='POST' && url.startsWith('https://uploads.github.com/')) { assert.deepEqual(JSON.parse(options.body),fixture);return response({browser_download_url:'https://example.invalid/published'},201); }
 if(url==='https://example.invalid/published') return response(fixture);
 throw Error('Unexpected network operation: '+method+' '+url);
};
`,
);
try {
  for (const mode of ['bootstrap', 'advance', 'draft', 'regression', 'same', 'missing-asset']) {
    const result = spawnSync(
      process.execPath,
      ['--import', join(root, 'preload.mjs'), join(hub, 'scripts/desktop/publish-feed.mjs')],
      {
        cwd: hub,
        encoding: 'utf8',
        env: {
          ...process.env,
          DESKTOP_OUTPUT: root,
          GH_TOKEN: 'synthetic-token',
          GITHUB_SHA: 'a'.repeat(40),
          DRY_RUN_CASE: mode,
        },
      },
    );
    const calls = JSON.parse(readFileSync(join(root, 'calls.json')));
    const writes = calls.filter((c) => ['POST', 'DELETE', 'PATCH'].includes(c.method));
    const succeeds = ['bootstrap', 'advance', 'same'].includes(mode);
    assert.equal(result.status === 0, succeeds, mode + ': ' + result.stderr);
    if (mode === 'bootstrap')
      assert.deepEqual(
        writes.map((c) => c.method),
        ['POST', 'POST'],
      );
    else if (mode === 'advance')
      assert.deepEqual(
        writes.map((c) => c.method),
        ['DELETE', 'POST'],
      );
    else assert.equal(writes.length, 0, mode + ' mutated a release/feed');
    console.log(JSON.stringify({ case: mode, passed: true, mutations: writes.length }));
  }
} finally {
  rmSync(root, { recursive: true, force: true });
}
