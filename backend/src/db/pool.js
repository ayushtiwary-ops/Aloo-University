import pg from 'pg';
import { env }    from '../config/env.js';
import { logger } from '../utils/logger.js';

const { Pool } = pg;

/**
 * Single pg connection pool shared across the process.
 * Max 20 connections; idle connections released after 30 s.
 */
const pool = new Pool({
  connectionString: env.databaseUrl,
  max:             20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl: env.isProd ? { rejectUnauthorized: true } : false,
});

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected error on idle DB pool client');
});

/**
 * Executes a parameterized SQL query.
 *
 * @param   {string}  text   - SQL with $1, $2 … placeholders
 * @param   {Array}   params - Bound parameter values
 * @returns {Promise<pg.QueryResult>}
 */
export async function query(text, params) {
  const start  = Date.now();
  const result = await pool.query(text, params);
  const ms     = Date.now() - start;

  if (!env.isProd) {
    logger.debug({ ms, query: text.slice(0, 80) }, 'db query');
  }

  return result;
}

/**
 * Acquire a client for transactions.
 * Caller MUST release it in a finally block.
 *
 * @returns {Promise<pg.PoolClient>}
 */
export const getClient = () => pool.connect();

export default pool;
