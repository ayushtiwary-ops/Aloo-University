import { Router }                    from 'express';
import { CandidateAuthController }   from '../controllers/CandidateAuthController.js';
import { loginRateLimiter }          from '../middleware/loginRateLimiter.js';

export const candidateAuthRouter = Router();

// POST /api/candidate/register
candidateAuthRouter.post('/register', CandidateAuthController.register);

// POST /api/candidate/login  (rate-limited)
candidateAuthRouter.post('/login', loginRateLimiter, CandidateAuthController.login);
