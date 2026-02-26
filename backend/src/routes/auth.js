import { Router }            from 'express';
import { AuthController }    from '../controllers/AuthController.js';
import { loginRateLimiter }  from '../middleware/loginRateLimiter.js';

export const authRouter = Router();

authRouter.post('/login', loginRateLimiter, AuthController.login);
