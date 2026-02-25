/**
 * Pure validation utility functions.
 *
 * Called by ValidationEngine only — never by UI components directly.
 * All functions are stateless and side-effect-free.
 *
 * Phase 2 implements the function bodies.
 * Signatures are final.
 */
export const validators = {
  /** @param {string} value @returns {boolean} */
  isIndianMobile:   (value) => false,

  /** @param {string} value @returns {boolean} */
  isAadhaar:        (value) => false,

  /** @param {string} value @returns {boolean} */
  isEmail:          (value) => false,

  /** @param {string|number} value @returns {boolean} */
  isGraduationYear: (value) => false,

  /** @param {string|number} value @returns {boolean} */
  isScreeningScore: (value) => false,

  /** @param {string|number} value @returns {boolean} */
  isPercentage:     (value) => false,

  /** @param {string|number} value @returns {boolean} */
  isCgpa:           (value) => false,
};
