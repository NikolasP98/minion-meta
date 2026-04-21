import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'turso',
  schema: ['./packages/db/src/schema/**/*.ts'],
  out: './packages/db/drizzle',
  dbCredentials: {
    url: process.env.TURSO_DB_URL ?? 'file:./minion_hub/data/minion_hub.db',
    authToken: process.env.TURSO_DB_AUTH_TOKEN,
  },
});
