import jwt      from 'jsonwebtoken';
import { env }      from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { logger }   from '../utils/logger.js';

/**
 * Verifies the Bearer JWT in the Authorization header.
 * Attaches decoded payload as `req.user = { id, role }` on success.
 */
export function authenticateToken(req, res, next) {
  const header = req.headers.authorization;
  const token  = header?.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    logger.warn({ path: req.path }, 'Request rejected: missing token');
    return next(new ApiError(401, 'Authentication required'));
  }

  try {
    req.user = jwt.verify(token, env.jwtSecret);
    next();
  } catch {
    logger.warn({ path: req.path }, 'Request rejected: invalid or expired token');
    next(new ApiError(401, 'Invalid or expired token'));
  }
}

/**
 * Factory — returns middleware that allows only the specified role(s).
 * Must be used AFTER authenticateToken.
 *
 * @param {...string} roles - e.g. authorizeRole('admin')
 */
export function authorizeRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return next(new ApiError(403, 'Insufficient permissions'));
    }
    next();
  };
}

/**
 * Optional JWT extraction.
 * Does NOT reject unauthenticated requests.
 * If a valid Bearer token is present, attaches req.user; otherwise req.user stays undefined.
 * Use on public routes that benefit from knowing the caller when authenticated (e.g. POST /api/audit).
 */
export function optionalAuth(req, _res, next) {
  const header = req.headers.authorization;
  const token  = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try { req.user = jwt.verify(token, env.jwtSecret); } catch { /* ignore */ }
  }
  next();
}
