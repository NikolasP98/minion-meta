// Bump / revert the FACES QA account's RBAC role. Usage: bun _qa-role.ts staff | revert | show
import { createClient } from '@supabase/supabase-js';
const env: Record<string, string> = {};
for (const f of ['.env', '.env.local']) for (const l of (await Bun.file(process.env.HOME + '/Documents/CODE/MINION/minion_hub/' + f).text()).split('\n')) { if (!/^[A-Z_]+=/.test(l)) continue; const i = l.indexOf('='); const v = l.slice(i + 1).replace(/^"|"$/g, '').trim(); if (v) env[l.slice(0, i)] = v; }
const admin = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const ORG = '21e0601b-f632-43fd-8414-d644af4271f4', PROFILE = 'c3eadfd5-286b-46f9-8f18-f11a73f4113b';
const STATE = process.env.HOME + '/Documents/CODE/MINION/.local/figcraft/work/.faces-qa-role.json';
const { data: rows, error } = await admin.from('member_roles').select('org_id, profile_id, role_key').eq('org_id', ORG).eq('profile_id', PROFILE);
if (error) throw error;
console.log('current member_roles:', JSON.stringify(rows));
const mode = process.argv[2];
if (mode === 'staff') {
  if (await Bun.file(STATE).exists()) throw new Error('previous role state still saved at ' + STATE + ' — run `revert` first (never overwrite the saved viewer row)');
  if (rows.some(r => r.role_key === 'staff')) throw new Error('already staff; nothing saved, nothing changed');
  await Bun.write(STATE, JSON.stringify(rows));
  const del = await admin.from('member_roles').delete().eq('org_id', ORG).eq('profile_id', PROFILE); if (del.error) throw del.error;
  const ins = await admin.from('member_roles').insert({ org_id: ORG, profile_id: PROFILE, role_key: 'staff' }); if (ins.error) throw ins.error;
  console.log('bumped to staff; previous rows saved to', STATE);
} else if (mode === 'revert') {
  const prev = JSON.parse(await Bun.file(STATE).text());
  const del = await admin.from('member_roles').delete().eq('org_id', ORG).eq('profile_id', PROFILE); if (del.error) throw del.error;
  if (prev.length) { const ins = await admin.from('member_roles').insert(prev); if (ins.error) throw ins.error; }
  const { unlinkSync } = await import('node:fs'); unlinkSync(STATE);  // state consumed: the next `staff` must start from the live row again
  console.log('reverted to', JSON.stringify(prev));
}
const after = await admin.from('member_roles').select('role_key').eq('org_id', ORG).eq('profile_id', PROFILE);
console.log('now:', JSON.stringify(after.data));
