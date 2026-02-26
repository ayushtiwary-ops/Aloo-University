/**
 * Rate limiter scoped exclusively to POST /api/auth/login.
 *
 * 5 attempts per 15 minutes per IP.
 * Returns 429 with a generic message — no detail that reveals
 * whether an account exists or why a login failed.
 */
import rateLimit from 'express-rate-limit';

export const loginRateLimiter = rateLimit({
  windowMs:             15 * 60 * 1000,   // 15 minutes
  max:                  5,
  standardHeaders:      true,              // RateLimit-* headers (RFC 6585)
  legacyHeaders:        false,             // disable X-RateLimit-* headers
  skipSuccessfulRequests: false,           // count every attempt, including successful logins
  message: { error: 'Too many login attempts. Please try again later.' },

  // Custom handler keeps the response format consistent with the rest of the API
  handler(_req, res) {
    res.status(429).json({ error: 'Too many login attempts. Please try again later.' });
  },
});
