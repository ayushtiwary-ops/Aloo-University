/**
 * Centralised environment configuration.
 * Validated once at startup — missing required vars throw immediately.
 */
import 'dotenv/config';

const REQUIRED = ['DATABASE_URL', 'JWT_SECRET'];

for (const key of REQUIRED) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = Object.freeze({
  port:           parseInt(process.env.PORT ?? '3001', 10),
  nodeEnv:        process.env.NODE_ENV ?? 'development',
  databaseUrl:    process.env.DATABASE_URL,
  jwtSecret:      process.env.JWT_SECRET,
  jwtExpiresIn:   process.env.JWT_EXPIRES_IN ?? '8h',
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
  isProd:         process.env.NODE_ENV === 'production',
});
