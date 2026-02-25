/**
 * ValidationEngine
 *
 * The sole authority for field-level compliance checks.
 *
 * Calling contract (final — phase 2 implements the body):
 *   ValidationEngine.validate(fieldId, value, rules)
 *   → { valid: null | boolean, message: string }
 *
 * Returning { valid: null } signals "not yet evaluated" — distinct
 * from { valid: false } which signals a rule violation. UI components
 * render the neutral indicator for null and the error state for false.
 *
 * How it plugs in (phase 2):
 *   1. Populate rules.json with field rule definitions.
 *   2. ValidationEngine.validate() evaluates rules[fieldId] against value.
 *   3. FormStateManager.setField() already calls this with the loaded rules.
 *   4. Zero changes required to UI components or FormStateManager.
 */
export const ValidationEngine = {
  /**
   * @param   {string}         fieldId
   * @param   {*}              value
   * @param   {object|null}    rules   - From ConfigLoader.getRules()
   * @returns {{ valid: null, message: string }}
   */
  validate(fieldId, value, rules) {
    // STUB — Phase 2 implementation replaces this body only.
    return { valid: null, message: '' };
  },
};
