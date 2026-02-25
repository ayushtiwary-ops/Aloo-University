/**
 * AuditService
 *
 * Records significant system events for compliance traceability.
 * Phase 2 implements durable audit storage.
 */
export const AuditService = {
  /**
   * @param {string} event   - e.g. 'FORM_SUBMIT_ATTEMPTED'
   * @param {object} payload
   */
  record(event, payload = {}) {
    // STUB — Phase 2 implementation goes here.
    console.debug(`[AuditService] ${event}`, payload);
  },
};
