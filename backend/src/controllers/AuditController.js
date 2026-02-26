import { AuditService, recordsToCsv } from '../services/AuditService.js';
import { asyncHandler }               from '../utils/asyncHandler.js';
import { ApiError }                   from '../utils/ApiError.js';

export const AuditController = {
  /**
   * POST /api/audit
   * Roles: user, admin, candidate
   */
  create: asyncHandler(async (req, res) => {
    const candidateId = req.user.role === 'candidate' ? req.user.id : null;
    const record = await AuditService.create(req.body, req.user.id, candidateId);
    res.status(201).json(record);
  }),

  /**
   * GET /api/audit?page=1&limit=20
   * Role: admin
   */
  list: asyncHandler(async (req, res) => {
    const result = await AuditService.list(req.pagination);
    res.json(result);
  }),

  /**
   * GET /api/audit/export?format=json|csv
   * Role: admin
   */
  export: asyncHandler(async (req, res) => {
    const format = req.query.format ?? 'json';

    if (format !== 'json' && format !== 'csv') {
      throw new ApiError(400, 'format must be "json" or "csv"');
    }

    const records = await AuditService.all();

    if (format === 'csv') {
      const timestamp = new Date().toISOString().slice(0, 10);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="admitguard-audit-${timestamp}.csv"`
      );
      return res.send(recordsToCsv(records));
    }

    const timestamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="admitguard-audit-${timestamp}.json"`
    );
    res.json(records);
  }),
};
