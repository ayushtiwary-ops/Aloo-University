/**
 * Display formatting utilities.
 * Phase 2 implements masking and formatting.
 * Signatures are final.
 */
export const formatters = {
  /** Returns last-4 masked Aadhaar: "XXXX XXXX 1234" @param {string} v */
  maskAadhaar: (v) => v,

  /** Returns spaced phone: "98765 43210" @param {string} v */
  formatPhone: (v) => v,
};
