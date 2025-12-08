import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

const { Pool } = pg;

// Build connection from PG* environment variables (direct Neon connection)
const pgHost = process.env.PGHOST;
const pgPort = process.env.PGPORT || '5432';
const pgUser = process.env.PGUSER;
const pgPassword = process.env.PGPASSWORD;
const pgDatabase = process.env.PGDATABASE;

if (!pgHost || !pgUser || !pgPassword || !pgDatabase) {
  throw new Error(
    "Database credentials (PGHOST, PGUSER, PGPASSWORD, PGDATABASE) must be set.",
  );
}

// Build connection string from PG* variables
const connectionString = `postgresql://${pgUser}:${pgPassword}@${pgHost}:${pgPort}/${pgDatabase}?sslmode=require`;

// Use standard pg driver with direct Neon connection
export const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export const db = drizzle(pool, { schema });