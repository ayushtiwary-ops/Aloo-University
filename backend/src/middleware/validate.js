import { ApiError } from '../utils/ApiError.js';

// ── Required fields for a valid audit record ──────────────────────────────
const AUDIT_REQUIRED = [
  'candidateData',
  'exceptionCount',
  'flagged',
  'strictValid',
];

/**
 * Validates the body of POST /api/audit.
 * Throws ApiError(400) on the first failing assertion.
 */
export function validateAuditBody(req, _res, next) {
  const body = req.body;

  for (const field of AUDIT_REQUIRED) {
    if (body[field] === undefined || body[field] === null) {
      return next(new ApiError(400, `Missing required field: ${field}`));
    }
  }

  if (typeof body.candidateData !== 'object' || Array.isArray(body.candidateData)) {
    return next(new ApiError(400, 'candidateData must be an object'));
  }

  if (!Number.isInteger(body.exceptionCount) || body.exceptionCount < 0) {
    return next(new ApiError(400, 'exceptionCount must be a non-negative integer'));
  }

  if (typeof body.flagged !== 'boolean') {
    return next(new ApiError(400, 'flagged must be a boolean'));
  }

  if (typeof body.strictValid !== 'boolean') {
    return next(new ApiError(400, 'strictValid must be a boolean'));
  }

  next();
}

/**
 * Parses and validates pagination query params.
 * Attaches { page, limit, offset } to req.pagination.
 */
export function parsePagination(req, _res, next) {
  const page  = Math.max(1, parseInt(req.query.page  ?? '1',  10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit ?? '20', 10) || 20));

  req.pagination = { page, limit, offset: (page - 1) * limit };
  next();
}
