// Reset the FACES QA-only account's password (documented recovery path) and print the new one to the owner's terminal.
import { createClient } from '@supabase/supabase-js';
const env: Record<string, string> = {};
for (const f of ['.env', '.env.local']) for (const l of (await Bun.file(process.env.HOME + '/Documents/CODE/MINION/minion_hub/' + f).text()).split('\n')) { if (!/^[A-Z_]+=/.test(l)) continue; const i = l.indexOf('='); const v = l.slice(i + 1).replace(/^"|"$/g, '').trim(); if (v) env[l.slice(0, i)] = v; }
const admin = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const EMAIL = 'qa.minion@facesculptors.net';
let user: any = null;
for (let page = 1; page < 20 && !user; page++) { const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 }); if (error) throw error; user = data.users.find(u => u.email === EMAIL); if (data.users.length < 200) break; }
if (!user) throw new Error('QA user not found: ' + EMAIL);
const pw = 'Qa-' + crypto.randomUUID().replace(/-/g, '').slice(0, 18) + '!7';
const { error } = await admin.auth.admin.updateUserById(user.id, { password: pw });
if (error) throw error;
const { writeFileSync } = await import('node:fs'); writeFileSync(process.env.HOME + '/Documents/CODE/MINION/.local/figcraft/work/.faces-qa-pass', pw, { mode: 0o600 });  // owner-only; .local/ is git-ignored
console.log('reset ok for', EMAIL, 'id', user.id, '-> password stored in .local/figcraft/work/.faces-qa-pass');
