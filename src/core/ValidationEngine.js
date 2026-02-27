/**
 * ValidationEngine
 *
 * Evaluates strict and system rules from rules.json against field values.
 * This module contains no rule data — all thresholds, allowed values, and
 * dependency conditions are read from the rule objects passed in.
 *
 * Schema v2.0.0 — rules now use:
 *   rule.type              (was rule.ruleType)
 *   rule.validation.custom (was rule.validationType)
 *   rule.constraints       (was rule.parameters)
 *   rule.rationale         (was rule.rationaleKeywords + rule.parameters.rationaleMinLength)
 *
 * Design decisions:
 *
 * - Pure module (no singleton state, no imports from ConfigLoader).
 *   All rules are injected as parameters. This makes every function
 *   trivially testable with fixture data.
 *
 * - Only 'strict' and 'system' rules are evaluated by validateField().
 *   Soft rules are the responsibility of validateSoftRules().
 *
 * - validateField() returns the FIRST failure encountered. This prevents
 *   the UI from showing multiple errors on a single field simultaneously.
 *
 * - getDependentsOf() is the cascade contract: FormStateManager calls this
 *   after every setField() to find which other fields need re-evaluation.
 *   Dependencies are declared inside rule.validation.dependencies (array).
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
  isAgeInRange,
  isGraduationYearRecent,
  isAboveMinimumAcademic,
  isAboveMinimumScore,
  isValidRationale,
} from '../utils/validators.js';

// ── Rule type filter ──────────────────────────────────────────────────────

const ENFORCED_RULE_TYPES = new Set(['strict', 'system']);

// ── Validator dispatch map ────────────────────────────────────────────────
//
// Each key is a validation.custom string from rules.json.
// Each value is (value, constraints, fullState) => boolean
// true = passes validation; false = fails.

const VALIDATORS = {

  // ── String / identity validators ──────────────────────────────────────

  minLengthNoNumbers(value, constraints) {
    return isMinLengthNoNumbers(String(value ?? ''), constraints.minLength);
  },

  /** v2 name: isEmail (was emailFormat) */
  isEmail(value) {
    return isEmailFormat(String(value ?? ''));
  },

  /** Backward-compat alias */
  emailFormat(value) {
    return isEmailFormat(String(value ?? ''));
  },

  emailUniqueness(value, constraints) {
    return isEmailUnique(String(value ?? ''), constraints.registryKey);
  },

  /** v2 name: isIndianPhone (was indianMobile) */
  isIndianPhone(value, constraints) {
    return isIndianMobile(value, constraints.digitCount, constraints.allowedPrefixes);
  },

  /** Backward-compat alias */
  indianMobile(value, constraints) {
    return isIndianMobile(value, constraints.digitCount, constraints.allowedPrefixes);
  },

  /** v2 name: isAadhaar (was aadhaarFormat) */
  isAadhaar(value, constraints) {
    return isAadhaarFormat(value, constraints.digitCount);
  },

  /** Backward-compat alias */
  aadhaarFormat(value, constraints) {
    return isAadhaarFormat(value, constraints.digitCount);
  },

  allowedValue(value, constraints) {
    return isAllowedValue(value, constraints.allowedValues);
  },

  integerRange(value, constraints) {
    return isIntegerRange(value, constraints.min, constraints.max);
  },

  scoreByGradingMode(value, constraints, fullState) {
    const mode = fullState.gradingMode || 'percentage';
    const range = constraints[mode];
    if (!range) return false;
    return isNumericRange(value, range.min, range.max);
  },

  // ── System / cross-field validators ──────────────────────────────────

  /**
   * v2 name: interviewOfferDependency (was dependsOnFieldValue)
   * Field value can only be set to "true" when the dependency field
   * has one of the allowed values.
   */
  interviewOfferDependency(value, constraints, fullState) {
    if (value === '' || value === null || value === undefined) return true;
    if (value !== true && value !== 'true') return true;
    const dependsOnValue = fullState[constraints.dependsOn];
    return constraints.allowedWhen.includes(dependsOnValue);
  },

  /** Backward-compat alias */
  dependsOnFieldValue(value, constraints, fullState) {
    if (value === '' || value === null || value === undefined) return true;
    if (value !== true && value !== 'true') return true;
    const dependsOnValue = fullState[constraints.dependsOn];
    return constraints.allowedWhen.includes(dependsOnValue);
  },

  /**
   * When THIS field's value is in the blockedValues list,
   * the whole form submission is blocked.
   */
  blocksSubmissionWhenValue(value, constraints) {
    return !constraints.blockedValues.includes(value);
  },

  /**
   * When THIS field's value equals whenValue, the blockedField
   * must not equal blockedFieldValue.
   */
  blocksFieldWhenValue(value, constraints, fullState) {
    if (value !== constraints.whenValue) return true;
    return fullState[constraints.blockedField] !== constraints.blockedFieldValue;
  },

  // ── Strict range validators ───────────────────────────────────────────

  ageRange(value, constraints) {
    return isAgeInRange(value, constraints.minAge, constraints.maxAge);
  },

  yearRange(value, constraints) {
    const maxYear = constraints.maxYear ?? new Date().getFullYear();
    return isIntegerRange(value, constraints.minYear, maxYear);
  },

  // ── Soft-only types — return true to stay neutral in strict pass ──────
  ageBetween:                () => true,
  ageRangeExtended:          () => true,
  recentGraduation:          () => true,
  minimumAcademicThreshold:  () => true,
  minimumScreeningThreshold: () => true,
  percentageOrCgpaThreshold: () => true,
};

