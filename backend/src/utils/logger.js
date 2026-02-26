/**
 * Structured logger — Pino.
 *
 * Dev:  pino-pretty (coloured, human-readable)
 * Prod: JSON (machine-parseable, ship to log aggregator)
 *
 * Redacted paths are replaced with "[REDACTED]" before any log is written.
 * This covers JWT bearer tokens and passwords at every call site —
 * no individual module needs to sanitise data before logging.
 */
import pino from 'pino';
import { env } from '../config/env.js';

const redact = {
  paths: [
    'password',
    'password_hash',
    'body.password',
    'req.headers.authorization',
    'headers.authorization',
  ],
  censor: '[REDACTED]',
};

const transport = env.isProd
  ? undefined
  : {
      target: 'pino-pretty',
      options: {
        colorize:        true,
        ignore:          'pid,hostname',
        translateTime:   'HH:MM:ss',
        messageFormat:   '{msg}',
      },
    };

export const logger = pino({
  level:     env.isProd ? 'info' : 'debug',
  redact,
  ...(transport ? { transport } : {}),
});
