import { AuthService }  from '../services/AuthService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError }     from '../utils/ApiError.js';

export const AuthController = {
  /**
   * POST /api/auth/login
   * Body: { email, password }
   */
  login: asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (typeof email !== 'string' || typeof password !== 'string') {
      throw new ApiError(400, 'email and password are required');
    }

    const result = await AuthService.login(email, password);
    res.json(result);
  }),
};
