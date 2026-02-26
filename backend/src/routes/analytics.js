import { Router }               from 'express';
import { AnalyticsController }  from '../controllers/AnalyticsController.js';
import { authenticateToken, authorizeRole } from '../middleware/authenticate.js';

export const analyticsRouter = Router();

analyticsRouter.use(authenticateToken);

analyticsRouter.get(
  '/',
  authorizeRole('admin', 'user'),
  AnalyticsController.dashboard
);
