import { AnalyticsService } from '../services/AnalyticsService.js';
import { asyncHandler }     from '../utils/asyncHandler.js';

export const AnalyticsController = {
  /**
   * GET /api/analytics
   * Role: admin
   */
  dashboard: asyncHandler(async (_req, res) => {
    const metrics = await AnalyticsService.getDashboardMetrics();
    res.json(metrics);
  }),
};
