import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const connectionString =
  process.env.DATABASE_URL ||
  'postgres://postgres:postgres@localhost:5432/thaasbai_digu';

export const pool = new Pool({
  connectionString,
  ssl:
    process.env.NODE_ENV === 'production' || connectionString.includes('sslmode=require')
      ? { rejectUnauthorized: false }
      : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', err => {
  console.error('[Database Pool Error]:', err.message);
});

export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params);
}

export async function checkDatabaseHealth(): Promise<{ connected: boolean; latencyMs?: number; error?: string }> {
  const start = Date.now();
  try {
    await pool.query('SELECT 1');
    return { connected: true, latencyMs: Date.now() - start };
  } catch (err: any) {
    return { connected: false, error: err.message };
  }
}

/**
 * Initializes database tables automatically from schema.sql on startup.
 */
export async function initDatabase(): Promise<void> {
  try {
    const health = await checkDatabaseHealth();
    if (!health.connected) {
      console.warn('[Database] PostgreSQL not connected. Server running in standalone memory mode.');
      return;
    }

    const { default: fs } = await import('fs');
    const { default: path } = await import('path');
    const { fileURLToPath } = await import('url');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const schemaPath = path.resolve(__dirname, '../db/schema.sql');

    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(sql);
      console.log('[Database] Schema verified & auto-migrated successfully.');
    }
  } catch (err: any) {
    console.warn('[Database] Auto-migration notice:', err.message);
  }
}
