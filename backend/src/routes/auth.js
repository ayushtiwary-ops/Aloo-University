import { Router }             from 'express';
import { AuthController }     from '../controllers/AuthController.js';
import { loginRateLimiter }   from '../middleware/loginRateLimiter.js';
import { authenticateToken }  from '../middleware/authenticate.js';

export const authRouter = Router();

authRouter.post('/login', loginRateLimiter, AuthController.login);

/** Validate session — returns the decoded user payload if the token is valid. */
authRouter.get('/me', authenticateToken, (req, res) => res.json({ user: req.user }));
