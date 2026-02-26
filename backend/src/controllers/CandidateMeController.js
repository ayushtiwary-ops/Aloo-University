import { CandidateAuthService } from '../services/CandidateAuthService.js';
import { asyncHandler }         from '../utils/asyncHandler.js';

export const CandidateMeController = {

  /**
   * GET /api/candidate/me
   * Returns the authenticated candidate's own profile row.
   */
  getProfile: asyncHandler(async (req, res) => {
    const profile = await CandidateAuthService.getProfile(req.user.id);
    res.json(profile);
  }),

  /**
   * GET /api/candidate/me/application
   * Returns the candidate's most recent audit record, or null.
   */
  getApplication: asyncHandler(async (req, res) => {
    const application = await CandidateAuthService.getApplication(req.user.id);
    res.json(application ?? null);
  }),
};
