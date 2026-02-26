import { Router }                          from 'express';
import { asyncHandler }                    from '../utils/asyncHandler.js';
import { authenticateToken, authorizeRole } from '../middleware/authenticate.js';
import { query }                           from '../db/pool.js';

export const candidatesRouter = Router();

candidatesRouter.use(authenticateToken);
candidatesRouter.use(authorizeRole('admin', 'user'));

/**
 * GET /api/candidates
 * Returns all candidates (without password_hash).
 * Allowed: admin, user (counselor)
 */
candidatesRouter.get('/', asyncHandler(async (_req, res) => {
  const { rows } = await query(
    `SELECT id, full_name, email, phone, created_at
       FROM candidates
      ORDER BY created_at DESC`,
    [],
  );
  res.json({ candidates: rows, total: rows.length });
}));
