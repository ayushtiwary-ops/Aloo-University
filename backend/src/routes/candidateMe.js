import { Router }                   from 'express';
import { CandidateMeController }    from '../controllers/CandidateMeController.js';
import { authenticateToken, authorizeRole } from '../middleware/authenticate.js';

export const candidateMeRouter = Router();

candidateMeRouter.use(authenticateToken);
candidateMeRouter.use(authorizeRole('candidate'));

// GET /api/candidate/me
candidateMeRouter.get('/', CandidateMeController.getProfile);

// GET /api/candidate/me/application
candidateMeRouter.get('/application', CandidateMeController.getApplication);
