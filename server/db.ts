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

// Enhanced connection pool with optimized settings for production
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 5, // Increased pool size for better concurrency
  min: 1, // Keep 1 connection warm
  idleTimeoutMillis: 30000, // Longer idle timeout for connection reuse
  connectionTimeoutMillis: 8000, // Reasonable connection timeout
  acquireTimeoutMillis: 8000, // Timeout for acquiring connections
  maxUses: 7500, // Maximum uses per connection
  allowExitOnIdle: false, // Keep pool alive
});

// Enhanced pool monitoring and error handling
let connectionCount = 0;
let queryCount = 0;

pool.on('connect', () => {
  connectionCount++;
  console.log(`[DB POOL] Connection established. Active: ${connectionCount}`);
});

pool.on('remove', () => {
  connectionCount--;
  console.log(`[DB POOL] Connection removed. Active: ${connectionCount}`);
});

pool.on('error', (err) => {
  console.error('[DB POOL] Pool error:', err);
});

// Database health monitoring
export const checkDatabaseHealth = async () => {
  try {
    const start = Date.now();
    await pool.query('SELECT 1');
    const duration = Date.now() - start;
    return { 
      healthy: true, 
      responseTime: duration,
      activeConnections: connectionCount,
      totalQueries: queryCount
    };
  } catch (error) {
    return { 
      healthy: false, 
      error: error.message,
      activeConnections: connectionCount,
      totalQueries: queryCount
    };
  }
};

// Query wrapper for monitoring
export const monitoredQuery = async (queryFn: () => Promise<any>, operationName: string) => {
  const start = Date.now();
  queryCount++;
  
  try {
    const result = await queryFn();
    const duration = Date.now() - start;
    
    if (duration > 1000) {
      console.log(`[DB SLOW] ${operationName} took ${duration}ms`);
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`[DB ERROR] ${operationName} failed after ${duration}ms:`, error);
    throw error;
  }
};

// Clean up connections on exit - but only in development
process.on('SIGINT', () => {
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    pool.end();
  }
});

process.on('SIGTERM', () => {
  const isProduction = process.env.NODE_ENV === 'production';
  console.log(`[DB SIGTERM ${isProduction ? 'PROD' : 'DEV'}] Received SIGTERM`);
  if (!isProduction) {
    pool.end();
  } else {
    console.log(`[DB SIGTERM PROD] Ignoring SIGTERM in production to keep database connections alive`);
  }
});

export const db = drizzle({ client: pool, schema });

console.log(`[DB CONNECTION ${isProduction ? 'PROD' : 'DEV'}] Database connection established`);