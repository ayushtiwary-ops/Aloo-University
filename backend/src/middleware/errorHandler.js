import { env }      from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { logger }   from '../utils/logger.js';

/**
 * Global Express error handler.
 * Must be registered last (after all routes).
 *
 * - ApiError  → structured response with its status code
 * - Other     → 500 in production (stack trace in development only)
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message });
  }

  // Unexpected error — log server-side, never expose stack to client
  logger.error({ err }, 'Unhandled error');

  res.status(500).json({
    error: env.isProd ? 'Internal server error' : err.message,
  });
}
