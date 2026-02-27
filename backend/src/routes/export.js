/**
 * Export routes
 *
 * POST /api/export/google-sheets
 *   Appends audit records to a Google Sheet.
 *   Protected: JWT required, admin role only.
 *
 * Request body (up to 1 MB):
 *   { records: AuditRecord[] }
 *
 * Response (200):
 *   { success: true, updatedRows: number }
 *
 * Error responses:
 *   400 – records array missing or invalid
 *   401 – no/invalid JWT token
 *   403 – insufficient role
 *   503 – Google Sheets env vars not configured
 *   502 – Google API call failed
 */

import express             from 'express';
import { Router }          from 'express';
import { appendRecordsToSheet } from '../services/GoogleSheetsService.js';
import { authenticateToken, authorizeRole } from '../middleware/authenticate.js';
import { asyncHandler }    from '../utils/asyncHandler.js';
import { ApiError }        from '../utils/ApiError.js';
import { logger }          from '../utils/logger.js';

export const exportRouter = Router();

// Scoped body parser: 1 MB limit for this route only.
// The global limit on other routes remains 64 kb.
const jsonBody1mb = express.json({ limit: '1mb' });

exportRouter.post(
  '/google-sheets',
  authenticateToken,
  authorizeRole('admin'),
  jsonBody1mb,
  asyncHandler(async (req, res) => {
    const { records } = req.body ?? {};

    if (!Array.isArray(records)) {
      throw new ApiError(400, '"records" must be an array of audit record objects.');
    }

    logger.info(
      { userId: req.user?.id, recordCount: records.length },
      'Google Sheets export initiated'
    );

    let result;
    try {
      result = await appendRecordsToSheet(records);
    } catch (err) {
      if (err.name === 'ApiError') throw err;
      logger.error({ err }, 'Google Sheets API call failed');
      throw new ApiError(502, 'Google Sheets export failed. Check server logs for details.');
    }

    logger.info(
      { userId: req.user?.id, updatedRows: result.updatedRows },
      'Google Sheets export completed'
    );

    res.json({ success: true, updatedRows: result.updatedRows });
  })
);
