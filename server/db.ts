import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

const isReplit = !!process.env.REPL_ID;

function getConnectionString(): string {
  if (isReplit && process.env.NEON_PRODUCTION_DATABASE_URL) {
    let url = process.env.NEON_PRODUCTION_DATABASE_URL;
    if (url.includes('-pooler')) {
      url = url.replace('-pooler', '');
    }
    console.log('[DB] Development mode: using dev database (ep-round-firefly)');
    return url;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }

  console.log('[DB] Production mode: using production database');
  return process.env.DATABASE_URL;
}

const connectionString = getConnectionString();
export const pool = new Pool({ connectionString });
export const db = drizzle({ client: pool, schema });
