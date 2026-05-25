import { defineConfig } from 'drizzle-kit';

// PG identity tables only (Phase 1). Output lands in the repo-root supabase/
// migrations dir so the Supabase GitHub integration applies it (prod + preview
// branches). Timestamp prefix keeps filenames Supabase-compatible.
export default defineConfig({
  dialect: 'postgresql',
  schema: ['./src/pg/schema/**/*.ts'],
  out: '../../supabase/migrations',
  migrations: { prefix: 'timestamp' },
  dbCredentials: {
    // Direct (5432) DSN for migration generation/apply, never the pooled one.
    url: process.env.SUPABASE_DB_URL_DIRECT ?? '',
  },
});
