/**
 * FormStateManager
 *
 * Centralised, deterministic state container for the AdmitGuard form.
 *
 * Phase 3 additions:
 * - validateFn injection: decoupled from ValidationEngine for test isolation.
 * - getDependentsFn injection: config-driven cascade re-validation.
 * - _fieldMeta tracks { strictValid, strictErrorMessage } per field.
 * - getFieldMeta(fieldId) exposes per-field validation state as an immutable snapshot.
 * - Subscriber signature upgraded to (values, meta).
 * - isSubmittable() requires all fields strictValid === true.
 * - validateAll() pre-validates all fields at startup.
 *
 * Phase 4 additions:
 * - softValidateFn injection: evaluates soft rules; returns { isViolation, message, rule }.
 * - validateRationaleFn injection: validates exception rationale text against the
 *   violated soft rule's keywords and minimum length.
 * - Extended _meta shape per field adds:
 *     softValid, softViolation, exceptionRequested, rationale, rationaleValid,
 *     rationaleKeywords, rationaleMinLength
 * - Private _softViolatedRules map stores the live violated rule object per field
 *   (never exposed in snapshots) for setFieldException to access.
 * - setFieldException(fieldId, exceptionRequested, rationale) drives the override flow.
 * - isSubmittable() delegates to ValidationEngine.isFormEligibleForSubmission()
 *   which gates on both strict validity and soft exception completeness.
 * - isFlagged() returns true when the active exception count exceeds 2,
 *   triggering the managerial-review risk banner.
 */

import { ValidationEngine } from '../core/ValidationEngine.js';
import { ConfigLoader } from '../core/ConfigLoader.js';

// ── Default injection functions ───────────────────────────────────────────

function _noopValidate() {
  return { isValid: null, message: null };
}

function _noopGetDependents() {
  return [];
}

function _noopSoftValidate() {
  return { isViolation: false, message: null, rule: null };
}

function _noopValidateRationale() {
  return { isValid: false };
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
      {
        // Strict
        strictValid:        null,
        strictErrorMessage: '',
        // Soft
        softValid:          null,
        softViolation:      '',
        // Exception governance
        exceptionRequested: false,
        rationale:          '',
        rationaleValid:     false,
        // UI hints surfaced from the violated rule
        rationaleKeywords:  [],
        rationaleMinLength: 30,
      },
    ])
  );
}

// ── Factory ───────────────────────────────────────────────────────────────

/**
 * @param {{
 *   validateFn?:          (fieldId, value, fullState) => { isValid: boolean|null, message: string|null }
 *   softValidateFn?:      (fieldId, value, fullState) => { isViolation: boolean, message: string|null, rule: object|null }
 *   validateRationaleFn?: (rationale, rule) => { isValid: boolean }
 *   getDependentsFn?:     (fieldId) => string[]
 * }} options
 */
