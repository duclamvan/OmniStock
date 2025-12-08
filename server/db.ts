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
// Increased timeouts for Neon serverless cold starts (can take 15+ seconds)
export const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000, // 30 seconds for Neon cold starts
});

// Run startup migration to fix shipping_method column type (converts enum to text if needed)
(async () => {
  try {
    const client = await pool.connect();
    try {
      // Check if shipping_method is still an enum type
      const result = await client.query(`
        SELECT data_type, udt_name FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'shipping_method'
      `);
      
      if (result.rows.length > 0 && result.rows[0].udt_name === 'shipping_method') {
        console.log('🔄 Migrating shipping_method column from enum to text...');
        await client.query('ALTER TABLE orders ALTER COLUMN shipping_method TYPE text USING shipping_method::text');
        await client.query('DROP TYPE IF EXISTS shipping_method');
        console.log('✅ shipping_method column migrated to text');
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Warning: Could not run shipping_method migration:', error);
  }
})();

export const db = drizzle(pool, { schema });