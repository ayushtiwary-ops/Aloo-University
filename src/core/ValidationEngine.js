/**
 * ValidationEngine
 *
 * Evaluates strict and system rules from rules.json against field values.
 * This module contains no rule data — all thresholds, allowed values, and
 * dependency conditions are read from the rule objects passed in.
 *
 * Design decisions:
 *
 * - Pure module (no singleton state, no imports from ConfigLoader).
 *   All rules are injected as parameters. This makes every function
 *   trivially testable with fixture data.
 *
 * - Only 'strict' and 'system' rules are evaluated. Soft rules are the
 *   responsibility of the SoftRuleEngine (phase 4).
 *
 * - validateField() returns the FIRST failure encountered. This prevents
 *   the UI from showing multiple errors on a single field simultaneously.
 *
 * - getDependentsOf() is the cascade contract: FormStateManager calls this
 *   after every setField() to find which other fields need re-evaluation.
 *   The dependency graph is entirely config-driven — no field names are
 *   hardcoded here.
 */

import {
  isMinLengthNoNumbers,
  isEmailFormat,
  isEmailUnique,
  isIndianMobile,
  isAadhaarFormat,
  isAllowedValue,
  isIntegerRange,
  isNumericRange,
} from '../utils/validators.js';

// ── Rule type filter ──────────────────────────────────────────────────────

const ENFORCED_RULE_TYPES = new Set(['strict', 'system']);

// ── Validator dispatch map ────────────────────────────────────────────────
//
// Each key is a validationType string from rules.json.
// Each value is (value, params, fullState) => { isValid: boolean, message: null }
// 'message: null' signals a passing result; failing results carry the rule's
// errorMessage (set by the caller, not the validator itself).

const VALIDATORS = {

  minLengthNoNumbers(value, params) {
    return isMinLengthNoNumbers(String(value ?? ''), params.minLength);
  },

  emailFormat(value) {
    return isEmailFormat(String(value ?? ''));
  },

  emailUniqueness(value, params) {
    return isEmailUnique(String(value ?? ''), params.registryKey);
  },

  indianMobile(value, params) {
    return isIndianMobile(value, params.digitCount, params.allowedPrefixes);
  },

  aadhaarFormat(value, params) {
    return isAadhaarFormat(value, params.digitCount);
  },

  allowedValue(value, params) {
    return isAllowedValue(value, params.allowedValues);
  },

  integerRange(value, params) {
    return isIntegerRange(value, params.min, params.max);
  },

  scoreByGradingMode(value, params, fullState) {
    const mode = fullState.gradingMode || 'percentage';
    const range = params[mode];
    if (!range) return false;
    // CGPA can be decimal; percentage can also be decimal
    return isNumericRange(value, range.min, range.max);
  },

  /**
   * System rule: this field value can only be set to certain values based
   * on the value of another (dependency) field.
   *
   * Logic: if value is "truthy" (the user has made a selection), check
   * whether the dependency field's current value permits it.
   * Empty / unset values are always allowed — the required-field check
   * is handled by the field's own strict rule.
   */
  dependsOnFieldValue(value, params, fullState) {
    // Only enforce when user has actively set the field
    if (value === '' || value === null || value === undefined) return true;
    // Only block the "positive" action (true = offer sent)
    if (value !== true && value !== 'true') return true;

    const dependsOnValue = fullState[params.dependsOn];
    return params.allowedWhen.includes(dependsOnValue);
  },

  /**
   * System rule: when THIS field's value is in the blockedValues list,
   * the whole form submission is blocked.
   *
   * The field value itself is semantically valid (e.g. 'rejected' is a
   * legitimate selection), but the business rule says it prevents submission.
   */
  blocksSubmissionWhenValue(value, params) {
    return !params.blockedValues.includes(value);
  },

  /**
   * System rule: when THIS field's value equals whenValue, the blockedField
   * must not equal blockedFieldValue.
   *
   * Evaluated on the SOURCE field (e.g. interviewStatus). Returns false only
   * when the combination is a compliance violation.
   */
  blocksFieldWhenValue(value, params, fullState) {
    if (value !== params.whenValue) return true;
    return fullState[params.blockedField] !== params.blockedFieldValue;
  },

  // Soft-only types — not evaluated here, return true to remain neutral
  ageRange:                  () => true,
  ageRangeExtended:          () => true,
  yearRange:                 () => true,
  recentGraduation:          () => true,
  minimumAcademicThreshold:  () => true,
  minimumScreeningThreshold: () => true,
};

// ── Public API ────────────────────────────────────────────────────────────

export const ValidationEngine = {

  /**
   * Evaluates all strict and system rules for a single field.
   * Returns the first failure found, or a passing result if all rules pass.
   *
   * @param {string}   fieldId     - Field identifier
   * @param {*}        value       - Current field value
   * @param {object}   fullState   - Complete form state (for cross-field rules)
   * @param {object[]} fieldRules  - All rule objects for this field (any ruleType)
   * @returns {{ isValid: boolean, message: string | null }}
   */
  validateField(fieldId, value, fullState, fieldRules) {
    const enforced = fieldRules.filter((r) => ENFORCED_RULE_TYPES.has(r.ruleType));

    for (const rule of enforced) {
      const handler = VALIDATORS[rule.validationType];
      if (!handler) continue;

      const passed = handler(value, rule.parameters ?? {}, fullState);
      if (!passed) {
        return { isValid: false, message: rule.errorMessage };
      }
    }

    return { isValid: true, message: null };
  },

  /**
   * Returns all field IDs that declare fieldId as one of their dependencies.
   * FormStateManager uses this to cascade re-validation after a field changes.
   *
   * @param {string}   fieldId   - The field that just changed
   * @param {object[]} allRules  - Complete rules array from ConfigLoader.getRules()
   * @returns {string[]}         - Unique list of dependent field IDs
   */
  getDependentsOf(fieldId, allRules) {
    const dependents = new Set();

    allRules.forEach((rule) => {
      if (
        Array.isArray(rule.dependencies) &&
        rule.dependencies.includes(fieldId) &&
        rule.field !== fieldId
      ) {
        dependents.add(rule.field);
      }
    });

    return [...dependents];
  },

  /**
   * Validates every field in the form state against its strict and system rules.
   * Returns false as soon as a single field fails — short-circuits on first failure.
   *
   * @param {object}   formState    - Complete form state values
   * @param {function} getRulesFn   - (fieldId: string) => rule[]
   * @returns {boolean}
   */
  isFormStrictlyValid(formState, getRulesFn) {
    for (const [fieldId, value] of Object.entries(formState)) {
      const rules = getRulesFn(fieldId);
      const result = this.validateField(fieldId, value, formState, rules);
      if (!result.isValid) return false;
    }
    return true;
  },

};