// ── Soft validator dispatch map ───────────────────────────────────────────
//
// Keyed by validation.custom (soft rules only).
// Returns true when the VIOLATION CONDITION is present,
// false when the value is acceptable or empty.

const SOFT_VALIDATORS = {

  /**
   * v2 name: ageBetween — violation when age is OUTSIDE [min, max].
   * Used for dateOfBirth soft rule (e.g. must be 18–35).
   */
  ageBetween(value, constraints) {
    if (!value) return false;
    return !isAgeInRange(value, constraints.min, constraints.max);
  },

  /**
   * Legacy: ageRange (soft) — same semantics as ageBetween.
   * Kept for backward compat with old-format test fixtures.
   */
  ageRange(value, constraints) {
    if (!value) return false;
    return !isAgeInRange(value, constraints.minAge, constraints.maxAge);
  },

  /**
   * ageRangeExtended — violation when age IS in the extended amber zone.
   * Legacy validator; kept for test fixtures.
   */
  ageRangeExtended(value, constraints) {
    return isAgeInRange(value, constraints.minAge, constraints.maxAge);
  },

  /**
   * yearRange — violation when graduation year is OUTSIDE [minYear, maxYear].
   */
  yearRange(value, constraints) {
    if (value === '' || value === null || value === undefined) return false;
    const maxYear = constraints.maxYear ?? new Date().getFullYear();
    return !isIntegerRange(value, constraints.minYear, maxYear);
  },

  /**
   * recentGraduation — violation when year is within recentYearsThreshold
   * of the current calendar year.
   */
  recentGraduation(value, constraints) {
    return isGraduationYearRecent(value, constraints.recentYearsThreshold ?? 0);
  },

  /**
   * minimumAcademicThreshold (legacy name) — violation when academic score
   * is BELOW the minimum threshold for the active grading mode.
   */
  minimumAcademicThreshold(value, constraints, fullState) {
    if (value === '' || value === null || value === undefined) return false;
    const passes = isAboveMinimumAcademic(
      value,
      fullState.gradingMode || 'percentage',
      constraints.percentageMinimum,
      constraints.cgpaMinimum,
    );
    return !passes;
  },

  /**
   * v2 name: percentageOrCgpaThreshold — same as minimumAcademicThreshold.
   */
  percentageOrCgpaThreshold(value, constraints, fullState) {
    if (value === '' || value === null || value === undefined) return false;
    const passes = isAboveMinimumAcademic(
      value,
      fullState.gradingMode || 'percentage',
      constraints.percentageMinimum,
      constraints.cgpaMinimum,
    );
    return !passes;
  },

  /**
   * minimumScreeningThreshold — violation when screening score is below
   * the minimum passing score.
   */
  minimumScreeningThreshold(value, constraints) {
    if (value === '' || value === null || value === undefined) return false;
    return !isAboveMinimumScore(value, constraints.minimumPassingScore);
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Reads the validator key from a rule, supporting both schema versions.
 * v2: rule.validation.custom
 * v1 fallback: rule.validationType
 */
function _getValidatorKey(rule) {
  return rule.validation?.custom ?? rule.validationType;
}

/**
 * Reads the constraints object from a rule, supporting both schema versions.
 * v2: rule.constraints
 * v1 fallback: rule.parameters
 */
function _getConstraints(rule) {
  return rule.constraints ?? rule.parameters ?? {};
}

/**
 * Reads the rule type, supporting both schema versions.
 * v2: rule.type
 * v1 fallback: rule.ruleType
 */
function _getRuleType(rule) {
  return rule.type ?? rule.ruleType;
}

/**
 * Reads the dependencies array from a rule, supporting both schema versions.
 * v2: rule.validation.dependencies
 * v1 fallback: rule.dependencies (top-level)
 */
function _getDependencies(rule) {
  return rule.validation?.dependencies ?? rule.dependencies ?? [];
}

// ── Public API ────────────────────────────────────────────────────────────

export const ValidationEngine = {

  /**
   * Evaluates all strict and system rules for a single field.
   * Returns the first failure found, or a passing result if all rules pass.
   *
   * @param {string}   fieldId     - Field identifier
   * @param {*}        value       - Current field value
   * @param {object}   fullState   - Complete form state (for cross-field rules)
   * @param {object[]} fieldRules  - All rule objects for this field (any type)
   * @returns {{ isValid: boolean, message: string | null }}
   */
  validateField(fieldId, value, fullState, fieldRules) {
    const enforced = fieldRules.filter(
      (r) => ENFORCED_RULE_TYPES.has(_getRuleType(r))
    );

    for (const rule of enforced) {
      const key     = _getValidatorKey(rule);
      const handler = VALIDATORS[key];
      if (!handler) continue;

      const passed = handler(value, _getConstraints(rule), fullState);
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
      const deps = _getDependencies(rule);
      if (Array.isArray(deps) && deps.includes(fieldId) && rule.field !== fieldId) {
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

  // ── Soft-rule methods ──────────────────────────────────────────────────

  /**
   * Evaluates a SINGLE soft rule against a field value.
   *
   * @param {*}        value      - Current field value
   * @param {object}   fullState  - Complete form state (for cross-field rules)
   * @param {object}   rule       - A single soft rule object from rules.json
   * @returns {{ isViolation: boolean, message: string | null }}
   */
  evaluateSoftRule(value, fullState, rule) {
    const key     = _getValidatorKey(rule);
    const handler = SOFT_VALIDATORS[key];
    if (!handler) return { isViolation: false, message: null };

    const violated = handler(value, _getConstraints(rule), fullState);
    return {
      isViolation: violated,
      message: violated ? rule.errorMessage : null,
    };
  },

  /**
   * Evaluates all soft rules for a field and returns the FIRST violation found.
   * Strict and system rules in the array are silently ignored.
   *
   * @param {string}   fieldId    - Field identifier (informational only)
   * @param {*}        value      - Current field value
   * @param {object}   fullState  - Complete form state
   * @param {object[]} fieldRules - All rules for this field
   * @returns {{ isViolation: boolean, message: string | null, rule: object | null }}
   */
  validateSoftRules(fieldId, value, fullState, fieldRules) {
    const softRules = fieldRules.filter((r) => _getRuleType(r) === 'soft');

    for (const rule of softRules) {
      const result = this.evaluateSoftRule(value, fullState, rule);
      if (result.isViolation) {
        return { isViolation: true, message: result.message, rule };
      }
    }

    return { isViolation: false, message: null, rule: null };
  },

  /**
   * Validates a rationale string against the rule that triggered the soft violation.
   * The rule supplies rationale.minLength and rationale.keywords (v2 schema),
   * with fallback to legacy parameters.rationaleMinLength and rationaleKeywords.
   *
   * @param {string}       rationale - User-entered rationale text
   * @param {object | null} rule     - The violated soft rule object
   * @returns {{ isValid: boolean }}
   */
  validateRationale(rationale, rule) {
    if (!rule) return { isValid: false };
    // v2 schema: rule.rationale.minLength / rule.rationale.keywords
    // v1 fallback: rule.parameters.rationaleMinLength / rule.rationaleKeywords
    const minLength = rule.rationale?.minLength ?? rule.parameters?.rationaleMinLength ?? 30;
    const keywords  = rule.rationale?.keywords  ?? rule.rationaleKeywords ?? [];
    return { isValid: isValidRationale(rationale, minLength, keywords) };
  },

  /**
   * Counts the number of fields that have an active, VALID exception:
   *   - softValid === false  (there IS a soft violation)
   *   - exceptionRequested === true
   *   - rationaleValid === true
   *
   * @param {object} metaMap - The full per-field meta map from FormStateManager
   * @returns {number}
   */
  computeExceptionCount(metaMap) {
    return Object.values(metaMap).filter(
      (m) => m.softValid === false && m.exceptionRequested && m.rationaleValid
    ).length;
  },

  /**
   * Returns true when the form is eligible for submission:
   *   - Every field has strictValid === true  (no hard blocks)
   *   - Every field with a soft violation has been properly overridden
   *
   * @param {object} metaMap - The full per-field meta map from FormStateManager
   * @returns {boolean}
   */
  isFormEligibleForSubmission(metaMap) {
    for (const m of Object.values(metaMap)) {
      if (m.strictValid !== true) return false;
      if (m.softValid === false) {
        if (!m.exceptionRequested || !m.rationaleValid) return false;
      }
    }
    return true;
  },

  /**
   * Computes the eligibility status of a submitted application from its meta map.
   *
   * "Blocked"        — one or more fields have strictValid === false
   * "Flagged"        — all strict fields pass but active exception count exceeds 2
   * "With Exceptions" — 1–2 active valid exceptions, no strict failures
   * "Clean"          — all strict valid, no soft violations
   *
   * @param {object} metaMap - The full per-field meta map
   * @returns {"Clean" | "With Exceptions" | "Flagged" | "Blocked"}
   */
  computeEligibilityStatus(metaMap) {
    for (const m of Object.values(metaMap)) {
      if (m.strictValid === false) return 'Blocked';
    }

    const exceptionCount = this.computeExceptionCount(metaMap);
    if (exceptionCount > 2) return 'Flagged';
    if (exceptionCount > 0) return 'With Exceptions';
    return 'Clean';
  },

};
