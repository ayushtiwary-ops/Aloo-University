/**
 * Structured application error carrying an HTTP status code.
 * Thrown by services; caught by the global error handler middleware.
 */
export class ApiError extends Error {
  /**
   * @param {number} status  - HTTP status code
   * @param {string} message - Human-readable message (never contains secrets)
   */
  constructor(status, message) {
    super(message);
    this.name   = 'ApiError';
    this.status = status;
  }
}
