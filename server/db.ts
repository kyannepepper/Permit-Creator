import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon for better stability
neonConfig.webSocketConstructor = ws;
neonConfig.poolQueryViaFetch = true;
neonConfig.pipelineConnect = false;
neonConfig.useSecureWebSocket = true;

const isProduction = process.env.NODE_ENV === 'production';
console.log(`[DB CONNECTION ${isProduction ? 'PROD' : 'DEV'}] Initializing database connection`);

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create connection pool with minimal connections for Neon
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 1, // Use only 1 connection to avoid limits
  min: 0, // No minimum connections
  idleTimeoutMillis: 5000, // Very short idle timeout
  connectionTimeoutMillis: 10000, // Longer connection timeout
  acquireTimeoutMillis: 10000, // Timeout for acquiring connections
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('Database pool error:', err);
});

// Clean up connections on exit
process.on('SIGINT', () => {
  pool.end();
});

process.on('SIGTERM', () => {
  pool.end();
});

export const db = drizzle({ client: pool, schema });

console.log(`[DB CONNECTION ${isProduction ? 'PROD' : 'DEV'}] Database connection established`);