export function createFormStateManager(options = {}) {
  const validateFn          = options.validateFn          ?? _noopValidate;
  const softValidateFn      = options.softValidateFn      ?? _noopSoftValidate;
  const validateRationaleFn = options.validateRationaleFn ?? _noopValidateRationale;
  const getDependentsFn     = options.getDependentsFn     ?? _noopGetDependents;

  let _values = { ...INITIAL_VALUES };
  let _meta   = _buildInitialMeta();

  // Private: the current soft-rule object that caused a violation per field.
  // Never exposed in snapshots; used only by setFieldException.
  const _softViolatedRules = {};

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
   * Runs strict + soft validation for a single field and writes results into _meta.
   * Preserves existing exception state (exceptionRequested, rationale) when a soft
   * violation persists — re-validates the rationale against the new (possibly changed)
   * soft rule so mode changes (e.g. percentage → cgpa) stay consistent.
   *
   * Does NOT notify subscribers — callers are responsible for notification.
   */
  function _validateAndStore(fieldId, value) {
    // ── Strict ────────────────────────────────────────────────────────────
    const strictResult = validateFn(fieldId, value, { ..._values });

    // ── Soft ──────────────────────────────────────────────────────────────
    const softResult = softValidateFn(fieldId, value, { ..._values });

    // Compute softValid: null for empty/unset values so the UI shows no
    // indicator before the user has interacted with the field.
    const isEmpty = value === '' || value === null || value === undefined;
    const softValidValue = isEmpty
      ? null
      : softResult.isViolation ? false : true;

    // Store the current violating rule privately (or clear it)
    _softViolatedRules[fieldId] = softResult.isViolation ? softResult.rule : null;

    // ── Exception state (manual override — user must request + provide rationale) ─
    // When a soft violation fires, preserve any existing exception state the user
    // has already entered so that re-validation does not reset their input.
    const prevMeta = _meta[fieldId] ?? {};
    const existingViolation = prevMeta.softValid === false;
    // Carry forward exception state only if violation persists; reset when cleared
    const exceptionRequested = softResult.isViolation
      ? (prevMeta.exceptionRequested ?? false)
      : false;
    const rationale = softResult.isViolation
      ? (prevMeta.rationale ?? '')
      : '';
    const rationaleValid = exceptionRequested
      ? validateRationaleFn(rationale, softResult.rule).isValid
      : false;

    // ── UI hints surfaced from the violated soft rule ─────────────────────
    const rationaleKeywords  = softResult.rule?.rationaleKeywords ?? [];
    const rationaleMinLength = softResult.rule?.parameters?.rationaleMinLength ?? 30;

    _meta[fieldId] = {
      strictValid:        strictResult.isValid,
      strictErrorMessage: strictResult.message ?? '',
      softValid:          softValidValue,
      softViolation:      softResult.isViolation ? softResult.message : '',
      exceptionRequested,
      rationale,
      rationaleValid,
      rationaleKeywords,
      rationaleMinLength,
    };
  }

  // ── Public API ─────────────────────────────────────────────────────────

  return {
    /** Returns a shallow copy of the current field values. */
    getState() {
      return { ..._values };
    },

    /**
     * Returns an immutable snapshot of the full validation meta for a single field.
     *
     * @param   {string} fieldId
     * @returns {object}
     */
    getFieldMeta(fieldId) {
      return { ..._meta[fieldId] };
    },

    /**
     * Returns an immutable snapshot of the full meta map for all fields.
     * Used by SubmissionController to build the audit record.
     *
     * @returns {object}
     */
    getMeta() {
      return Object.fromEntries(
        Object.entries(_meta).map(([k, m]) => [k, { ...m }])
      );
    },

    /**
     * Updates a field's value, runs strict + soft validation, cascades to
     * dependent fields, and notifies all subscribers.
     *
     * Silently ignores writes to fields not in the schema.
     */
    setField(fieldId, value) {
      if (!Object.prototype.hasOwnProperty.call(INITIAL_VALUES, fieldId)) return;

      _values = { ..._values, [fieldId]: value };
      _validateAndStore(fieldId, value);

      const dependents = getDependentsFn(fieldId);
      dependents.forEach((depId) => {
        if (Object.prototype.hasOwnProperty.call(_values, depId)) {
          _validateAndStore(depId, _values[depId]);
        }
      });

      _notify();
    },

    /**
     * Records a user's exception request for a soft-violated field.
     *
     * If the field has no active soft violation the call is silently ignored —
     * this prevents phantom exception state accumulating on clean fields.
     *
     * @param {string}  fieldId            - Field identifier
     * @param {boolean} exceptionRequested - Whether the toggle is ON
     * @param {string}  rationale          - Current rationale textarea text
     */
    setFieldException(fieldId, exceptionRequested, rationale) {
      if (!Object.prototype.hasOwnProperty.call(_meta, fieldId)) return;
      if (_meta[fieldId].softValid !== false) return; // no active violation

      const rule         = _softViolatedRules[fieldId] ?? null;
      const rationaleValid = exceptionRequested
        ? validateRationaleFn(rationale, rule).isValid
        : false;

      _meta[fieldId] = {
        ..._meta[fieldId],
        exceptionRequested,
        rationale:   exceptionRequested ? rationale : '',
        rationaleValid,
      };

      _notify();
    },

    /**
     * Validates every field with its current value in one pass.
     * Issues a single batch notification at the end.
     *
     * Called once from main.js after ConfigLoader.load() so fields with
     * non-empty defaults (e.g. gradingMode = 'percentage') start life with
     * the correct strictValid state.
     */
    validateAll() {
      Object.entries(_values).forEach(([fieldId, value]) => {
        _validateAndStore(fieldId, value);
      });
      _notify();
    },

    /**
     * Resets all field values, validation meta, and soft-rule state to initial.
     * Notifies subscribers.
     */
    reset() {
      _values = { ...INITIAL_VALUES };
      _meta   = _buildInitialMeta();
      Object.keys(_softViolatedRules).forEach((k) => delete _softViolatedRules[k]);
      _notify();
    },

    /**
     * Returns true ONLY when every field is strictly valid AND every soft
     * violation has been properly overridden (exception requested + valid rationale).
     *
     * Delegates to ValidationEngine.isFormEligibleForSubmission() to keep
     * the eligibility logic in one place.
     */
    isSubmittable() {
      return ValidationEngine.isFormEligibleForSubmission(_meta);
    },

    /**
     * Returns true when the active valid-exception count exceeds 2.
     * Triggers the managerial-review risk banner in the UI.
     */
    isFlagged() {
      return ValidationEngine.computeExceptionCount(_meta) > 2;
    },

    /**
     * Registers a callback called after every state change.
     * Callback signature: (values: object, meta: object) => void
     * Returns an unsubscribe function.
     */
    subscribe(callback) {
      _subscribers.add(callback);
      return () => _subscribers.delete(callback);
    },
  };
}

// ── Application singleton ─────────────────────────────────────────────────
//
// Wires the real ValidationEngine, ConfigLoader, and rationale validator.
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

  softValidateFn: (fieldId, value, fullState) =>
    ValidationEngine.validateSoftRules(
      fieldId,
      value,
      fullState,
      ConfigLoader.getRuleByField(fieldId)
    ),

  validateRationaleFn: (rationale, rule) =>
    ValidationEngine.validateRationale(rationale, rule),

  getDependentsFn: (fieldId) =>
    ValidationEngine.getDependentsOf(fieldId, ConfigLoader.getRules() ?? []),
});
