import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

function sanitizePoolerUrl(url: string): string {
  if (url.includes('-pooler')) {
    return url.replace('-pooler', '');
  }
  return url;
}

function getConnectionString(): string {
  const isReplit = !!process.env.REPL_ID;
  const nodeEnv = process.env.NODE_ENV || 'development';

  if (isReplit) {
    const devUrl = process.env.NEON_PRODUCTION_DATABASE_URL;
    if (!devUrl) {
      console.warn('[DB] WARNING: On Replit but NEON_PRODUCTION_DATABASE_URL not set. Falling back to DATABASE_URL.');
      if (!process.env.DATABASE_URL) {
        throw new Error('No database URL configured. Set NEON_PRODUCTION_DATABASE_URL or DATABASE_URL.');
      }
      return sanitizePoolerUrl(process.env.DATABASE_URL);
    }
    const url = sanitizePoolerUrl(devUrl);
    console.log('[DB] Development mode (Replit): using dev database');
    return url;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }

  console.log(`[DB] Production mode: using production database (NODE_ENV=${nodeEnv})`);
  return sanitizePoolerUrl(process.env.DATABASE_URL);
}

const connectionString = getConnectionString();
export const pool = new Pool({ connectionString });
export const db = drizzle({ client: pool, schema });
