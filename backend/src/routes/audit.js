import { Router }          from 'express';
import { AuditController } from '../controllers/AuditController.js';
import { authenticateToken, authorizeRole } from '../middleware/authenticate.js';
import { validateAuditBody, parsePagination } from '../middleware/validate.js';

export const auditRouter = Router();

// All audit routes require authentication
auditRouter.use(authenticateToken);

// POST /api/audit — user or admin
auditRouter.post(
  '/',
  authorizeRole('user', 'admin', 'candidate'),
  validateAuditBody,
  AuditController.create
);

// GET /api/audit/export — must come before /:id-style routes
auditRouter.get(
  '/export',
  authorizeRole('admin'),
  AuditController.export
);

// GET /api/audit?page&limit — admin only
auditRouter.get(
  '/',
  authorizeRole('admin'),
  parsePagination,
  AuditController.list
);
