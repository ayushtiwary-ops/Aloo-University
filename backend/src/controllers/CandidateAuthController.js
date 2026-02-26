import { CandidateAuthService } from '../services/CandidateAuthService.js';
import { asyncHandler }         from '../utils/asyncHandler.js';
import { ApiError }             from '../utils/ApiError.js';

export const CandidateAuthController = {

  register: asyncHandler(async (req, res) => {
    const { full_name, email, phone, password } = req.body;

    if (
      typeof full_name !== 'string' || !full_name.trim() ||
      typeof email    !== 'string' || !email.trim()     ||
      typeof phone    !== 'string' || !phone.trim()     ||
      typeof password !== 'string' || !password
    ) {
      throw new ApiError(400, 'full_name, email, phone, and password are required');
    }

    const result = await CandidateAuthService.register(full_name, email, phone, password);
    res.status(201).json(result);
  }),

  login: asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (typeof email !== 'string' || typeof password !== 'string') {
      throw new ApiError(400, 'email and password are required');
    }

    const result = await CandidateAuthService.login(email, password);
    res.json(result);
  }),
};
