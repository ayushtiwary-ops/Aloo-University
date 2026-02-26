/**
 * HTTP request / response logger middleware.
 *
 * Logs on response `finish` so the status code is available.
 * Never logs the request body — it may contain passwords or PII.
 * The `userId` field is populated post-auth when req.user is set.
 */
import { logger } from '../utils/logger.js';

export function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const ms  = Date.now() - start;
    const log = {
      method: req.method,
      path:   req.path,
      status: res.statusCode,
      ms,
      ...(req.user?.id ? { userId: req.user.id } : {}),
    };

    // 5xx → error, 4xx → warn, rest → info
    if (res.statusCode >= 500)      logger.error(log, 'request');
    else if (res.statusCode >= 400) logger.warn(log,  'request');
    else                            logger.info(log,  'request');
  });

  next();
}
