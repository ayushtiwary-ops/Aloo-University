/**
 * FormStateManager
 *
 * Centralised, deterministic state container for the AdmitGuard form.
 *
 * Phase 3 additions:
 * - validateFn injection: FormStateManager is decoupled from ValidationEngine.
 *   Production wiring uses the real engine; tests inject a simple stub.
 *
 * - getDependentsFn injection: when a field changes, FormStateManager looks up
 *   which other fields need re-evaluation. The dependency graph is entirely
 *   config-driven — no field names are hardcoded here.
 *
 * - _fieldMeta stores { strictValid, strictErrorMessage } per field, separate
 *   from values. getState() still returns the flat value map (unchanged API).
 *
 * - getFieldMeta(fieldId) exposes per-field validation state as an immutable
 *   snapshot.
 *
 * - Subscriber signature upgraded to (values, meta). Existing subscribers that
 *   accept only one argument continue to work — extra args are silently ignored.
 *
 * - isSubmittable() returns true only when every field has strictValid === true.
 *   This requires validateAll() to have been called first (done from main.js
 *   after ConfigLoader.load() resolves).
 *
 * - validateAll() runs validateFn on every field with its current value and
 *   issues a single batch notification. Called once at startup to pre-validate
 *   fields that have non-null defaults (e.g. gradingMode = 'percentage').
 */

import { ValidationEngine } from '../core/ValidationEngine.js';
import { ConfigLoader } from '../core/ConfigLoader.js';

// ── Default injection functions ───────────────────────────────────────────

/** Used when no validateFn is provided (e.g. isolated tests). */
function _noopValidate() {
  return { isValid: null, message: null };
}

/** Used when no getDependentsFn is provided. */
function _noopGetDependents() {
  return [];
}

// ── Initial state schema ──────────────────────────────────────────────────

const INITIAL_VALUES = Object.freeze({
  fullName:         '',
  email:            '',
  phone:            '',
  dateOfBirth:      '',
  qualification:    '',
  graduationYear:   '',
  percentageOrCgpa: '',
  score:            '',
  interviewStatus:  '',
  aadhaar:          '',
  offerLetterSent:  '',
  gradingMode:      'percentage',
});

function _buildInitialMeta() {
  return Object.fromEntries(
    Object.keys(INITIAL_VALUES).map((key) => [
      key,
      { strictValid: null, strictErrorMessage: '' },
    ])
  );
}

// ── Factory ───────────────────────────────────────────────────────────────

/**
 * @param {{
 *   validateFn?:      (fieldId, value, fullState) => { isValid: boolean|null, message: string|null }
 *   getDependentsFn?: (fieldId) => string[]
 * }} options
 */
export function createFormStateManager(options = {}) {
  const validateFn      = options.validateFn      ?? _noopValidate;
  const getDependentsFn = options.getDependentsFn ?? _noopGetDependents;

  let _values = { ...INITIAL_VALUES };
  let _meta   = _buildInitialMeta();

  const _subscribers = new Set();

  // ── Internal helpers ───────────────────────────────────────────────────

  function _notify() {
    const valueSnapshot = { ..._values };
    const metaSnapshot  = Object.fromEntries(
      Object.entries(_meta).map(([k, m]) => [k, { ...m }])
    );
    _subscribers.forEach((cb) => cb(valueSnapshot, metaSnapshot));
  }

  /**
   * Runs validateFn for a single field and writes the result into _meta.
   * Does NOT notify subscribers — callers are responsible for notification.
   */
  function _validateAndStore(fieldId, value) {
    const result = validateFn(fieldId, value, { ..._values });
    _meta[fieldId] = {
      strictValid:        result.isValid,
      strictErrorMessage: result.message ?? '',
    };
  }

  // ── Public API ─────────────────────────────────────────────────────────

  return {
    /**
     * Returns a shallow copy of the current field values.
     * Unchanged from phase 1 — mutating the returned object has no effect.
     */
    getState() {
      return { ..._values };
    },

    /**
     * Returns an immutable snapshot of the validation meta for a single field.
     *
     * @param   {string} fieldId
     * @returns {{ strictValid: null|boolean, strictErrorMessage: string }}
     */
    getFieldMeta(fieldId) {
      return { ..._meta[fieldId] };
    },

    /**
     * Updates a field's value, runs validation, cascades to dependent fields,
     * and notifies all subscribers.
     *
     * Silently ignores writes to fields not in the schema.
     *
     * @param {string}          fieldId
     * @param {string|boolean}  value
     */
    setField(fieldId, value) {
      if (!Object.prototype.hasOwnProperty.call(INITIAL_VALUES, fieldId)) return;

      _values = { ..._values, [fieldId]: value };
      _validateAndStore(fieldId, value);

      // Cascade: re-validate any field that depends on this one
      const dependents = getDependentsFn(fieldId);
      dependents.forEach((depId) => {
        if (Object.prototype.hasOwnProperty.call(_values, depId)) {
          _validateAndStore(depId, _values[depId]);
        }
      });

      _notify();
    },

    /**
     * Validates every field with its current value in one pass.
     * Issues a single batch notification at the end.
     *
     * Call this once from main.js after ConfigLoader.load() resolves so that
     * fields with non-empty defaults (e.g. gradingMode = 'percentage') start
     * life with the correct strictValid state rather than null.
     */
    validateAll() {
      Object.entries(_values).forEach(([fieldId, value]) => {
        _validateAndStore(fieldId, value);
      });
      _notify();
    },

    /**
     * Resets all field values and validation meta to their initial state.
     * Notifies subscribers.
     */
    reset() {
      _values = { ...INITIAL_VALUES };
      _meta   = _buildInitialMeta();
      _notify();
    },

    /**
     * Returns true when every field has strictValid === true.
     * Returns false if any field is invalid (false) or not yet validated (null).
     */
    isSubmittable() {
      return Object.values(_meta).every((m) => m.strictValid === true);
    },

    /**
     * Registers a callback called after every state change.
     * Callback signature: (values: object, meta: object) => void
     * Returns an unsubscribe function.
     *
     * @param   {function} callback
     * @returns {function} Unsubscribe
     */
    subscribe(callback) {
      _subscribers.add(callback);
      return () => _subscribers.delete(callback);
    },
  };
}

// ── Application singleton ─────────────────────────────────────────────────
//
// Wires ValidationEngine and ConfigLoader into the production instance.
// UI components import this singleton directly.
// Tests use createFormStateManager() with stub functions.

export const FormStateManager = createFormStateManager({
  validateFn: (fieldId, value, fullState) =>
    ValidationEngine.validateField(
      fieldId,
      value,
      fullState,
      ConfigLoader.getRuleByField(fieldId)
    ),
  getDependentsFn: (fieldId) =>
    ValidationEngine.getDependentsOf(fieldId, ConfigLoader.getRules() ?? []),
});
