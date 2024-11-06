import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import config from '../config/config.js';
import * as schema from '../db/schema/index.js';

const pool = new pg.Pool({
  connectionString: config.databaseUrl
});

// Add event listener for successful connections
pool.on('connect', () => {
  console.log('Drizzle connected to the database');
});

const logQuery = config.env === 'development';

export const db = drizzle(pool, { schema, logger: logQuery });

export type Schema = typeof schema;
