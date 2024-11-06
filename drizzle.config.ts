import { defineConfig } from 'drizzle-kit';
import config from './src/config/config.ts';

export default defineConfig({
  // schema: './src/db/schema/*.ts',
  schema: './dist/db/schema/*.js',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: config.databaseUrl
  },
  verbose: true,
  strict: true
});
