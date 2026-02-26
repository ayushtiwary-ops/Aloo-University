import { Router }          from 'express';
import { AuditController } from '../controllers/AuditController.js';
import { authenticateToken, authorizeRole, optionalAuth } from '../middleware/authenticate.js';
import { validateAuditBody, parsePagination }              from '../middleware/validate.js';

export const auditRouter = Router();

// POST /api/audit — public (no JWT required; submitted_by set if token present)
auditRouter.post('/', optionalAuth, validateAuditBody, AuditController.create);

// GET /api/audit/export — admin only (before /:id routes)
auditRouter.get('/export', authenticateToken, authorizeRole('admin'), AuditController.export);

// GET /api/audit — admin + counselor
auditRouter.get('/', authenticateToken, authorizeRole('admin', 'user'), parsePagination, AuditController.list);
