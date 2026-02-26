/**
 * Wraps an async route handler so unhandled promise rejections are
 * forwarded to Express's next(err) error pipeline automatically.
 *
 * @param {Function} fn - async (req, res, next) => void
 * @returns {Function}
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
