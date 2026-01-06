import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

const { Pool } = pg;

// Use DATABASE_URL as the primary connection string (Replit standard)
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL must be set for database connection.");
}

// Singleton pattern enforcement - prevent multiple pool instances
let poolInstance: pg.Pool | null = null;

function createPool(): pg.Pool {
  if (poolInstance) {
    return poolInstance;
  }

  poolInstance = new Pool({
    connectionString,
    // Connection pool limits - prevent overwhelming the database
    max: 10,                        // Maximum connections in pool
    min: 2,                         // Minimum connections to keep alive
    idleTimeoutMillis: 30000,       // Close idle connections after 30s
    connectionTimeoutMillis: 30000, // Wait up to 30s for connection (Neon cold starts)
    // Query statement timeout - prevent runaway queries
    statement_timeout: 60000,       // 60 second query timeout
    // Keep-alive settings for connection health
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  });

  // Connection health monitoring
  poolInstance.on('connect', (client) => {
    // Set search_path for PostgreSQL built-in types
    client.query('SET search_path TO public, pg_catalog, "$user"');
    // Set statement timeout at session level as fallback
    client.query('SET statement_timeout = 60000');
  });

  poolInstance.on('error', (err, client) => {
    console.error('[DB Pool] Unexpected error on idle client:', err.message);
  });

  poolInstance.on('acquire', (client) => {
    // Log when connections are acquired (for debugging connection exhaustion)
    if (process.env.DEBUG_DB === 'true') {
      console.log(`[DB Pool] Connection acquired. Total: ${poolInstance?.totalCount}, Idle: ${poolInstance?.idleCount}, Waiting: ${poolInstance?.waitingCount}`);
    }
  });

  poolInstance.on('release', (err, client) => {
    if (err) {
      console.error('[DB Pool] Error releasing client:', err.message);
    }
  });

  return poolInstance;
}

// Use standard pg driver with Neon connection
export const pool = createPool();

/**
 * Get pool statistics for monitoring
 */
export function getPoolStats() {
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
  };
}

/**
 * Execute a query with timeout protection
 */
export async function queryWithTimeout<T>(
  queryFn: () => Promise<T>,
  timeoutMs: number = 30000
): Promise<T> {
  return Promise.race([
    queryFn(),
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error(`Query timeout after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

/**
 * Graceful shutdown - close all connections
 */
export async function closePool(): Promise<void> {
  if (poolInstance) {
    await poolInstance.end();
    poolInstance = null;
    console.log('[DB Pool] All connections closed');
  }
}

// Handle process termination gracefully
process.on('SIGTERM', async () => {
  console.log('[DB Pool] SIGTERM received, closing connections...');
  await closePool();
});

process.on('SIGINT', async () => {
  console.log('[DB Pool] SIGINT received, closing connections...');
  await closePool();
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

export const db = drizzle(pool, { 
  schema,
  logger: false,
});